package com.hotelbooking.domain.booking;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;

/**
 * Ảnh chụp nhẹ của booking (projection, KHÔNG phải entity) dùng để kiểm quyền và biết cần khoá đêm nào
 * trước khi khoá. Không nạp entity trước khi khoá → sau SELECT ... FOR UPDATE luôn có trạng thái mới nhất
 * (Hibernate trả lại instance đã có trong persistence context mà không làm mới).
 */
public record BookingRef(Long id, String bookingCode, String accessKey, Long userId, Long hotelId, Long roomTypeId,
                         LocalDate checkIn, LocalDate checkOut, String guestEmail) {

    public boolean keyMatches(String key) {
        return key != null && MessageDigest.isEqual(accessKey.getBytes(StandardCharsets.UTF_8), key.getBytes(StandardCharsets.UTF_8));
    }

    /** Khách có key, hoặc chủ đơn đang đăng nhập. */
    public boolean accessibleBy(String key, Long viewerId) {
        return keyMatches(key) || (userId != null && userId.equals(viewerId));
    }
}
