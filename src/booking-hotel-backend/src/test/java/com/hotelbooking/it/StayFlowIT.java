package com.hotelbooking.it;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotelbooking.domain.hotel.CancellationPolicy;
import com.hotelbooking.domain.user.Role;
import com.hotelbooking.domain.user.User;
import org.junit.jupiter.api.Test;

/** FR-BK-006/007 + FR-REV + FR-PO-004: check-in → check-out → payout → đánh giá. */
class StayFlowIT extends IntegrationTestBase {

    @Test
    void check_in_check_out_then_review_once_and_payout_created() {
        var f = newHotel(2, 900_000, CancellationPolicy.FREE_BEFORE_DATE, 1, true);
        User staff = newUser(Role.HOTEL_STAFF, f.hotel().getId());
        String staffToken = login(staff);
        JsonNode b = pay(book(f.roomType().getId(), today(), today().plusDays(2)));
        assertThat(b.path("status").asText()).isEqualTo("CONFIRMED");
        String code = b.path("bookingCode").asText(), key = b.path("accessKey").asText();
        long id = b.path("id").asLong();
        String review = "{\"bookingCode\":\"" + code + "\",\"key\":\"" + key + "\",\"rating\":5,\"content\":\"Phòng sạch, nhân viên rất thân thiện\"}";

        // Đánh giá trước khi trả phòng → 422
        var early = post("/api/v1/reviews", null, review);
        assertThat(early.getStatusCode().value()).isEqualTo(422);
        assertThat(early.getBody().path("code").asText()).isEqualTo("BUSINESS_RULE");

        // Check-out khi chưa check-in → 409 INVALID_TRANSITION
        assertThat(post("/api/v1/portal/bookings/" + id + "/check-out", staffToken, null).getBody().path("code").asText()).isEqualTo("INVALID_TRANSITION");

        long room = f.roomIds().get(0);
        JsonNode in = post("/api/v1/portal/bookings/" + id + "/check-in", staffToken, "{\"roomId\":" + room + "}").getBody().path("data");
        assertThat(in.path("status").asText()).isEqualTo("CHECKED_IN");
        assertThat(in.path("roomNumber").asText()).isEqualTo("101");
        assertThat(in.has("accessKey")).isFalse();                         // portal không thấy key của khách

        // Phòng đang có khách → đơn khác không nhận vào phòng đó được
        JsonNode other = pay(book(f.roomType().getId(), today(), today().plusDays(1)));
        var busy = post("/api/v1/portal/bookings/" + other.path("id").asLong() + "/check-in", staffToken, "{\"roomId\":" + room + "}");
        assertThat(busy.getStatusCode().value()).isEqualTo(409);
        JsonNode rooms = get("/api/v1/portal/room-types/" + f.roomType().getId() + "/rooms", staffToken).getBody().path("data");
        assertThat(rooms.get(0).path("occupied").asBoolean()).isTrue();

        JsonNode out = post("/api/v1/portal/bookings/" + id + "/check-out", staffToken, null).getBody().path("data");
        assertThat(out.path("status").asText()).isEqualTo("CHECKED_OUT");

        // Payout = baseAmount, owner thấy
        JsonNode payouts = get("/api/v1/portal/payouts", login(f.owner())).getBody().path("data").path("content");
        assertThat(payouts.size()).isEqualTo(1);
        assertThat(payouts.get(0).path("bookingCode").asText()).isEqualTo(code);
        assertThat(payouts.get(0).path("amount").asLong()).isEqualTo(b.path("baseAmount").asLong()).isEqualTo(2 * 900_000);
        assertThat(payouts.get(0).path("status").asText()).isEqualTo("PENDING");

        var created = post("/api/v1/reviews", null, review);
        assertThat(created.getStatusCode().value()).isEqualTo(201);
        var again = post("/api/v1/reviews", null, review);
        assertThat(again.getStatusCode().value()).isEqualTo(409);
        assertThat(again.getBody().path("code").asText()).isEqualTo("ALREADY_REVIEWED");

        JsonNode list = get("/api/v1/hotels/" + f.hotel().getId() + "/reviews", null).getBody().path("data").path("content");
        assertThat(list.size()).isEqualTo(1);
        assertThat(list.get(0).path("rating").asInt()).isEqualTo(5);
        JsonNode detail = get("/api/v1/hotels/" + f.hotel().getId(), null).getBody().path("data");
        assertThat(detail.path("ratingAverage").asDouble()).isEqualTo(5.0);
        assertThat(detail.path("ratingCount").asLong()).isEqualTo(1);
    }

    @Test
    void check_in_only_from_arrival_day_and_room_must_match_type() {
        var f = newHotel(1, 700_000, CancellationPolicy.FREE_BEFORE_DATE, 1, true);
        var g = newHotel(f.owner(), "IT-Other", 1, 700_000, CancellationPolicy.FREE_BEFORE_DATE, 1, true);
        String owner = login(f.owner());
        JsonNode tomorrow = pay(book(f.roomType().getId(), today().plusDays(1), today().plusDays(2)));
        var tooEarly = post("/api/v1/portal/bookings/" + tomorrow.path("id").asLong() + "/check-in", owner, "{\"roomId\":" + f.roomIds().get(0) + "}");
        assertThat(tooEarly.getStatusCode().value()).isEqualTo(422);

        JsonNode tonight = pay(book(f.roomType().getId(), today(), today().plusDays(1)));
        var wrongHotelRoom = post("/api/v1/portal/bookings/" + tonight.path("id").asLong() + "/check-in", owner, "{\"roomId\":" + g.roomIds().get(0) + "}");
        assertThat(wrongHotelRoom.getStatusCode().value()).isEqualTo(404);

        // Hôm sau ngày nhận phòng mới được đánh dấu không đến
        assertThat(post("/api/v1/portal/bookings/" + tonight.path("id").asLong() + "/no-show", owner, null).getStatusCode().value()).isEqualTo(422);
        clock.setOffsetMinutes(24 * 60);
        JsonNode noShow = post("/api/v1/portal/bookings/" + tomorrow.path("id").asLong() + "/no-show", owner, null).getBody();
        assertThat(noShow.path("code").asText()).isEqualTo("BUSINESS_RULE");      // hôm nay (đã dời) mới là ngày nhận phòng của đơn này
        assertThat(post("/api/v1/portal/bookings/" + tonight.path("id").asLong() + "/no-show", owner, null).getBody().path("data").path("status").asText())
                .isEqualTo("NO_SHOW");
    }
}
