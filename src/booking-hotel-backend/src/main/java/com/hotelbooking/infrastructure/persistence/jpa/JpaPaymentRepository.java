package com.hotelbooking.infrastructure.persistence.jpa;

import com.hotelbooking.domain.payment.Payment;
import com.hotelbooking.domain.payment.PaymentStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JpaPaymentRepository extends JpaRepository<Payment, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.id = :id")
    Optional<Payment> findByIdForUpdate(@Param("id") Long id);

    List<Payment> findByInvoiceIdOrderByCreatedAtAsc(Long invoiceId);

    @Query("select p from Payment p where p.invoice.booking.id = :bookingId order by p.createdAt, p.id")
    List<Payment> findByBookingId(@Param("bookingId") Long bookingId);

    boolean existsByTransactionCode(String code);

    @Query("select p.amount from Payment p where p.id = :id")
    Long findAmount(@Param("id") Long id);

    /** Khoá mọi giao dịch của booking (theo id tăng dần) — bước cuối của thứ tự khoá inventory → booking → payment. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.invoice.booking.id = :bookingId order by p.id")
    List<Payment> lockByBookingId(@Param("bookingId") Long bookingId);

    @Query("select p from Payment p where (:status is null or p.status = :status) order by p.createdAt desc")
    Page<Payment> search(@Param("status") PaymentStatus status, Pageable pageable);

    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.status in ('PAID','REFUNDED')")
    long sumCollected();

    @Query("select coalesce(sum(p.refundAmount), 0) from Payment p where p.status = 'REFUNDED'")
    long sumRefunded();

    /** Phí nền tảng của các giao dịch đã thu và chưa hoàn. */
    @Query("select coalesce(sum(p.invoice.feeAmount), 0) from Payment p where p.status = 'PAID'")
    long sumPlatformFee();
}
