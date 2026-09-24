package com.hotelbooking.presentation.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.hotelbooking.domain.common.ErrorCode;
import java.time.Instant;
import java.util.List;
import org.slf4j.MDC;

/** Vỏ chuẩn cho mọi response — cùng quy ước với POC Tour (hợp đồng §1). */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record ApiResponse<T>(boolean success, int status, String code, String message, String requestId,
                             Instant timestamp, T data, List<FieldError> errors) {

    public record FieldError(String field, String message) {}

    public static <T> ApiResponse<T> ok(T data) { return ok(data, "OK", 200); }

    public static <T> ApiResponse<T> ok(T data, String message, int status) {
        return new ApiResponse<>(true, status, "SUCCESS", message, MDC.get("requestId"), Instant.now(), data, null);
    }

    public static <T> ApiResponse<T> error(ErrorCode code, String message, List<FieldError> errors) {
        return new ApiResponse<>(false, code.httpStatus(), code.name(), message, MDC.get("requestId"), Instant.now(), null, errors);
    }
}
