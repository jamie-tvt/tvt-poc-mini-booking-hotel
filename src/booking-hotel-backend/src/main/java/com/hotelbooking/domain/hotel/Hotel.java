package com.hotelbooking.domain.hotel;

import com.hotelbooking.domain.common.BusinessException;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "hotels")
public class Hotel {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "owner_id", nullable = false)
    private Long ownerId;
    @org.hibernate.annotations.Formula("(select u.full_name from users u where u.id = owner_id)")
    private String ownerName;
    @Column(nullable = false)
    private String name;
    @Column(nullable = false)
    private String city;
    @Column(nullable = false)
    private String address;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;
    @Column(name = "star_rating", nullable = false)
    private int starRating;
    private String phone;
    @Column(name = "check_in_time", nullable = false)
    private String checkInTime;
    @Column(name = "check_out_time", nullable = false)
    private String checkOutTime;
    @Column(name = "cover_image_url")
    private String coverImageUrl;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private HotelStatus status;
    @Column(name = "reject_reason")
    private String rejectReason;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Hotel() {}

    /** Khách sạn mới luôn chờ admin duyệt. */
    public Hotel(Long ownerId, Instant now) {
        this.ownerId = ownerId;
        this.status = HotelStatus.PENDING_APPROVAL;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void updateProfile(String name, String city, String address, String description, int starRating, String phone,
                              String checkInTime, String checkOutTime, String coverImageUrl, Instant now) {
        if (starRating < 1 || starRating > 5) throw BusinessException.badRequest("Hạng sao từ 1 đến 5");
        this.name = name;
        this.city = city;
        this.address = address;
        this.description = description;
        this.starRating = starRating;
        this.phone = phone;
        this.checkInTime = checkInTime;
        this.checkOutTime = checkOutTime;
        this.coverImageUrl = coverImageUrl;
        this.updatedAt = now;
        if (status == HotelStatus.REJECTED) {        // sửa xong gửi duyệt lại
            changeStatus(HotelStatus.PENDING_APPROVAL, now);
            this.rejectReason = null;
        }
    }

    public void changeStatus(HotelStatus next, Instant now) {
        HotelStatus.MACHINE.assertTransition(status, next);
        this.status = next;
        this.updatedAt = now;
    }

    public void reject(String reason, Instant now) {
        changeStatus(HotelStatus.REJECTED, now);
        this.rejectReason = reason;
    }

    public boolean isPublic() { return status == HotelStatus.ACTIVE; }
    public boolean isOwnedBy(Long userId) { return ownerId.equals(userId); }

    public Long getId() { return id; }
    public Long getOwnerId() { return ownerId; }
    public String getOwnerName() { return ownerName; }
    public String getName() { return name; }
    public String getCity() { return city; }
    public String getAddress() { return address; }
    public String getDescription() { return description; }
    public int getStarRating() { return starRating; }
    public String getPhone() { return phone; }
    public String getCheckInTime() { return checkInTime; }
    public String getCheckOutTime() { return checkOutTime; }
    public String getCoverImageUrl() { return coverImageUrl; }
    public HotelStatus getStatus() { return status; }
    public String getRejectReason() { return rejectReason; }
    public Instant getCreatedAt() { return createdAt; }
}
