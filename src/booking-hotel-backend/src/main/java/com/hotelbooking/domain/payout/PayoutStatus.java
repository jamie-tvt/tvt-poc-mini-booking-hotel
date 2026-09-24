package com.hotelbooking.domain.payout;

import com.hotelbooking.domain.common.StateMachine;
import java.util.Map;
import java.util.Set;

/** FR-PO-004: PENDING → PAID (admin đánh dấu đã chuyển khoản). */
public enum PayoutStatus {
    PENDING, PAID;

    public static final StateMachine<PayoutStatus> MACHINE = new StateMachine<>("Khoản trả khách sạn", Map.of(
            PENDING, Set.of(PAID),
            PAID, Set.of()));
}
