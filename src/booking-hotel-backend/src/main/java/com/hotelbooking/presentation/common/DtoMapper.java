package com.hotelbooking.presentation.common;

import com.hotelbooking.application.hotel.CatalogService;
import com.hotelbooking.application.hotel.HotelOffer;
import com.hotelbooking.application.hotel.HotelOffer.RoomTypeOffer;
import com.hotelbooking.application.payment.PaymentService;
import com.hotelbooking.application.review.ReviewService;
import com.hotelbooking.domain.audit.AuditLog;
import com.hotelbooking.domain.booking.Booking;
import com.hotelbooking.domain.booking.BookingStatus;
import com.hotelbooking.domain.booking.RefundRule;
import com.hotelbooking.domain.common.BusinessDay;
import com.hotelbooking.domain.common.TimeProvider;
import com.hotelbooking.domain.hotel.*;
import com.hotelbooking.domain.notification.Notification;
import com.hotelbooking.domain.payment.Invoice;
import com.hotelbooking.domain.payment.Payment;
import com.hotelbooking.domain.payment.PaymentProvider;
import com.hotelbooking.domain.payment.PaymentStatus;
import com.hotelbooking.domain.payout.Payout;
import com.hotelbooking.domain.review.Review;
import com.hotelbooking.domain.systemsetting.SystemSetting;
import com.hotelbooking.domain.user.User;
import com.hotelbooking.infrastructure.config.AppProperties;
import com.hotelbooking.infrastructure.integration.mockgateway.MockPaymentGateway;
import com.hotelbooking.presentation.common.Dtos.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import org.springframework.stereotype.Component;

@Component
public class DtoMapper {
    /** Góc nhìn khi dựng BookingDto: GUEST (khách có key → kèm accessKey, checkoutUrl) hay STAFF (portal/admin → không lộ key). */
    public enum View { GUEST, STAFF }

    private final PaymentService payments;
    private final ReviewService reviews;
    private final CatalogService catalog;
    private final TimeProvider time;
    private final AppProperties props;

    public DtoMapper(PaymentService payments, ReviewService reviews, CatalogService catalog, TimeProvider time, AppProperties props) {
        this.payments = payments;
        this.reviews = reviews;
        this.catalog = catalog;
        this.time = time;
        this.props = props;
    }

    public UserDto user(User u) {
        return new UserDto(u.getId(), u.getFullName(), u.getEmail(), u.getPhone(), u.getRole(), u.getHotelId(), u.getHotelName(),
                u.isActive(), u.getCreatedAt());
    }

    public FacilityDto facility(Facility f) {
        return new FacilityDto(f.getId(), f.getName(), f.getIcon(), f.getCategory().getId(), f.getCategory().getName());
    }

    public FacilityCategoryDto category(FacilityCategory c, List<Facility> fs) {
        return new FacilityCategoryDto(c.getId(), c.getName(), fs.stream().map(this::facility).toList());
    }

    // ------------------------------------------------------------ khách sạn
    public HotelSummaryDto hotelSummary(HotelOffer o) {
        Hotel h = o.hotel();
        return new HotelSummaryDto(h.getId(), h.getName(), h.getCity(), h.getAddress(), h.getStarRating(), h.getCoverImageUrl(), h.getStatus(),
                o.fromPrice(), o.ratingAverage(), o.ratingCount(), o.availableRoomTypes(), h.getOwnerName(), h.getRejectReason());
    }

    public HotelDetailDto hotelDetail(HotelOffer o) {
        Hotel h = o.hotel();
        Map<Long, Facility> all = new TreeMap<>();
        o.roomTypes().forEach(t -> t.roomType().getFacilities().forEach(f -> all.put(f.getId(), f)));
        return new HotelDetailDto(h.getId(), h.getName(), h.getCity(), h.getAddress(), h.getStarRating(), h.getCoverImageUrl(), h.getStatus(),
                o.fromPrice(), o.ratingAverage(), o.ratingCount(), o.availableRoomTypes(), h.getOwnerName(), h.getRejectReason(),
                h.getDescription(), h.getCheckInTime(), h.getCheckOutTime(), h.getPhone(), catalog.images(h),
                o.roomTypes().stream().map(this::roomType).toList(), all.values().stream().map(this::facility).toList());
    }

    public RoomTypeDto roomType(RoomTypeOffer o) {
        RoomType t = o.roomType();
        List<NightlyPriceDto> nightly = o.quote() == null ? null
                : o.quote().nights().stream().map(n -> new NightlyPriceDto(n.date(), n.basePrice(), n.listingPrice())).toList();
        return new RoomTypeDto(t.getId(), t.getHotel().getId(), t.getName(), t.getDescription(), t.getCapacity(), t.getBedInfo(), t.getAreaM2(),
                t.getBasePrice(), o.listingPrice(), o.activeRooms(), t.getCancellationPolicy(), t.getFreeCancelDays(), t.getImageUrl(),
                t.sortedFacilities().stream().map(this::facility).toList(), o.availableRooms(), nightly,
                o.quote() == null ? null : o.quote().totalAmount());
    }

