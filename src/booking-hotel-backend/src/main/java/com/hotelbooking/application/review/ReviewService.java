package com.hotelbooking.application.review;

import com.hotelbooking.application.audit.AuditService;
import com.hotelbooking.domain.booking.Booking;
import com.hotelbooking.domain.booking.BookingRef;
import com.hotelbooking.domain.booking.BookingStatus;
import com.hotelbooking.domain.common.BusinessException;
import com.hotelbooking.domain.common.ErrorCode;
import com.hotelbooking.domain.common.TimeProvider;
import com.hotelbooking.domain.review.Review;
import com.hotelbooking.infrastructure.persistence.jpa.JpaBookingRepository;
import com.hotelbooking.infrastructure.persistence.jpa.JpaReviewRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** FR-REV: chỉ đơn đã CHECKED_OUT mới đánh giá; mỗi booking một đánh giá (UNIQUE ở DB chặn cả 2 request song song). */
@Service
public class ReviewService {
    private final JpaReviewRepository reviews;
    private final JpaBookingRepository bookings;
    private final AuditService audit;
    private final TimeProvider time;

    public ReviewService(JpaReviewRepository reviews, JpaBookingRepository bookings, AuditService audit, TimeProvider time) {
        this.reviews = reviews;
        this.bookings = bookings;
        this.audit = audit;
        this.time = time;
    }

    @Transactional
    public Review create(String bookingCode, String key, Long viewerId, int rating, String content) {
        BookingRef ref = bookings.findRefByCode(bookingCode == null ? "" : bookingCode.trim().toUpperCase())
                .filter(r -> r.accessibleBy(key, viewerId))
                .orElseThrow(() -> BusinessException.notFound("đơn đặt phòng"));
        Booking b = bookings.findById(ref.id()).orElseThrow();
        if (b.getStatus() != BookingStatus.CHECKED_OUT) throw BusinessException.rule("Bạn chỉ đánh giá được sau khi đã trả phòng");
        if (reviews.existsByBookingId(b.getId())) throw new BusinessException(ErrorCode.ALREADY_REVIEWED, "Bạn đã đánh giá kỳ nghỉ này");
        Review r = reviews.save(new Review(b.getHotel().getId(), b.getId(), b.getUserId(), b.getGuestName(), rating, content.trim(), time.now()));
        audit.log(viewerId, "CREATE", "review", r.getId(), b.getBookingCode() + " rating=" + rating);
        return r;
    }

    @Transactional(readOnly = true)
    public boolean hasReview(Long bookingId) { return reviews.existsByBookingId(bookingId); }
}
