package com.hotelbooking.domain.payment;

import com.hotelbooking.domain.booking.Booking;
import jakarta.persistence.*;
import java.time.Instant;

/** Hoá đơn sinh cùng lúc với booking. Mỗi booking một hoá đơn; hoá đơn có nhiều lần thanh toán. */
@Entity
@Table(name = "invoices")
public class Invoice {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @OneToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "booking_id", unique = true)
    private Booking booking;
    @Column(name = "invoice_code", nullable = false, unique = true)
    private String invoiceCode;
    @Column(nullable = false)
    private long amount;
    @Column(name = "base_amount", nullable = false)
    private long baseAmount;
    @Column(name = "fee_amount", nullable = false)
    private long feeAmount;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Invoice() {}
    public Invoice(Booking booking, String invoiceCode, Instant now) {
        this.booking = booking;
        this.invoiceCode = invoiceCode;
        this.amount = booking.getTotalAmount();
        this.baseAmount = booking.getBaseAmount();
        this.feeAmount = booking.getFeeAmount();
        this.createdAt = now;
    }

    public Long getId() { return id; }
    public Booking getBooking() { return booking; }
    public String getInvoiceCode() { return invoiceCode; }
    public long getAmount() { return amount; }
    public long getBaseAmount() { return baseAmount; }
    public long getFeeAmount() { return feeAmount; }
    public Instant getCreatedAt() { return createdAt; }
}
