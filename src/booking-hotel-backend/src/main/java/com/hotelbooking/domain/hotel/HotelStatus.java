package com.hotelbooking.domain.hotel;

import com.hotelbooking.domain.common.StateMachine;
import java.util.Map;
import java.util.Set;

/** FR-HTL-002: chỉ ACTIVE mới hiện với khách. REJECTED sửa hồ sơ xong tự về PENDING_APPROVAL. */
public enum HotelStatus {
    PENDING_APPROVAL, ACTIVE, REJECTED, SUSPENDED;

    public static final StateMachine<HotelStatus> MACHINE = new StateMachine<>("Khách sạn", Map.of(
            PENDING_APPROVAL, Set.of(ACTIVE, REJECTED),
            ACTIVE, Set.of(SUSPENDED),
            SUSPENDED, Set.of(ACTIVE),
            REJECTED, Set.of(PENDING_APPROVAL)));
}
