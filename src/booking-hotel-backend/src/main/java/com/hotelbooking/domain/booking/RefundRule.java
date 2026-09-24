package com.hotelbooking.domain.booking;

import com.hotelbooking.domain.hotel.CancellationPolicy;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * BR-CN-01. FREE_BEFORE_DATE + N: huỷ khi còn ≥ N ngày trước ngày nhận phòng (tính theo lịch VN) → hoàn 100%, sau đó 0%.
 * NON_REFUNDABLE → 0%. (Booking PENDING chưa trả tiền nên huỷ luôn miễn phí — xử lý ở BookingService.)
 */
public final class RefundRule {
    private RefundRule() {}

    public static int percentFor(CancellationPolicy policy, Integer freeCancelDays, LocalDate today, LocalDate checkIn) {
        if (policy == CancellationPolicy.NON_REFUNDABLE) return 0;
        long daysBefore = ChronoUnit.DAYS.between(today, checkIn);
        return daysBefore >= (freeCancelDays == null ? 0 : freeCancelDays) ? 100 : 0;
    }

    public static long amount(long paid, int percent) { return paid * percent / 100; }
}
