package com.hotelbooking.domain.user;

public enum Role {
    CUSTOMER, HOTEL_OWNER, HOTEL_STAFF, ADMIN;

    public boolean isHotelSide() { return this == HOTEL_OWNER || this == HOTEL_STAFF; }
}
