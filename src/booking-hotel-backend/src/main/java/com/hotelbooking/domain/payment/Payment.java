package com.hotelbooking.domain.payment;

import com.hotelbooking.domain.common.BusinessException;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "payments")
public class Payment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "invoice_id")
    private Invoice invoice;
    @Column(nullable = false)
    private long amount;
    @Column(name = "refund_amount")
    private Long refundAmount;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentProvider provider;
    @Column(name = "transaction_code", unique = true)
    private String transactionCode;
    @Column(name = "payment_method")
    private String paymentMethod;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status;
    private String note;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "paid_at")
    private Instant paidAt;

    protected Payment() {}

    public Payment(Invoice invoice, PaymentProvider provider, Instant now) {
        this.invoice = invoice;
        this.amount = invoice.getAmount();
        this.provider = provider;
        this.status = PaymentStatus.PENDING;
        this.createdAt = now;
    }

    /** Số tiền thanh toán phải khớp hoá đơn. */
    public void markPaid(String transactionCode, long paidAmount, String method, Instant now) {
        PaymentStatus.MACHINE.assertTransition(status, PaymentStatus.PAID);
        if (paidAmount != amount) throw BusinessException.rule("Số tiền thanh toán không khớp hoá đơn");
        this.status = PaymentStatus.PAID;
        this.transactionCode = transactionCode;
        this.paymentMethod = method;
        this.paidAt = now;
    }

    public void markFailed(String transactionCode, String note) {
        PaymentStatus.MACHINE.assertTransition(status, PaymentStatus.FAILED);
        this.status = PaymentStatus.FAILED;
        this.transactionCode = transactionCode;
        this.note = note;
    }

    public void cancel(String note) {
        PaymentStatus.MACHINE.assertTransition(status, PaymentStatus.CANCELLED);
        this.status = PaymentStatus.CANCELLED;
        this.note = note;
    }

    public void refund(long refundAmount, String note) {
        PaymentStatus.MACHINE.assertTransition(status, PaymentStatus.REFUNDED);
        this.status = PaymentStatus.REFUNDED;
        this.refundAmount = refundAmount;
        this.note = note;
    }

    public Long getId() { return id; }
    public Invoice getInvoice() { return invoice; }
    public long getAmount() { return amount; }
    public Long getRefundAmount() { return refundAmount; }
    public PaymentProvider getProvider() { return provider; }
    public String getTransactionCode() { return transactionCode; }
    public String getPaymentMethod() { return paymentMethod; }
    public PaymentStatus getStatus() { return status; }
    public String getNote() { return note; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getPaidAt() { return paidAt; }
}
