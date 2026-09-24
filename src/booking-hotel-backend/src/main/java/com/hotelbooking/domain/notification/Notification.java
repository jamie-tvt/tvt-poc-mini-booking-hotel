package com.hotelbooking.domain.notification;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "notifications")
public class Notification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "user_id", nullable = false)
    private Long userId;
    @Column(name = "booking_id")
    private Long bookingId;
    @org.hibernate.annotations.Formula("(select b.booking_code from bookings b where b.id = booking_id)")
    private String bookingCode;
    @Column(nullable = false)
    private String title;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;
    @Column(name = "is_read", nullable = false)
    private boolean read;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Notification() {}
    public Notification(Long userId, Long bookingId, String title, String content, Instant now) {
        this.userId = userId; this.bookingId = bookingId; this.title = title; this.content = content; this.createdAt = now;
    }

    public void markRead() { this.read = true; }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public Long getBookingId() { return bookingId; }
    public String getBookingCode() { return bookingCode; }
    public String getTitle() { return title; }
    public String getContent() { return content; }
    public boolean isRead() { return read; }
    public Instant getCreatedAt() { return createdAt; }
}
