package com.hotelbooking.application.user;

import com.hotelbooking.application.audit.AuditService;
import com.hotelbooking.application.auth.AuthService;
import com.hotelbooking.domain.common.BusinessException;
import com.hotelbooking.domain.common.ErrorCode;
import com.hotelbooking.domain.common.TimeProvider;
import com.hotelbooking.domain.user.Role;
import com.hotelbooking.domain.user.User;
import com.hotelbooking.infrastructure.persistence.jpa.JpaHotelRepository;
import com.hotelbooking.infrastructure.persistence.jpa.JpaUserRepository;
import com.hotelbooking.infrastructure.persistence.jpa.JpaUserRoleRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Quản lý tài khoản (FR-USR-002) — admin tạo được mọi vai trò; owner tạo staff đi qua StaffService. */
@Service
public class UserService {
    private final JpaUserRepository users;
    private final JpaUserRoleRepository roles;
    private final JpaHotelRepository hotels;
    private final PasswordEncoder encoder;
    private final AuthService auth;
    private final AuditService audit;
    private final TimeProvider time;

    public UserService(JpaUserRepository users, JpaUserRoleRepository roles, JpaHotelRepository hotels, PasswordEncoder encoder,
                       AuthService auth, AuditService audit, TimeProvider time) {
        this.users = users;
        this.roles = roles;
        this.hotels = hotels;
        this.encoder = encoder;
        this.auth = auth;
        this.audit = audit;
        this.time = time;
    }

    @Transactional(readOnly = true)
    public User get(Long id) { return users.findById(id).orElseThrow(() -> BusinessException.notFound("tài khoản")); }

    @Transactional
    public User updateMe(Long id, String fullName, String phone) {
        User u = get(id);
        u.updateProfile(fullName.trim(), blank(phone));
        return u;
    }

    @Transactional(readOnly = true)
    public Page<User> search(String keyword, Role role, Pageable pageable) {
        return users.search(blank(keyword), role == null ? null : role.name(), pageable);
    }

    @Transactional
    public User create(String fullName, String email, String password, String phone, Role role, Long hotelId, Long actorId) {
        if (users.existsByEmailIgnoreCase(email)) throw new BusinessException(ErrorCode.EMAIL_EXISTS, "Email này đã được đăng ký");
        if (role == Role.HOTEL_STAFF) requireHotel(hotelId);
        User u = users.save(new User(roles.findByName(role.name()).orElseThrow(), fullName.trim(), email.trim(),
                encoder.encode(password), blank(phone), hotelId, time.now()));
        audit.log(actorId, "CREATE", "user", u.getId(), "role=" + role + (hotelId == null ? "" : " hotel=" + hotelId));
        return u;
    }

    @Transactional
    public User update(Long id, String fullName, String phone, Role role, Long hotelId, Long actorId) {
        User u = get(id);
        if (id.equals(actorId) && role != u.getRole()) throw BusinessException.rule("Không thể tự đổi vai trò của chính mình");
        u.updateProfile(fullName.trim(), blank(phone));
        if (role != u.getRole() || (role == Role.HOTEL_STAFF && hotelId != null && !hotelId.equals(u.getHotelId()))) {
            if (role == Role.HOTEL_STAFF) requireHotel(hotelId);
            audit.log(actorId, "CHANGE_ROLE", "user", id, u.getRole() + " → " + role);
            u.changeRole(roles.findByName(role.name()).orElseThrow(), hotelId);
            auth.revokeAll(id);     // quyền đổi → buộc đăng nhập lại
        }
        return u;
    }

    @Transactional
    public User setActive(Long id, boolean active, Long actorId) {
        if (id.equals(actorId) && !active) throw BusinessException.rule("Không thể tự khoá tài khoản của chính mình");
        User u = get(id);
        u.setActive(active);
        if (!active) auth.revokeAll(id);
        audit.log(actorId, active ? "UNLOCK" : "LOCK", "user", id, null);
        return u;
    }

    private void requireHotel(Long hotelId) {
        if (hotelId == null || !hotels.existsById(hotelId)) throw BusinessException.badRequest("Nhân viên phải thuộc một khách sạn hợp lệ");
    }

    private static String blank(String s) { return s == null || s.isBlank() ? null : s.trim(); }
}
