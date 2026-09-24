package com.hotelbooking.infrastructure.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelbooking.domain.common.ErrorCode;
import com.hotelbooking.presentation.common.ApiResponse;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

/** Trả lỗi 401/403 theo đúng định dạng ApiResponse thay vì trang lỗi mặc định. */
@Component
public class SecurityErrorWriter {
    private final ObjectMapper mapper;

    public SecurityErrorWriter(ObjectMapper mapper) { this.mapper = mapper; }

    public AuthenticationEntryPoint entryPoint() {
        return (req, res, ex) -> {
            Object attr = req.getAttribute(JwtAuthenticationFilter.ERROR_ATTR);
            ErrorCode code = attr instanceof ErrorCode c ? c : ErrorCode.UNAUTHORIZED;
            String msg = switch (code) {
                case TOKEN_EXPIRED -> "Phiên đăng nhập đã hết hạn";
                case ACCOUNT_DISABLED -> "Tài khoản đã bị khoá";
                default -> "Vui lòng đăng nhập để tiếp tục";
            };
            write(res, code, msg);
        };
    }

    public AccessDeniedHandler accessDenied() {
        return (req, res, ex) -> write(res, ErrorCode.ACCESS_DENIED, "Bạn không có quyền thực hiện thao tác này");
    }

    private void write(HttpServletResponse res, ErrorCode code, String msg) throws IOException {
        res.setStatus(code.httpStatus());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        mapper.writeValue(res.getOutputStream(), ApiResponse.error(code, msg, null));
    }
}
