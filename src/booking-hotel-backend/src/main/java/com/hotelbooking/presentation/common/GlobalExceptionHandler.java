package com.hotelbooking.presentation.common;

import com.hotelbooking.domain.common.BusinessException;
import com.hotelbooking.domain.common.ErrorCode;
import com.hotelbooking.infrastructure.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    ResponseEntity<ApiResponse<Void>> business(BusinessException e) { return respond(e.code(), e.getMessage(), null); }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiResponse<Void>> invalid(MethodArgumentNotValidException e) {
        List<ApiResponse.FieldError> errors = e.getBindingResult().getFieldErrors().stream()
                .map(f -> new ApiResponse.FieldError(f.getField(), f.getDefaultMessage())).toList();
        return respond(ErrorCode.VALIDATION_FAILED, "Dữ liệu chưa hợp lệ", errors);
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    ResponseEntity<ApiResponse<Void>> invalidParams(HandlerMethodValidationException e) {
        return respond(ErrorCode.VALIDATION_FAILED, "Tham số chưa hợp lệ", null);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class})
    ResponseEntity<ApiResponse<Void>> badRequest(Exception e) {
        return respond(ErrorCode.BAD_REQUEST, "Yêu cầu sai định dạng", null);
    }

    /** Ràng buộc ở DB là lớp chặn cuối — đổi tên constraint thành mã lỗi dễ hiểu. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiResponse<Void>> integrity(DataIntegrityViolationException e) {
        String msg = String.valueOf(e.getMostSpecificCause().getMessage());
        log.warn("Vi phạm ràng buộc DB: {}", msg);
        if (msg.contains("uq_reviews_booking")) return respond(ErrorCode.ALREADY_REVIEWED, "Bạn đã đánh giá kỳ nghỉ này", null);
        if (msg.contains("ck_inventory_booked")) return respond(ErrorCode.ROOM_UNAVAILABLE, "Loại phòng đã hết phòng cho khoảng ngày này", null);
        if (msg.contains("uq_users_email")) return respond(ErrorCode.EMAIL_EXISTS, "Email này đã được đăng ký", null);
        if (msg.contains("uq_rooms_number")) return respond(ErrorCode.CONFLICT, "Số phòng đã tồn tại trong khách sạn", null);
        return respond(ErrorCode.CONFLICT, "Dữ liệu xung đột với trạng thái hiện tại", null);
    }

    /** Chờ khoá quá lâu / deadlock bị MySQL huỷ: không lộ lỗi 500, khách thử lại. */
    @ExceptionHandler(PessimisticLockingFailureException.class)
    ResponseEntity<ApiResponse<Void>> lock(PessimisticLockingFailureException e) {
        log.warn("Xung đột khoá: {}", e.getMostSpecificCause().getMessage());
        return respond(ErrorCode.CONFLICT, "Hệ thống đang bận xử lý yêu cầu khác trên cùng dữ liệu, vui lòng thử lại", null);
    }

    /** @PreAuthorize thất bại: chưa đăng nhập → 401, đã đăng nhập nhưng sai vai trò → 403. */
    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiResponse<Void>> denied(AccessDeniedException e, HttpServletRequest req) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth instanceof AnonymousAuthenticationToken) {
            Object attr = req.getAttribute(JwtAuthenticationFilter.ERROR_ATTR);
            ErrorCode code = attr instanceof ErrorCode c ? c : ErrorCode.UNAUTHORIZED;
            return respond(code, code == ErrorCode.TOKEN_EXPIRED ? "Phiên đăng nhập đã hết hạn" : "Vui lòng đăng nhập để tiếp tục", null);
        }
        return respond(ErrorCode.ACCESS_DENIED, "Bạn không có quyền thực hiện thao tác này", null);
    }

    @ExceptionHandler({NoResourceFoundException.class})
    ResponseEntity<ApiResponse<Void>> notFound(Exception e) { return respond(ErrorCode.NOT_FOUND, "Không tìm thấy đường dẫn", null); }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ApiResponse<Void>> method(Exception e) { return respond(ErrorCode.BAD_REQUEST, "Phương thức không được hỗ trợ", null); }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiResponse<Void>> unexpected(Exception e) {
        log.error("Lỗi không lường trước", e);
        return respond(ErrorCode.INTERNAL_ERROR, "Hệ thống gặp sự cố, vui lòng thử lại", null);
    }

    private static ResponseEntity<ApiResponse<Void>> respond(ErrorCode code, String msg, List<ApiResponse.FieldError> errors) {
        return ResponseEntity.status(code.httpStatus()).body(ApiResponse.error(code, msg, errors));
    }
}
