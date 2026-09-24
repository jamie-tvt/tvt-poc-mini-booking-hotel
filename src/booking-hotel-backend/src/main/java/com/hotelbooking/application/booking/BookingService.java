package com.hotelbooking.application.booking;

import com.hotelbooking.application.audit.AuditService;
import com.hotelbooking.application.common.Codes;
import com.hotelbooking.application.hotel.StayQuery;
import com.hotelbooking.application.inventory.InventoryService;
import com.hotelbooking.application.notification.NotificationService;
import com.hotelbooking.application.systemsetting.SettingService;
import com.hotelbooking.domain.booking.Booking;
import com.hotelbooking.domain.booking.BookingRef;
import com.hotelbooking.domain.booking.BookingStatus;
import com.hotelbooking.domain.common.BusinessDay;
import com.hotelbooking.domain.common.BusinessException;
import com.hotelbooking.domain.common.TimeProvider;
import com.hotelbooking.domain.hotel.RoomType;
import com.hotelbooking.domain.inventory.Pricing;
import com.hotelbooking.domain.inventory.RoomInventory;
import com.hotelbooking.domain.payment.Invoice;
import com.hotelbooking.infrastructure.persistence.jpa.JpaBookingRepository;
import com.hotelbooking.infrastructure.persistence.jpa.JpaInvoiceRepository;
import com.hotelbooking.infrastructure.persistence.jpa.JpaRoomTypeRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/** Đặt phòng phía khách (guest checkout BR-BK-01) + huỷ/hết hạn. */
@Service
public class BookingService {
    private static final Logger log = LoggerFactory.getLogger(BookingService.class);

    public record CreateBooking(Long roomTypeId, LocalDate checkIn, LocalDate checkOut, int roomsCount, int guests, Booking.Guest guest) {}
    /** Booking + các đêm tồn kho đã khoá, theo đúng thứ tự khoá. */
    public record Locked(Booking booking, List<RoomInventory> nights) {}

    private final JpaBookingRepository bookings;
    private final JpaRoomTypeRepository roomTypes;
    private final JpaInvoiceRepository invoices;
    private final InventoryService inventory;
    private final BookingLifecycle lifecycle;
    private final SettingService settings;
    private final NotificationService notifications;
    private final AuditService audit;
    private final TimeProvider time;
    private final TransactionTemplate tx;

    public BookingService(JpaBookingRepository bookings, JpaRoomTypeRepository roomTypes, JpaInvoiceRepository invoices,
                          InventoryService inventory, BookingLifecycle lifecycle, SettingService settings, NotificationService notifications,
                          AuditService audit, TimeProvider time, PlatformTransactionManager txManager) {
        this.bookings = bookings;
        this.roomTypes = roomTypes;
        this.invoices = invoices;
        this.inventory = inventory;
        this.lifecycle = lifecycle;
        this.settings = settings;
        this.notifications = notifications;
        this.audit = audit;
        this.time = time;
        this.tx = new TransactionTemplate(txManager);
    }

    /**
     * Đặt phòng. Hai bước, hai giao dịch:
     * (1) ensureNights: INSERT IGNORE các đêm còn thiếu (giao dịch ngắn riêng);
     * (2) khoá mọi đêm [checkIn, checkOut) FOR UPDATE theo ngày tăng dần, kiểm từng đêm total − booked ≥ roomsCount,
     *     tăng booked_rooms, tạo booking PENDING + hoá đơn. Thiếu 1 đêm → 409 ROOM_UNAVAILABLE, không đêm nào bị giữ.
     */
    public Booking create(CreateBooking c, Long userId) {
        StayQuery.validateDates(c.checkIn(), c.checkOut(), BusinessDay.today(time));
        if (c.roomsCount() < 1 || c.roomsCount() > StayQuery.MAX_ROOMS) throw BusinessException.badRequest("Số phòng từ 1 đến " + StayQuery.MAX_ROOMS);
        RoomType snapshot = roomTypes.findById(c.roomTypeId()).filter(RoomType::isActive)
                .orElseThrow(() -> BusinessException.notFound("loại phòng"));
        checkBookable(snapshot, c);
        inventory.ensureNights(c.roomTypeId(), c.checkIn(), c.checkOut());
        return tx.execute(s -> createLocked(c, userId));
    }

    private static void checkBookable(RoomType t, CreateBooking c) {
        if (!t.getHotel().isPublic()) throw BusinessException.rule("Khách sạn hiện không nhận đặt phòng");
        if (!t.fits(c.guests(), c.roomsCount())) {
            throw BusinessException.rule("Loại phòng này chứa tối đa " + t.getCapacity() * c.roomsCount() + " khách cho " + c.roomsCount() + " phòng");
        }
    }

