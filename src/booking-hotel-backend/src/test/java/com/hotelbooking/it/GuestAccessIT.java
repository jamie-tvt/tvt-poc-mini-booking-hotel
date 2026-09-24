package com.hotelbooking.it;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotelbooking.domain.hotel.CancellationPolicy;
import com.hotelbooking.domain.user.Role;
import com.hotelbooking.domain.user.User;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** Guest checkout: mọi thao tác trên booking dùng code + accessKey; tra cứu lại bằng code + email (FR-BK-005). */
class GuestAccessIT extends IntegrationTestBase {

    @Test
    void lookup_needs_matching_code_and_email_and_access_needs_the_key() {
        var f = newHotel(2, 500_000, CancellationPolicy.FREE_BEFORE_DATE, 1, true);
        String email = "Guest-" + UUID.randomUUID() + "@IT.test";
        JsonNode b = post("/api/v1/bookings", null, bookingBody(f.roomType().getId(), today().plusDays(3), today().plusDays(4), 1, 2, email))
                .getBody().path("data");
        String code = b.path("bookingCode").asText(), key = b.path("accessKey").asText();
        assertThat(code).matches("HB-[2-9A-HJ-NP-Z]{6}");
        assertThat(key).hasSize(24);

        var wrongEmail = post("/api/v1/bookings/lookup", null, "{\"bookingCode\":\"" + code + "\",\"email\":\"other@it.test\"}");
        assertThat(wrongEmail.getStatusCode().value()).isEqualTo(404);
        var wrongCode = post("/api/v1/bookings/lookup", null, "{\"bookingCode\":\"HB-XXXXXX\",\"email\":\"" + email + "\"}");
        assertThat(wrongCode.getStatusCode().value()).isEqualTo(404);
        var ok = post("/api/v1/bookings/lookup", null, "{\"bookingCode\":\"" + code.toLowerCase() + "\",\"email\":\"" + email.toLowerCase() + "\"}");
        assertThat(ok.getStatusCode().value()).isEqualTo(200);
        assertThat(ok.getBody().path("data").path("accessKey").asText()).isEqualTo(key);

        assertThat(get("/api/v1/bookings/code/" + code + "?key=wrong-key-000000000000000", null).getStatusCode().value()).isEqualTo(404);
        assertThat(get("/api/v1/bookings/code/" + code, null).getStatusCode().value()).isEqualTo(404);
        assertThat(post("/api/v1/bookings/code/" + code + "/cancel?key=nope", null, null).getStatusCode().value()).isEqualTo(404);
        assertThat(post("/api/v1/bookings/code/" + code + "/payment?key=nope", null, null).getStatusCode().value()).isEqualTo(404);
        JsonNode viaKey = get("/api/v1/bookings/code/" + code + "?key=" + key, null).getBody().path("data");
        assertThat(viaKey.path("status").asText()).isEqualTo("PENDING");
        assertThat(viaKey.path("canPay").asBoolean()).isTrue();
    }

    @Test
    void logged_in_customer_booking_shows_in_my_bookings_with_access_key() {
        var f = newHotel(2, 500_000, CancellationPolicy.NON_REFUNDABLE, null, true);
        User customer = newUser(Role.CUSTOMER);
        String token = login(customer);
        JsonNode b = post("/api/v1/bookings", token, bookingBody(f.roomType().getId(), today().plusDays(1), today().plusDays(2), 1, 2, customer.getEmail()))
                .getBody().path("data");
        JsonNode mine = get("/api/v1/users/me/bookings", token).getBody().path("data").path("content");
        assertThat(mine.size()).isEqualTo(1);
        assertThat(mine.get(0).path("bookingCode").asText()).isEqualTo(b.path("bookingCode").asText());
        assertThat(mine.get(0).path("accessKey").asText()).isEqualTo(b.path("accessKey").asText());
        assertThat(mine.get(0).path("cancellationPolicy").asText()).isEqualTo("NON_REFUNDABLE");
        // Chủ đơn đăng nhập mở được đơn không cần key
        assertThat(get("/api/v1/bookings/code/" + b.path("bookingCode").asText(), token).getStatusCode().value()).isEqualTo(200);
        // 3 khách cho 1 phòng sức chứa 2 → 422
        var tooMany = post("/api/v1/bookings", token, bookingBody(f.roomType().getId(), today().plusDays(1), today().plusDays(2), 1, 3, customer.getEmail()));
        assertThat(tooMany.getStatusCode().value()).isEqualTo(422);
    }
}
