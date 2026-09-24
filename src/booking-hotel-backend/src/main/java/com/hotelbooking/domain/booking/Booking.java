package com.hotelbooking.domain.booking;

import com.hotelbooking.domain.common.BusinessException;
import com.hotelbooking.domain.hotel.CancellationPolicy;
import com.hotelbooking.domain.hotel.Hotel;
import com.hotelbooking.domain.hotel.Room;
import com.hotelbooking.domain.hotel.RoomType;
import com.hotelbooking.domain.inventory.Pricing;
import jakarta.persistence.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "bookings")
public class Booking {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "booking_code", nullable = false, unique = true)
    private String bookingCode;
    @Column(name = "access_key", nullable = false, unique = true)
    private String accessKey;
    /** NULL = khách vãng lai. */
    @Column(name = "user_id")
    private Long userId;
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "hotel_id")
    private Hotel hotel;
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "room_type_id")
    private RoomType roomType;
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "booking_rooms", joinColumns = @JoinColumn(name = "booking_id"), inverseJoinColumns = @JoinColumn(name = "room_id"))
    private Set<Room> rooms = new LinkedHashSet<>();
    @Column(name = "check_in", nullable = false)
    private LocalDate checkIn;
    @Column(name = "check_out", nullable = false)
    private LocalDate checkOut;
    @Column(nullable = false)
    private int nights;
    @Column(name = "rooms_count", nullable = false)
    private int roomsCount;
    @Column(nullable = false)
    private int guests;
    @Column(name = "guest_name", nullable = false)
    private String guestName;
    @Column(name = "guest_email", nullable = false)
    private String guestEmail;
    @Column(name = "guest_phone", nullable = false)
    private String guestPhone;
    private String note;
    @Column(name = "base_amount", nullable = false)
    private long baseAmount;
    @Column(name = "fee_amount", nullable = false)
    private long feeAmount;
    @Column(name = "total_amount", nullable = false)
    private long totalAmount;
    @Enumerated(EnumType.STRING)
    @Column(name = "cancellation_policy", nullable = false)
    private CancellationPolicy cancellationPolicy;
    @Column(name = "free_cancel_days")
    private Integer freeCancelDays;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status;
    @Column(name = "booked_at", nullable = false)
    private Instant bookedAt;
    @Column(name = "expires_at")
    private Instant expiresAt;
    @Column(name = "cancelled_at")
    private Instant cancelledAt;
    @Column(name = "cancel_reason")
    private String cancelReason;
    @Column(name = "checked_in_at")
    private Instant checkedInAt;
    @Column(name = "checked_out_at")
    private Instant checkedOutAt;

    protected Booking() {}

    public record Guest(String name, String email, String phone, String note) {}

    /** Booking mới luôn PENDING; giá và chính sách huỷ chụp lại tại thời điểm đặt. */
    public Booking(String bookingCode, String accessKey, Long userId, RoomType roomType, LocalDate checkIn, LocalDate checkOut,
                   int guests, Guest guest, Pricing.Quote quote, Instant now, Instant expiresAt) {
        this.bookingCode = bookingCode;
        this.accessKey = accessKey;
        this.userId = userId;
        this.hotel = roomType.getHotel();
        this.roomType = roomType;
        this.checkIn = checkIn;
        this.checkOut = checkOut;
        this.nights = (int) ChronoUnit.DAYS.between(checkIn, checkOut);
        this.roomsCount = quote.rooms();
        this.guests = guests;
        this.guestName = guest.name();
        this.guestEmail = guest.email().toLowerCase();
        this.guestPhone = guest.phone();
        this.note = guest.note();
        this.baseAmount = quote.baseAmount();
        this.feeAmount = quote.feeAmount();
        this.totalAmount = quote.totalAmount();
        this.cancellationPolicy = roomType.getCancellationPolicy();
        this.freeCancelDays = roomType.getFreeCancelDays();
        this.status = BookingStatus.PENDING;
        this.bookedAt = now;
        this.expiresAt = expiresAt;
    }

    public boolean isPaymentOverdue(Instant now) { return status == BookingStatus.PENDING && expiresAt != null && !expiresAt.isAfter(now); }

    /** So sánh hằng thời gian để không lộ key qua thời gian phản hồi. */
    public boolean keyMatches(String key) {
        return key != null && MessageDigest.isEqual(accessKey.getBytes(StandardCharsets.UTF_8), key.getBytes(StandardCharsets.UTF_8));
    }

    public boolean isOwnedBy(Long uid) { return userId != null && userId.equals(uid); }

    public void confirm() {
        BookingStatus.MACHINE.assertTransition(status, BookingStatus.CONFIRMED);
        status = BookingStatus.CONFIRMED;
        expiresAt = null;
    }

    public void cancel(String reason, Instant now) {
        BookingStatus.MACHINE.assertTransition(status, BookingStatus.CANCELLED);
        status = BookingStatus.CANCELLED;
        cancelledAt = now;
        cancelReason = reason;
        expiresAt = null;
    }

    public void expire(Instant now) {
        BookingStatus.MACHINE.assertTransition(status, BookingStatus.EXPIRED);
        status = BookingStatus.EXPIRED;
        cancelledAt = now;
        cancelReason = "Quá hạn thanh toán";
    }

    /** FR-BK-006: chỉ từ ngày nhận phòng (và trước ngày trả phòng), đủ số phòng, đúng loại. */
    public void checkIn(Collection<Room> assigned, LocalDate today, Instant now) {
        BookingStatus.MACHINE.assertTransition(status, BookingStatus.CHECKED_IN);
        if (today.isBefore(checkIn)) throw BusinessException.rule("Chưa tới ngày nhận phòng " + checkIn);
        if (!today.isBefore(checkOut)) throw BusinessException.rule("Đã qua ngày trả phòng, hãy đánh dấu khách không đến");
        if (assigned.size() != roomsCount) throw BusinessException.rule("Đơn này cần gán đúng " + roomsCount + " phòng");
        for (Room r : assigned) {
            if (!r.getRoomType().getId().equals(roomType.getId())) throw BusinessException.rule("Phòng " + r.getRoomNumber() + " không thuộc loại " + roomType.getName());
            if (!r.isActive()) throw BusinessException.rule("Phòng " + r.getRoomNumber() + " đang tạm ngừng sử dụng");
        }
        rooms.clear();
        rooms.addAll(assigned);
        status = BookingStatus.CHECKED_IN;
        checkedInAt = now;
    }

    public void checkOut(Instant now) {
        BookingStatus.MACHINE.assertTransition(status, BookingStatus.CHECKED_OUT);
        status = BookingStatus.CHECKED_OUT;
        checkedOutAt = now;
    }

    /** Từ ngày nhận phòng + 1 mới được đánh dấu khách không đến. */
    public void noShow(LocalDate today, Instant now) {
        BookingStatus.MACHINE.assertTransition(status, BookingStatus.NO_SHOW);
        if (!today.isAfter(checkIn)) throw BusinessException.rule("Chỉ đánh dấu không đến từ ngày " + checkIn.plusDays(1));
        status = BookingStatus.NO_SHOW;
        cancelledAt = now;
        cancelReason = "Khách không đến nhận phòng";
    }

    public int refundPercent(LocalDate today) { return RefundRule.percentFor(cancellationPolicy, freeCancelDays, today, checkIn); }

    public List<Room> sortedRooms() { return rooms.stream().sorted(Comparator.comparing(Room::getRoomNumber)).toList(); }

    /** Chỉ dùng cho dữ liệu mẫu lịch sử (seed). */
    public void seedState(BookingStatus status, Instant bookedAt, Instant checkedInAt, Instant checkedOutAt, Collection<Room> assigned) {
        this.status = status; this.bookedAt = bookedAt; this.expiresAt = null;
        this.checkedInAt = checkedInAt; this.checkedOutAt = checkedOutAt;
        if (assigned != null) this.rooms.addAll(assigned);
    }

    public Long getId() { return id; }
    public String getBookingCode() { return bookingCode; }
    public String getAccessKey() { return accessKey; }
    public Long getUserId() { return userId; }
    public Hotel getHotel() { return hotel; }
    public RoomType getRoomType() { return roomType; }
    public Set<Room> getRooms() { return rooms; }
    public LocalDate getCheckIn() { return checkIn; }
    public LocalDate getCheckOut() { return checkOut; }
    public int getNights() { return nights; }
    public int getRoomsCount() { return roomsCount; }
    public int getGuests() { return guests; }
    public String getGuestName() { return guestName; }
    public String getGuestEmail() { return guestEmail; }
    public String getGuestPhone() { return guestPhone; }
    public String getNote() { return note; }
    public long getBaseAmount() { return baseAmount; }
    public long getFeeAmount() { return feeAmount; }
    public long getTotalAmount() { return totalAmount; }
    public CancellationPolicy getCancellationPolicy() { return cancellationPolicy; }
    public Integer getFreeCancelDays() { return freeCancelDays; }
    public BookingStatus getStatus() { return status; }
    public Instant getBookedAt() { return bookedAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getCancelledAt() { return cancelledAt; }
    public String getCancelReason() { return cancelReason; }
    public Instant getCheckedInAt() { return checkedInAt; }
    public Instant getCheckedOutAt() { return checkedOutAt; }
}
