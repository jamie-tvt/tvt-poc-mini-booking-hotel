package com.hotelbooking.application.booking;

import com.hotelbooking.application.audit.AuditService;
import com.hotelbooking.application.hotel.HotelScope;
import com.hotelbooking.application.inventory.InventoryService;
import com.hotelbooking.application.notification.NotificationService;
import com.hotelbooking.domain.booking.Booking;
import com.hotelbooking.domain.booking.BookingRef;
import com.hotelbooking.domain.booking.BookingStatus;
import com.hotelbooking.domain.common.BusinessDay;
import com.hotelbooking.domain.common.BusinessException;
import com.hotelbooking.domain.common.TimeProvider;
import com.hotelbooking.domain.hotel.Room;
import com.hotelbooking.domain.inventory.RoomInventory;
import com.hotelbooking.domain.payout.Payout;
import com.hotelbooking.infrastructure.persistence.jpa.JpaBookingRepository;
import com.hotelbooking.infrastructure.persistence.jpa.JpaPayoutRepository;
import com.hotelbooking.infrastructure.persistence.jpa.JpaRoomInventoryRepository;
import com.hotelbooking.infrastructure.persistence.jpa.JpaRoomRepository;
import com.hotelbooking.infrastructure.security.AuthUser;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Lễ tân (Owner/Staff trong phạm vi): danh sách đơn, check-in, check-out, no-show (FR-BK-006/007). */
@Service
public class FrontDeskService {
    private final HotelScope scope;
    private final JpaBookingRepository bookings;
    private final JpaRoomRepository rooms;
    private final JpaRoomInventoryRepository inventory;
    private final JpaPayoutRepository payouts;
    private final BookingLifecycle lifecycle;
    private final NotificationService notifications;
    private final AuditService audit;
    private final TimeProvider time;

    public FrontDeskService(HotelScope scope, JpaBookingRepository bookings, JpaRoomRepository rooms, JpaRoomInventoryRepository inventory,
                            JpaPayoutRepository payouts, BookingLifecycle lifecycle, NotificationService notifications,
                            AuditService audit, TimeProvider time) {
        this.scope = scope;
        this.bookings = bookings;
        this.rooms = rooms;
        this.inventory = inventory;
        this.payouts = payouts;
        this.lifecycle = lifecycle;
        this.notifications = notifications;
        this.audit = audit;
        this.time = time;
    }

    @Transactional(readOnly = true)
    public Page<Booking> search(AuthUser me, Long hotelId, BookingStatus status, LocalDate date, String keyword, Pageable pageable) {
        List<Long> ids = hotelId == null ? scope.hotelIds(me) : List.of(scope.hotel(me, hotelId).getId());
        if (ids.isEmpty()) return Page.empty(pageable);
        return bookings.portalSearch(ids, status, date, keyword == null || keyword.isBlank() ? null : keyword.trim(), pageable);
    }

    @Transactional(readOnly = true)
    public Booking get(AuthUser me, Long id) {
        return bookings.findById(scope.booking(me, id).id()).orElseThrow();
    }

    /**
     * Check-in: khoá phòng (room) → booking. Phòng phải đúng loại, đang hoạt động, không thuộc booking CHECKED_IN khác.
     * Chỉ từ ngày nhận phòng theo giờ VN.
     */
    @Transactional
    public Booking checkIn(AuthUser me, Long bookingId, List<Long> roomIds) {
        BookingRef ref = scope.booking(me, bookingId);
        Set<Long> ids = new LinkedHashSet<>(roomIds == null ? List.of() : roomIds);
        if (ids.isEmpty()) throw BusinessException.badRequest("Vui lòng chọn phòng");
        List<Room> locked = rooms.lockAll(ids);
        if (locked.size() != ids.size() || locked.stream().anyMatch(r -> !r.getHotelId().equals(ref.hotelId()))) {
            throw BusinessException.notFound("phòng");
        }
        Booking b = bookings.findByIdForUpdate(ref.id()).orElseThrow();
        List<Long> busy = rooms.occupiedAmong(ids);
        if (!busy.isEmpty()) {
            String numbers = locked.stream().filter(r -> busy.contains(r.getId())).map(Room::getRoomNumber).reduce((a, x) -> a + ", " + x).orElse("");
            throw BusinessException.conflict("Phòng " + numbers + " đang có khách");
        }
        b.checkIn(locked, BusinessDay.today(time), time.now());
        audit.log(me.id(), "CHECK_IN", "booking", b.getId(), b.getBookingCode() + " phòng " + roomNumbers(b));
        return b;
    }

    /**
     * Check-out → CHECKED_OUT, sinh payout = baseAmount, mời đánh giá. Trả phòng sớm: trả lại tồn kho các đêm
     * từ hôm nay (không hoàn tiền). Khoá: inventory → booking.
     */
    @Transactional
    public Booking checkOut(AuthUser me, Long bookingId) {
        BookingRef ref = scope.booking(me, bookingId);
        LocalDate today = BusinessDay.today(time);
        Instant now = time.now();
        List<RoomInventory> remaining = today.isBefore(ref.checkOut())
                ? inventory.lockRange(ref.roomTypeId(), today.isAfter(ref.checkIn()) ? today : ref.checkIn().plusDays(1), ref.checkOut())
                : List.of();
        Booking b = bookings.findByIdForUpdate(ref.id()).orElseThrow();
        b.checkOut(now);
        InventoryService.release(remaining, b.getRoomsCount(), today);
        if (!payouts.existsByBookingId(b.getId())) payouts.save(new Payout(b, now));
        lifecycle.notifyGuest(b, "Cảm ơn bạn đã lưu trú tại " + b.getHotel().getName(),
                "Hãy để lại đánh giá cho kỳ nghỉ (đơn " + b.getBookingCode() + ") để giúp khách sau chọn phòng nhé.");
        notifications.notify(b.getHotel().getOwnerId(), b.getId(), "Khách trả phòng " + b.getBookingCode(),
                "Khoản thanh toán " + BookingLifecycle.vnd(b.getBaseAmount()) + " đã được ghi nhận, chờ quản trị viên chuyển.");
        audit.log(me.id(), "CHECK_OUT", "booking", b.getId(), b.getBookingCode());
        return b;
    }

    /** No-show từ ngày nhận phòng + 1: không hoàn tiền, trả tồn kho các đêm từ hôm nay (đêm đã qua không bán lại được). */
    @Transactional
    public Booking noShow(AuthUser me, Long bookingId) {
        BookingRef ref = scope.booking(me, bookingId);
        LocalDate today = BusinessDay.today(time);
        List<RoomInventory> remaining = today.isBefore(ref.checkOut()) && today.isAfter(ref.checkIn())
                ? inventory.lockRange(ref.roomTypeId(), today, ref.checkOut()) : List.of();
        Booking b = bookings.findByIdForUpdate(ref.id()).orElseThrow();
        b.noShow(today, time.now());
        InventoryService.release(remaining, b.getRoomsCount(), today);
        lifecycle.settlePayments(b, 0, "Khách không đến");
        lifecycle.notifyGuest(b, "Đơn " + b.getBookingCode() + " được ghi nhận không đến",
                "Khách sạn ghi nhận bạn không đến nhận phòng. Theo chính sách, đơn không được hoàn tiền.");
        audit.log(me.id(), "NO_SHOW", "booking", b.getId(), b.getBookingCode());
        return b;
    }

    private static String roomNumbers(Booking b) {
        return b.sortedRooms().stream().map(Room::getRoomNumber).reduce((a, x) -> a + ", " + x).orElse("");
    }
}
