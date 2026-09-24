package com.hotelbooking.it;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotelbooking.domain.hotel.CancellationPolicy;
import com.hotelbooking.domain.user.Role;
import org.junit.jupiter.api.Test;

/** NFR-SEC-05: owner/staff chỉ thao tác trong khách sạn của mình; ngoài phạm vi → 404, sai vai trò → 403. */
class TenantIsolationIT extends IntegrationTestBase {

    @Test
    void owner_cannot_see_or_touch_another_owners_hotel_or_bookings() {
        var a = newHotel(2, 500_000, CancellationPolicy.FREE_BEFORE_DATE, 1, true);
        var b = newHotel(2, 500_000, CancellationPolicy.FREE_BEFORE_DATE, 1, true);
        JsonNode bookingOfB = pay(book(b.roomType().getId(), today(), today().plusDays(1)));
        long idB = bookingOfB.path("id").asLong();
        String ownerA = login(a.owner());
        String hotelBody = "{\"name\":\"Chiếm quyền\",\"city\":\"X\",\"address\":\"Y\",\"description\":\"Z\",\"starRating\":3,"
                + "\"checkInTime\":\"14:00\",\"checkOutTime\":\"12:00\"}";

        assertThat(get("/api/v1/portal/bookings/" + idB, ownerA).getStatusCode().value()).isEqualTo(404);
        assertThat(post("/api/v1/portal/bookings/" + idB + "/check-in", ownerA, "{\"roomId\":" + b.roomIds().get(0) + "}").getStatusCode().value()).isEqualTo(404);
        assertThat(post("/api/v1/portal/bookings/" + idB + "/check-out", ownerA, null).getStatusCode().value()).isEqualTo(404);
        assertThat(put("/api/v1/portal/hotels/" + b.hotel().getId(), ownerA, hotelBody).getStatusCode().value()).isEqualTo(404);
        assertThat(get("/api/v1/portal/hotels/" + b.hotel().getId() + "/room-types", ownerA).getStatusCode().value()).isEqualTo(404);
        assertThat(put("/api/v1/portal/rooms/" + b.roomIds().get(0), ownerA, "{\"roomNumber\":\"999\",\"active\":false}").getStatusCode().value()).isEqualTo(404);
        assertThat(get("/api/v1/portal/bookings?hotelId=" + b.hotel().getId(), ownerA).getStatusCode().value()).isEqualTo(404);

        JsonNode mine = get("/api/v1/portal/hotels", ownerA).getBody().path("data");
        assertThat(mine.size()).isEqualTo(1);
        assertThat(mine.get(0).path("id").asLong()).isEqualTo(a.hotel().getId());
        JsonNode list = get("/api/v1/portal/bookings", ownerA).getBody().path("data").path("content");
        assertThat(list.findValuesAsText("bookingCode")).doesNotContain(bookingOfB.path("bookingCode").asText());
        // B vẫn thấy đơn của mình
        assertThat(get("/api/v1/portal/bookings/" + idB, login(b.owner())).getStatusCode().value()).isEqualTo(200);
    }

    @Test
    void staff_only_sees_assigned_hotel_and_cannot_use_owner_endpoints() {
        var a = newHotel(1, 500_000, CancellationPolicy.FREE_BEFORE_DATE, 1, true);
        var sibling = newHotel(a.owner(), "IT-Sibling", 1, 500_000, CancellationPolicy.FREE_BEFORE_DATE, 1, true);
        String staff = login(newUser(Role.HOTEL_STAFF, a.hotel().getId()));
        JsonNode siblingBooking = book(sibling.roomType().getId(), today().plusDays(1), today().plusDays(2));

        JsonNode hotels = get("/api/v1/portal/hotels", staff).getBody().path("data");
        assertThat(hotels.size()).isEqualTo(1);
        assertThat(hotels.get(0).path("id").asLong()).isEqualTo(a.hotel().getId());
        assertThat(get("/api/v1/portal/bookings/" + siblingBooking.path("id").asLong(), staff).getStatusCode().value()).isEqualTo(404);
        // Việc của chủ khách sạn → 403
        assertThat(post("/api/v1/portal/hotels", staff, "{}").getStatusCode().value()).isEqualTo(403);
        assertThat(get("/api/v1/portal/payouts", staff).getStatusCode().value()).isEqualTo(403);
        assertThat(get("/api/v1/portal/hotels/" + a.hotel().getId() + "/staff", staff).getStatusCode().value()).isEqualTo(403);
    }

    @Test
    void customer_and_anonymous_are_kept_out_of_portal_and_admin() {
        String customer = login(newUser(Role.CUSTOMER));
        var res = get("/api/v1/portal/hotels", customer);
        assertThat(res.getStatusCode().value()).isEqualTo(403);
        assertThat(res.getBody().path("code").asText()).isEqualTo("ACCESS_DENIED");
        assertThat(get("/api/v1/admin/dashboard", customer).getStatusCode().value()).isEqualTo(403);
        assertThat(get("/api/v1/portal/hotels", null).getStatusCode().value()).isEqualTo(401);
        assertThat(get("/api/v1/admin/dashboard", login(newUser(Role.HOTEL_OWNER))).getStatusCode().value()).isEqualTo(403);
    }
}
