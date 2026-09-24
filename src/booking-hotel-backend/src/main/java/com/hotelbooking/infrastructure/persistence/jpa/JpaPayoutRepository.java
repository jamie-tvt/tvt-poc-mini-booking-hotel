package com.hotelbooking.infrastructure.persistence.jpa;

import com.hotelbooking.domain.payout.Payout;
import com.hotelbooking.domain.payout.PayoutStatus;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JpaPayoutRepository extends JpaRepository<Payout, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payout p where p.id = :id")
    Optional<Payout> findByIdForUpdate(@Param("id") Long id);

    boolean existsByBookingId(Long bookingId);

    @Query("select p from Payout p where p.hotel.id in :hotelIds and (:status is null or p.status = :status) order by p.createdAt desc")
    Page<Payout> findForHotels(@Param("hotelIds") Collection<Long> hotelIds, @Param("status") PayoutStatus status, Pageable pageable);

    @Query("select p from Payout p where (:status is null or p.status = :status) order by p.createdAt desc")
    Page<Payout> search(@Param("status") PayoutStatus status, Pageable pageable);
}
