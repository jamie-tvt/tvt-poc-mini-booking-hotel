package com.hotelbooking.infrastructure.persistence.jpa;

import com.hotelbooking.domain.review.Review;
import com.hotelbooking.domain.review.ReviewStatus;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JpaReviewRepository extends JpaRepository<Review, Long> {
    boolean existsByBookingId(Long bookingId);
    Page<Review> findByHotelIdAndStatusOrderByCreatedAtDesc(Long hotelId, ReviewStatus status, Pageable pageable);

    /** [hotelId, avg(rating), count] của đánh giá đang hiển thị. */
    @Query("select r.hotelId, avg(r.rating), count(r) from Review r where r.status = 'VISIBLE' and r.hotelId in :ids group by r.hotelId")
    List<Object[]> stats(@Param("ids") Collection<Long> hotelIds);
}
