package com.hotelbooking.infrastructure.security;

import com.hotelbooking.domain.common.ErrorCode;
import com.hotelbooking.infrastructure.persistence.jpa.JpaUserRepository;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Đọc Bearer token. Token hỏng/hết hạn không chặn ở đây: request đi tiếp như khách vãng lai,
 * endpoint cần đăng nhập sẽ trả 401 với code TOKEN_EXPIRED để frontend tự refresh.
 * Mỗi request đọc lại user từ DB → khoá tài khoản / đổi vai trò có hiệu lực ngay.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    public static final String ERROR_ATTR = "auth.error";
    private final JwtService jwt;
    private final JpaUserRepository users;

    public JwtAuthenticationFilter(JwtService jwt, JpaUserRepository users) {
        this.jwt = jwt;
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                Long userId = jwt.parseUserId(header.substring(7));
                users.findById(userId).ifPresentOrElse(u -> {
                    if (!u.isActive()) {
                        req.setAttribute(ERROR_ATTR, ErrorCode.ACCOUNT_DISABLED);
                        return;
                    }
                    AuthUser principal = new AuthUser(u.getId(), u.getEmail(), u.getFullName(), u.getRole(), u.getHotelId());
                    var auth = new UsernamePasswordAuthenticationToken(principal, null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + u.getRole().name())));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }, () -> req.setAttribute(ERROR_ATTR, ErrorCode.UNAUTHORIZED));
            } catch (ExpiredJwtException e) {
                req.setAttribute(ERROR_ATTR, ErrorCode.TOKEN_EXPIRED);
            } catch (JwtException | IllegalArgumentException e) {
                req.setAttribute(ERROR_ATTR, ErrorCode.UNAUTHORIZED);
            }
        }
        chain.doFilter(req, res);
    }
}
