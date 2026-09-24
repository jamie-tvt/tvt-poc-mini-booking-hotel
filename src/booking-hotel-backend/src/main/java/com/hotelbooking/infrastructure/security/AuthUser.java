package com.hotelbooking.infrastructure.security;

import com.hotelbooking.domain.user.Role;

/** Principal trong SecurityContext. hotelId chỉ có với HOTEL_STAFF. */
public record AuthUser(Long id, String email, String fullName, Role role, Long hotelId) {
    public boolean is(Role r) { return role == r; }
}