    public RoomDto room(Room r, boolean occupied) {
        return new RoomDto(r.getId(), r.getRoomType().getId(), r.getRoomType().getName(), r.getRoomNumber(), r.isActive(), occupied);
    }

    // ------------------------------------------------------------ đặt phòng
    /** Danh sách: không kèm hoá đơn để tránh N+1 truy vấn. */
    public BookingDto bookingSummary(Booking b, View view) { return booking(b, view, false); }

    public BookingDto booking(Booking b, View view) { return booking(b, view, true); }

    private BookingDto booking(Booking b, View view, boolean withInvoice) {
        Instant now = time.now();
        LocalDate today = BusinessDay.of(now);
        List<Payment> ps = payments.forBooking(b.getId());
        PaymentStatus paymentStatus = ps.isEmpty() ? null : ps.get(ps.size() - 1).getStatus();
        boolean canPay = b.getStatus() == BookingStatus.PENDING && !b.isPaymentOverdue(now);
        boolean canCancel = b.getStatus() == BookingStatus.PENDING
                || (b.getStatus() == BookingStatus.CONFIRMED && !today.isAfter(b.getCheckIn()));
        boolean canReview = b.getStatus() == BookingStatus.CHECKED_OUT && !reviews.hasReview(b.getId());
        RefundPreviewDto preview = null;
        if (canCancel && b.getStatus() == BookingStatus.CONFIRMED) {
            long paid = ps.stream().filter(p -> p.getStatus() == PaymentStatus.PAID).mapToLong(Payment::getAmount).sum();
            int percent = b.refundPercent(today);
            preview = new RefundPreviewDto(percent, RefundRule.amount(paid, percent));
        }
        InvoiceDto invoice = null;
        if (withInvoice) invoice = payments.invoice(b.getId()).map(x -> invoice(x, ps, view)).orElse(null);
        String rooms = b.getRooms().isEmpty() ? null
                : String.join(", ", b.sortedRooms().stream().map(Room::getRoomNumber).toList());
        Hotel h = b.getHotel();
        return new BookingDto(b.getId(), b.getBookingCode(), view == View.GUEST ? b.getAccessKey() : null, b.getStatus(), h.getId(), h.getName(),
                h.getCity(), h.getCoverImageUrl(), b.getRoomType().getId(), b.getRoomType().getName(), rooms, b.getCheckIn(), b.getCheckOut(),
                b.getNights(), b.getRoomsCount(), b.getGuests(), b.getGuestName(), b.getGuestEmail(), b.getGuestPhone(), b.getNote(),
                b.getBaseAmount(), b.getFeeAmount(), b.getTotalAmount(), b.getBookedAt(), b.getExpiresAt(), b.getCancelledAt(), b.getCancelReason(),
                b.getCheckedInAt(), b.getCheckedOutAt(), b.getCancellationPolicy(), b.getFreeCancelDays(), paymentStatus, invoice,
                canPay, canCancel, canReview, preview);
    }

    public InvoiceDto invoice(Invoice i, List<Payment> ps, View view) {
        return new InvoiceDto(i.getId(), i.getInvoiceCode(), i.getAmount(), i.getBaseAmount(), i.getFeeAmount(), i.getCreatedAt(),
                ps.stream().map(p -> payment(p, null, view)).toList());
    }

    /** checkoutUrl chỉ dựng cho khách (chứa accessKey); portal/admin không nhận key. */
    public PaymentDto payment(Payment p, String checkoutUrl, View view) {
        Booking b = p.getInvoice().getBooking();
        String url = checkoutUrl;
        if (url == null && view == View.GUEST && p.getStatus() == PaymentStatus.PENDING && p.getProvider() == PaymentProvider.MOCK) {
            url = MockPaymentGateway.checkoutUrl(props.frontendUrl(), p.getId(), b.getAccessKey());
        }
        return new PaymentDto(p.getId(), b.getBookingCode(), p.getAmount(), p.getRefundAmount(), p.getStatus(), p.getProvider(),
                p.getTransactionCode(), p.getCreatedAt(), p.getPaidAt(), url, b.getGuestName(), p.getNote());
    }

    public ReviewDto review(Review r) {
        return new ReviewDto(r.getId(), r.getHotelId(), r.getBookingCode(), r.getGuestName(), r.getRating(), r.getContent(), r.getStatus(), r.getCreatedAt());
    }

    public PayoutDto payout(Payout p) {
        return new PayoutDto(p.getId(), p.getHotel().getId(), p.getHotel().getName(), p.getBooking().getBookingCode(), p.getAmount(),
                p.getStatus(), p.getCreatedAt(), p.getPaidAt());
    }

    public NotificationDto notification(Notification n) {
        return new NotificationDto(n.getId(), n.getTitle(), n.getContent(), n.getBookingCode(), n.isRead(), n.getCreatedAt());
    }

    public SettingDto setting(SystemSetting s) { return new SettingDto(s.getKey(), s.getValue(), s.getDescription()); }

    public AuditLogDto audit(AuditLog a) {
        return new AuditLogDto(a.getId(), a.getUserEmail(), a.getAction(), a.getEntityType(), a.getEntityId(), a.getResult(), a.getDetail(), a.getCreatedAt());
    }
}
