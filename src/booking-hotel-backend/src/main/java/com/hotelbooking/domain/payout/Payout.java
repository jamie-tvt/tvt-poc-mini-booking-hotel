package com.hotelbooking.domain.payout;

import com.hotelbooking.domain.booking.Booking;
import com.hotelbooking.domain.hotel.Hotel;
import jakarta.persistence.*;
import java.time.Instant;

/** Tiền nền tảng trả cho khách sạn khi khách trả phòng: amount = baseAmount (phí nền tảng giữ lại). */
@Entity
@Table(name = "payouts")
public class Payout {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "hotel_id")
    private Hotel hotel;
    @OneToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "booking_id", unique = true)
    private Booking booking;
    @Column(nullable = false)
    private long amount;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PayoutStatus status;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "paid_at")
    private Instant paidAt;
    @Column(name = "paid_by")
    private Long paidBy;

    protected Payout() {}

    public Payout(Booking booking, Instant now) {
        this.hotel = booking.getHotel();
        this.booking = booking;
        this.amount = booking.getBaseAmount();
        this.status = PayoutStatus.PENDING;
        this.createdAt = now;
    }

    public void markPaid(Long adminId, Instant now) {
        PayoutStatus.MACHINE.assertTransition(status, PayoutStatus.PAID);
        this.status = PayoutStatus.PAID;
        this.paidAt = now;
        this.paidBy = adminId;
    }

    public Long getId() { return id; }
    public Hotel getHotel() { return hotel; }
    public Booking getBooking() { return booking; }
    public long getAmount() { return amount; }
    public PayoutStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getPaidAt() { return paidAt; }
}
