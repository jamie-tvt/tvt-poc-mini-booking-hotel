package com.hotelbooking.it;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotelbooking.domain.hotel.CancellationPolicy;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

/** Tồn kho theo đêm: khoá mọi đêm FOR UPDATE theo thứ tự ngày → không oversell, không deadlock. */
class InventoryConcurrencyIT extends IntegrationTestBase {

    @Test
    void ten_guests_race_for_the_last_room_over_two_nights_only_one_wins() throws Exception {
        var f = newHotel(1, 800_000, CancellationPolicy.FREE_BEFORE_DATE, 1, true);
        LocalDate in = today().plusDays(5), out = in.plusDays(2);

        ExecutorService pool = Executors.newFixedThreadPool(10);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<ResponseEntity<JsonNode>>> results = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            String email = "race-" + i + "-" + UUID.randomUUID() + "@it.test";
            results.add(pool.submit(() -> {
                go.await();
                return post("/api/v1/bookings", null, bookingBody(f.roomType().getId(), in, out, 1, 2, email));
            }));
        }
        go.countDown();
        List<ResponseEntity<JsonNode>> res = new ArrayList<>();
        for (var r : results) res.add(r.get(60, TimeUnit.SECONDS));
        pool.shutdown();

        assertThat(res).filteredOn(r -> r.getStatusCode().value() == 201).hasSize(1);
        assertThat(res).filteredOn(r -> r.getStatusCode().value() == 409).hasSize(9)
                .allSatisfy(r -> assertThat(r.getBody().path("code").asText()).isEqualTo("ROOM_UNAVAILABLE"));
        for (LocalDate night = in; night.isBefore(out); night = night.plusDays(1)) {
            assertThat(booked(f.roomType().getId(), night)).isEqualTo(1);
            assertThat(total(f.roomType().getId(), night)).isEqualTo(1);
        }
    }

    @Test
    void overlapping_stay_is_blocked_but_back_to_back_stays_are_allowed() {
        var f = newHotel(1, 500_000, CancellationPolicy.FREE_BEFORE_DATE, 1, true);
        long rt = f.roomType().getId();
        LocalDate d = today().plusDays(10);

        assertThat(tryBook(rt, d, d.plusDays(3)).getStatusCode().value()).isEqualTo(201);           // [d, d+3)

        var overlapEnd = tryBook(rt, d.plusDays(2), d.plusDays(4));                                  // giao đêm d+2
        assertThat(overlapEnd.getStatusCode().value()).isEqualTo(409);
        assertThat(overlapEnd.getBody().path("code").asText()).isEqualTo("ROOM_UNAVAILABLE");
        var overlapStart = tryBook(rt, d.minusDays(1), d.plusDays(1));                                // giao đêm d
        assertThat(overlapStart.getStatusCode().value()).isEqualTo(409);
        // Đơn bị từ chối không giữ đêm nào (đêm d-1 vẫn trống)
        assertThat(booked(rt, d.minusDays(1))).isZero();

        assertThat(tryBook(rt, d.plusDays(3), d.plusDays(5)).getStatusCode().value()).isEqualTo(201); // checkIn = checkOut đơn trước
        assertThat(tryBook(rt, d.minusDays(2), d).getStatusCode().value()).isEqualTo(201);           // checkOut = checkIn đơn đầu
        for (int i = -2; i < 5; i++) assertThat(booked(rt, d.plusDays(i))).as("đêm %s", d.plusDays(i)).isEqualTo(1);
    }

    @Test
    void deactivating_a_room_cannot_drop_total_below_booked() {
        var f = newHotel(2, 500_000, CancellationPolicy.FREE_BEFORE_DATE, 1, true);
        long rt = f.roomType().getId();
        LocalDate d = today().plusDays(3);
        book(rt, d, d.plusDays(1));
        book(rt, d, d.plusDays(1));
        String owner = login(f.owner());
        var res = put("/api/v1/portal/rooms/" + f.roomIds().get(0), owner, "{\"roomNumber\":\"101\",\"active\":false}");
        assertThat(res.getStatusCode().value()).isEqualTo(409);
        assertThat(total(rt, d)).isEqualTo(2);

        // Thêm phòng → đêm tương lai tăng tổng, đặt được thêm
        assertThat(post("/api/v1/portal/room-types/" + rt + "/rooms", owner, "{\"roomNumber\":\"103\"}").getStatusCode().value()).isEqualTo(201);
        assertThat(total(rt, d)).isEqualTo(3);
        assertThat(tryBook(rt, d, d.plusDays(1)).getStatusCode().value()).isEqualTo(201);
    }
}
