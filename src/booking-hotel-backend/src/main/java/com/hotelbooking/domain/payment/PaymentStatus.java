package com.hotelbooking.domain.payment;

import com.hotelbooking.domain.common.StateMachine;
import java.util.Map;
import java.util.Set;

/** Trạng thái giao dịch — PAID chỉ đi tiếp được sang REFUNDED. */
public enum PaymentStatus {
    PENDING, PAID, FAILED, REFUNDED, CANCELLED;

    public static final StateMachine<PaymentStatus> MACHINE = new StateMachine<>("Thanh toán", Map.of(
            PENDING, Set.of(PAID, FAILED, CANCELLED),
            PAID, Set.of(REFUNDED),       // giao dịch thành công không được đổi thành thất bại
            FAILED, Set.of(),
            REFUNDED, Set.of(),
            CANCELLED, Set.of()));
}
