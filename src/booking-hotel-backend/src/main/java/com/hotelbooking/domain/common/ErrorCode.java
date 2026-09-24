package com.hotelbooking.domain.common;

/** Mã lỗi nghiệp vụ trả về trong ApiResponse.code — khớp docs/technical/api-contracts.md §1. */
public enum ErrorCode {
    BAD_REQUEST(400), VALIDATION_FAILED(400),
    UNAUTHORIZED(401), INVALID_CREDENTIALS(401), TOKEN_EXPIRED(401), INVALID_REFRESH_TOKEN(401), INVALID_SIGNATURE(401),
    ACCESS_DENIED(403), ACCOUNT_DISABLED(403),
    NOT_FOUND(404),
    CONFLICT(409), ROOM_UNAVAILABLE(409), INVALID_TRANSITION(409), EMAIL_EXISTS(409), ALREADY_REVIEWED(409),
    BUSINESS_RULE(422),
    INTERNAL_ERROR(500);

    private final int httpStatus;

    ErrorCode(int httpStatus) { this.httpStatus = httpStatus; }

    public int httpStatus() { return httpStatus; }
}
