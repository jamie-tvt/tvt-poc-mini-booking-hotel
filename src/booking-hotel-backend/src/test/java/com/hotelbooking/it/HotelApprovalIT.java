package com.hotelbooking.it;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotelbooking.domain.user.Role;
import com.hotelbooking.domain.user.User;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** FR-HTL-002: khách sạn chỉ hiện với khách khi ACTIVE. */
class HotelApprovalIT extends IntegrationTestBase {

    @Test
    void pending_hotel_is_hidden_until_admin_approves() {
        User ownerUser = newUser(Role.HOTEL_OWNER);
        String owner = login(ownerUser);
        String city = "IT-Approve-" + UUID.randomUUID().toString().substring(0, 8);
        JsonNode hotel = post("/api/v1/portal/hotels", owner, "{\"name\":\"Lotus IT\",\"city\":\"" + city + "\",\"address\":\"1 Test\","
                + "\"description\":\"Khách sạn mới\",\"starRating\":3,\"phone\":\"0292123456\",\"checkInTime\":\"14:00\",\"checkOutTime\":\"12:00\"}")
                .getBody().path("data");
        assertThat(hotel.path("status").asText()).isEqualTo("PENDING_APPROVAL");
        long hotelId = hotel.path("id").asLong();
        long rt = post("/api/v1/portal/hotels/" + hotelId + "/room-types", owner, "{\"name\":\"Superior\",\"description\":\"Phòng mới\","
                + "\"capacity\":2,\"bedInfo\":\"1 giường đôi\",\"areaM2\":24,\"basePrice\":600000,\"cancellationPolicy\":\"FREE_BEFORE_DATE\","
                + "\"freeCancelDays\":1,\"facilityIds\":[]}").getBody().path("data").path("id").asLong();
        assertThat(post("/api/v1/portal/room-types/" + rt + "/rooms", owner, "{\"roomNumber\":\"101\"}").getStatusCode().value()).isEqualTo(201);

        String search = "/api/v1/hotels/search?city=" + city + "&checkIn=" + today().plusDays(2) + "&checkOut=" + today().plusDays(4) + "&guests=2";
        assertThat(get(search, null).getBody().path("data").path("totalElements").asLong()).isZero();
        assertThat(get("/api/v1/hotels/" + hotelId, null).getStatusCode().value()).isEqualTo(404);
        assertThat(json.convertValue(get("/api/v1/cities", null).getBody().path("data"), java.util.List.class)).doesNotContain(city);
        // Chưa ACTIVE thì không đặt được
        assertThat(tryBook(rt, today().plusDays(2), today().plusDays(3)).getStatusCode().value()).isEqualTo(422);

        String admin = login(admin());
        JsonNode approved = post("/api/v1/admin/hotels/" + hotelId + "/approve", admin, null).getBody().path("data");
        assertThat(approved.path("status").asText()).isEqualTo("ACTIVE");
        // Duyệt lần 2 → 409
        assertThat(post("/api/v1/admin/hotels/" + hotelId + "/approve", admin, null).getBody().path("code").asText()).isEqualTo("INVALID_TRANSITION");

        JsonNode page = get(search, null).getBody().path("data");
        assertThat(page.path("totalElements").asLong()).isEqualTo(1);
        JsonNode summary = page.path("content").get(0);
        assertThat(summary.path("id").asLong()).isEqualTo(hotelId);
        assertThat(summary.path("fromPrice").asLong()).isEqualTo(660_000);
        assertThat(summary.path("availableRoomTypes").asInt()).isEqualTo(1);
        // 3 khách không vừa 1 phòng sức chứa 2 → không hiện
        assertThat(get(search.replace("guests=2", "guests=3"), null).getBody().path("data").path("totalElements").asLong()).isZero();

        JsonNode detail = get("/api/v1/hotels/" + hotelId + "?checkIn=" + today().plusDays(2) + "&checkOut=" + today().plusDays(4), null)
                .getBody().path("data");
        JsonNode type = detail.path("roomTypes").get(0);
        assertThat(type.path("availableRooms").asInt()).isEqualTo(1);
        assertThat(type.path("nightlyPrices").size()).isEqualTo(2);
        assertThat(type.path("stayTotal").asLong()).isEqualTo(2 * 660_000);

        assertThat(json.convertValue(get("/api/v1/cities", null).getBody().path("data"), java.util.List.class)).contains(city);
        // Tạm ngưng → lại ẩn
        post("/api/v1/admin/hotels/" + hotelId + "/suspend", admin, null);
        assertThat(get(search, null).getBody().path("data").path("totalElements").asLong()).isZero();
    }

    @Test
    void search_rejects_invalid_date_ranges() {
        String base = "/api/v1/hotels/search?checkIn=";
        assertThat(get(base + today().plusDays(3) + "&checkOut=" + today().plusDays(3), null).getStatusCode().value()).isEqualTo(400);
        assertThat(get(base + today().minusDays(1) + "&checkOut=" + today().plusDays(1), null).getStatusCode().value()).isEqualTo(400);
        assertThat(get(base + today() + "&checkOut=" + today().plusDays(31), null).getStatusCode().value()).isEqualTo(400);
        assertThat(get(base + today() + "&checkOut=" + today().plusDays(30), null).getStatusCode().value()).isEqualTo(200);
    }
}
