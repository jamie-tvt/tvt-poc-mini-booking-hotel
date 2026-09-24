package com.hotelbooking.domain.user;

import com.hotelbooking.domain.common.BusinessException;
import com.hotelbooking.domain.common.ErrorCode;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "role_id")
    private UserRole role;
    @Column(name = "full_name", nullable = false)
    private String fullName;
    @Column(nullable = false, unique = true)
    private String email;
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    private String phone;
    /** Chỉ HOTEL_STAFF: khách sạn được gán. */
    @Column(name = "hotel_id")
    private Long hotelId;
    @org.hibernate.annotations.Formula("(select h.name from hotels h where h.id = hotel_id)")
    private String hotelName;
    @Column(name = "is_active", nullable = false)
    private boolean active = true;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected User() {}

    public User(UserRole role, String fullName, String email, String passwordHash, String phone, Long hotelId, Instant createdAt) {
        if (role.toRole() == Role.HOTEL_STAFF && hotelId == null) throw BusinessException.rule("Nhân viên phải thuộc một khách sạn");
        this.role = role;
        this.fullName = fullName;
        this.email = email.toLowerCase();
        this.passwordHash = passwordHash;
        this.phone = phone;
        this.hotelId = role.toRole() == Role.HOTEL_STAFF ? hotelId : null;
        this.createdAt = createdAt;
    }

    public void assertCanLogin() {
        if (!active) throw new BusinessException(ErrorCode.ACCOUNT_DISABLED, "Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên");
    }

    public void updateProfile(String fullName, String phone) {
        this.fullName = fullName;
        this.phone = phone;
    }

    public void changeRole(UserRole role, Long hotelId) {
        if (role.toRole() == Role.HOTEL_STAFF && hotelId == null) throw BusinessException.rule("Nhân viên phải thuộc một khách sạn");
        this.role = role;
        this.hotelId = role.toRole() == Role.HOTEL_STAFF ? hotelId : null;
    }

    public void setActive(boolean active) { this.active = active; }

    public Long getId() { return id; }
    public Role getRole() { return role.toRole(); }
    public String getFullName() { return fullName; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getPhone() { return phone; }
    public Long getHotelId() { return hotelId; }
    public String getHotelName() { return hotelName; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
}
