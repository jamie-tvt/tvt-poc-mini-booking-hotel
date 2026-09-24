package com.hotelbooking.domain.booking;

import com.hotelbooking.domain.common.StateMachine;
import java.util.Map;
import java.util.Set;

/** PENDING → CONFIRMED → CHECKED_IN → CHECKED_OUT; nhánh PENDING → CANCELLED|EXPIRED, CONFIRMED → CANCELLED|NO_SHOW. */
public enum BookingStatus {
    PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED, EXPIRED, NO_SHOW;

    public static final StateMachine<BookingStatus> MACHINE = new StateMachine<>("Đơn đặt phòng", Map.of(
            PENDING, Set.of(CONFIRMED, CANCELLED, EXPIRED),
            CONFIRMED, Set.of(CHECKED_IN, CANCELLED, NO_SHOW),
            CHECKED_IN, Set.of(CHECKED_OUT),
            CHECKED_OUT, Set.of(),
            CANCELLED, Set.of(),
            EXPIRED, Set.of(),
            NO_SHOW, Set.of()));

    /** Trạng thái đang giữ phòng trong room_inventory. */
    public boolean holdsRooms() { return this == PENDING || this == CONFIRMED || this == CHECKED_IN; }
}
