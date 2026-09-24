package com.hotelbooking.application.auth;

import com.hotelbooking.application.audit.AuditService;
import com.hotelbooking.domain.common.BusinessException;
import com.hotelbooking.domain.common.ErrorCode;
import com.hotelbooking.domain.common.TimeProvider;
import com.hotelbooking.domain.user.RefreshToken;
import com.hotelbooking.domain.user.Role;
import com.hotelbooking.domain.user.User;
import com.hotelbooking.infrastructure.config.AppProperties;
import com.hotelbooking.infrastructure.persistence.jpa.JpaRefreshTokenRepository;
import com.hotelbooking.infrastructure.persistence.jpa.JpaUserRepository;
import com.hotelbooking.infrastructure.persistence.jpa.JpaUserRoleRepository;
import com.hotelbooking.infrastructure.security.JwtService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Đăng ký (CUSTOMER), đăng nhập, refresh token xoay vòng — cùng quy ước với POC Tour.
 * Refresh token: chuỗi ngẫu nhiên 256 bit, DB chỉ lưu SHA-256. Dùng lại token đã xoay → thu hồi cả chuỗi (phát hiện token bị đánh cắp).
 */
@Service
public class AuthService {
    public record Tokens(String accessToken, String refreshToken, long expiresIn, User user) {}

    private static final SecureRandom RANDOM = new SecureRandom();
    private final JpaUserRepository users;
    private final JpaUserRoleRepository roles;
    private final JpaRefreshTokenRepository refreshTokens;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final AuditService audit;
    private final TimeProvider time;
    private final Duration refreshTtl;

    public AuthService(JpaUserRepository users, JpaUserRoleRepository roles, JpaRefreshTokenRepository refreshTokens,
                       PasswordEncoder encoder, JwtService jwt, AuditService audit, TimeProvider time, AppProperties props) {
        this.users = users;
        this.roles = roles;
        this.refreshTokens = refreshTokens;
        this.encoder = encoder;
        this.jwt = jwt;
        this.audit = audit;
        this.time = time;
        this.refreshTtl = Duration.ofDays(props.jwt().refreshTtlDays());
    }

    @Transactional
    public User register(String fullName, String email, String password, String confirmPassword, String phone) {
        if (!password.equals(confirmPassword)) throw new BusinessException(ErrorCode.BAD_REQUEST, "Mật khẩu xác nhận không khớp");
        if (users.existsByEmailIgnoreCase(email)) throw new BusinessException(ErrorCode.EMAIL_EXISTS, "Email này đã được đăng ký");
        User u = users.save(new User(roles.findByName(Role.CUSTOMER.name()).orElseThrow(), fullName.trim(), email.trim(),
                encoder.encode(password), blankToNull(phone), null, time.now()));
        audit.log(u.getId(), "REGISTER", "user", u.getId(), null);
        return u;
    }

    @Transactional
    public Tokens login(String email, String password) {
        User u = users.findByEmailIgnoreCase(email.trim()).orElse(null);
        if (u == null || !encoder.matches(password, u.getPasswordHash())) {
            audit.logFailure(u == null ? null : u.getId(), "LOGIN", "user", u == null ? null : u.getId(), "email=" + email);
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS, "Email hoặc mật khẩu không đúng");
        }
        u.assertCanLogin();
        audit.log(u.getId(), "LOGIN", "user", u.getId(), null);
        return issue(u, UUID.randomUUID().toString());
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public Tokens refresh(String rawToken) {
        Instant now = Instant.now();   // hạn token theo giờ thật, không theo đồng hồ demo
        RefreshToken stored = refreshTokens.findByHashForUpdate(sha256(rawToken))
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN, "Phiên đăng nhập không hợp lệ"));
        if (stored.getRevokedAt() != null) {
            refreshTokens.revokeFamily(stored.getFamilyId(), now);
            audit.log(stored.getUserId(), "REFRESH_REUSE_DETECTED", "user", stored.getUserId(), "family=" + stored.getFamilyId());
            throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN, "Phiên đăng nhập đã bị thu hồi, vui lòng đăng nhập lại");
        }
        if (!stored.isUsable(now)) throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN, "Phiên đăng nhập đã hết hạn");
        User u = users.findById(stored.getUserId()).orElseThrow();
        u.assertCanLogin();
        stored.revoke(now);
        return issue(u, stored.getFamilyId());
    }

    @Transactional
    public void logout(String rawToken) {
        refreshTokens.findByHashForUpdate(sha256(rawToken)).ifPresent(t -> refreshTokens.revokeFamily(t.getFamilyId(), Instant.now()));
    }

    @Transactional
    public void revokeAll(Long userId) { refreshTokens.revokeAllForUser(userId, Instant.now()); }

    private Tokens issue(User u, String familyId) {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant now = Instant.now();
        refreshTokens.save(new RefreshToken(u.getId(), sha256(raw), familyId, now.plus(refreshTtl), now));
        return new Tokens(jwt.issueAccessToken(u), raw, jwt.accessTtl().toSeconds(), u);
    }

    public static String sha256(String s) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String blankToNull(String s) { return s == null || s.isBlank() ? null : s.trim(); }
}
