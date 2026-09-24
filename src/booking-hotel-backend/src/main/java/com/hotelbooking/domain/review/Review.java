package com.hotelbooking.domain.review;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "reviews")
public class Review {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "hotel_id", nullable = false)
    private Long hotelId;
    @Column(name = "booking_id", nullable = false, unique = true)
    private Long bookingId;
    @org.hibernate.annotations.Formula("(select b.booking_code from bookings b where b.id = booking_id)")
    private String bookingCode;
    @Column(name = "user_id")
    private Long userId;
    @Column(name = "guest_name", nullable = false)
    private String guestName;
    @Column(nullable = false)
    private int rating;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReviewStatus status;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Review() {}
    public Review(Long hotelId, Long bookingId, Long userId, String guestName, int rating, String content, Instant now) {
        this.hotelId = hotelId; this.bookingId = bookingId; this.userId = userId; this.guestName = guestName;
        this.rating = rating; this.content = content; this.status = ReviewStatus.VISIBLE;
        this.createdAt = now; this.updatedAt = now;
    }

    public void setVisibility(ReviewStatus status, Instant now) { this.status = status; this.updatedAt = now; }

    public Long getId() { return id; }
    public Long getHotelId() { return hotelId; }
    public Long getBookingId() { return bookingId; }
    public String getBookingCode() { return bookingCode; }
    public Long getUserId() { return userId; }
    public String getGuestName() { return guestName; }
    public int getRating() { return rating; }
    public String getContent() { return content; }
    public ReviewStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
}
