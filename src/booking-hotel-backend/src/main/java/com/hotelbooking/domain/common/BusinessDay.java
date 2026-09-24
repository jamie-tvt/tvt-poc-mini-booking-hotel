package com.hotelbooking.domain.common;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/** Ngày lưu trú tính theo giờ Việt Nam: "hôm nay" của khách sạn không phụ thuộc múi giờ máy chủ (UTC). */
public final class BusinessDay {
    public static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

    private BusinessDay() {}

    public static LocalDate of(Instant instant) { return LocalDate.ofInstant(instant, VN); }

    public static LocalDate today(TimeProvider time) { return of(time.now()); }
}