    private Booking createLocked(CreateBooking c, Long userId) {
        Instant now = time.now();
        List<RoomInventory> nights = inventory.lockNights(c.roomTypeId(), c.checkIn(), c.checkOut());
        RoomType t = roomTypes.findById(c.roomTypeId()).orElseThrow();
        checkBookable(t, c);
        int fee = settings.feePercent();
        List<Pricing.Night> priced = nights.stream().map(n -> Pricing.night(n.getStayDate(), n.basePrice(t.getBasePrice()), fee)).toList();
        for (RoomInventory n : nights) n.reserve(c.roomsCount());
        Pricing.Quote quote = Pricing.quote(priced, c.roomsCount());

        String code;
        do { code = Codes.random("HB-", 6); } while (bookings.existsByBookingCode(code));
        String key;
        do { key = Codes.accessKey(); } while (bookings.existsByAccessKey(key));
        Booking b = bookings.save(new Booking(code, key, userId, t, c.checkIn(), c.checkOut(), c.guests(), c.guest(), quote, now,
                now.plus(settings.paymentTimeout())));
        invoices.save(new Invoice(b, "INV-" + code.substring(3), now));
        lifecycle.notifyGuest(b, "Đã giữ phòng " + code,
                "Vui lòng thanh toán " + BookingLifecycle.vnd(b.getTotalAmount()) + " trước khi hết thời gian giữ phòng.");
        audit.log(userId, "CREATE", "booking", b.getId(), code + " " + t.getName() + " x" + c.roomsCount() + " " + c.checkIn() + "→" + c.checkOut());
        return b;
    }

    // ------------------------------------------------------------ truy cập phía khách (code + key)
    @Transactional(readOnly = true)
    public Booking getByCode(String code, String key, Long viewerId) {
        BookingRef ref = accessible(code, key, viewerId);
        return bookings.findById(ref.id()).orElseThrow();
    }

    /** FR-BK-005: tra cứu bằng mã + email đặt phòng. Sai bất kỳ → 404 như nhau (không lộ mã nào tồn tại). */
    @Transactional(readOnly = true)
    public Booking lookup(String code, String email) {
        BookingRef ref = bookings.findRefByCode(code == null ? "" : code.trim().toUpperCase())
                .filter(r -> email != null && r.guestEmail().equalsIgnoreCase(email.trim()))
                .orElseThrow(() -> BusinessException.notFound("đơn đặt phòng"));
        return bookings.findById(ref.id()).orElseThrow();
    }

    @Transactional(readOnly = true)
    public Page<Booking> mine(Long userId, BookingStatus status, Pageable pageable) { return bookings.findMine(userId, status, pageable); }

    @Transactional(readOnly = true)
    public Page<Booking> adminSearch(BookingStatus status, Long hotelId, String keyword, Pageable pageable) {
        return bookings.adminSearch(status, hotelId, keyword == null || keyword.isBlank() ? null : keyword.trim(), pageable);
    }

    @Transactional(readOnly = true)
    public Booking adminGet(Long id) { return bookings.findById(id).orElseThrow(() -> BusinessException.notFound("đơn đặt phòng")); }

    BookingRef accessible(String code, String key, Long viewerId) {
        return bookings.findRefByCode(code == null ? "" : code.trim().toUpperCase())
                .filter(r -> r.accessibleBy(key, viewerId))
                .orElseThrow(() -> BusinessException.notFound("đơn đặt phòng"));
    }

    /**
     * BR-CN-01. PENDING: huỷ miễn phí. CONFIRMED: tới hết ngày nhận phòng; hoàn theo chính sách đã chụp lúc đặt.
     */
    @Transactional
    public Booking cancelByGuest(String code, String key, Long viewerId, String reason) {
        BookingRef ref = accessible(code, key, viewerId);
        LocalDate today = BusinessDay.today(time);
        Locked l = lockForChange(ref);
        Booking b = l.booking();
        int percent = 0;
        if (b.getStatus() == BookingStatus.CONFIRMED) {
            if (today.isAfter(b.getCheckIn())) throw BusinessException.rule("Đã qua ngày nhận phòng nên không thể huỷ");
            percent = b.refundPercent(today);
        }
        long refunded = lifecycle.cancel(b, l.nights(), reason == null || reason.isBlank() ? "Khách huỷ" : reason.trim(), percent, time.now());
        audit.log(viewerId, "CANCEL", "booking", b.getId(), "hoàn " + percent + "% = " + refunded);
        return b;
    }

    /** Khoá theo thứ tự inventory (các đêm của booking) → booking. Ref là projection nên booking được nạp lần đầu bằng FOR UPDATE. */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    public Locked lockForChange(BookingRef ref) {
        List<RoomInventory> nights = inventory.lockNights(ref.roomTypeId(), ref.checkIn(), ref.checkOut());
        Booking b = bookings.findByIdForUpdate(ref.id()).orElseThrow();
        return new Locked(b, nights);
    }

    // ------------------------------------------------------------ hết hạn
    public List<Long> overdueIds() { return bookings.findOverdueIds(time.now()); }

    /** Một booking một giao dịch: lỗi ở đơn này không chặn các đơn khác. */
    @Transactional
    public boolean expireOne(Long id) {
        Instant now = time.now();
        BookingRef ref = bookings.findRef(id).orElseThrow();
        Locked l = lockForChange(ref);
        Booking b = l.booking();
        if (!b.isPaymentOverdue(now)) return false;       // đã được thanh toán/huỷ trong lúc chờ khoá
        lifecycle.expire(b, l.nights(), now);
        audit.log(null, "EXPIRE", "booking", id, b.getBookingCode());
        log.info("Booking {} hết hạn thanh toán, trả {} phòng × {} đêm", b.getBookingCode(), b.getRoomsCount(), b.getNights());
        return true;
    }
}
