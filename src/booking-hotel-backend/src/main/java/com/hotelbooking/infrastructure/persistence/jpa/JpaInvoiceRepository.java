package com.hotelbooking.infrastructure.persistence.jpa;

import com.hotelbooking.domain.payment.Invoice;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JpaInvoiceRepository extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByBookingId(Long bookingId);
}
