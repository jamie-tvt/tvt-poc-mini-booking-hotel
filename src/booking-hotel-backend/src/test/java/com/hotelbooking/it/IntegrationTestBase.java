package com.hotelbooking.it;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelbooking.application.hotel.AdminHotelService;
import com.hotelbooking.application.hotel.HotelCommands.HotelCommand;
import com.hotelbooking.application.hotel.HotelCommands.RoomTypeCommand;
import com.hotelbooking.application.hotel.PortalHotelService;
import com.hotelbooking.application.user.UserService;
import com.hotelbooking.domain.common.BusinessDay;
import com.hotelbooking.domain.hotel.CancellationPolicy;
import com.hotelbooking.domain.hotel.Hotel;
import com.hotelbooking.domain.hotel.RoomType;
import com.hotelbooking.domain.user.Role;
import com.hotelbooking.domain.user.User;
import com.hotelbooking.infrastructure.config.OffsetTimeProvider;
import com.hotelbooking.infrastructure.persistence.jpa.JpaRoomInventoryRepository;
import com.hotelbooking.infrastructure.security.AuthUser;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.*;
import org.testcontainers.containers.MySQLContainer;

/** MySQL thật trong Docker, dùng chung cho mọi test integration (khởi động một lần). */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "app.seed-demo=false", "app.jobs.expiry-interval-ms=3600000", "app.demo-tools=true"})
public abstract class IntegrationTestBase {
    @ServiceConnection
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.0").withDatabaseName("booking_hotel");

    static { MYSQL.start(); }

    @Autowired protected TestRestTemplate http;
    @Autowired protected ObjectMapper json;
    @Autowired protected UserService users;
    @Autowired protected PortalHotelService portal;
    @Autowired protected AdminHotelService adminHotels;
    @Autowired protected JpaRoomInventoryRepository inventoryRepo;
    @Autowired protected OffsetTimeProvider clock;

    protected static final String PW = "12345678";
    private static User admin;

    /** Khách sạn + một loại phòng + các phòng, tạo qua đúng service của portal/admin. */
    protected record Fixture(User owner, AuthUser ownerAuth, Hotel hotel, RoomType roomType, List<Long> roomIds) {}

    @AfterEach
    void resetClock() { clock.setOffsetMinutes(0); }

    protected LocalDate today() { return BusinessDay.today(clock); }

    protected User admin() {
        if (admin == null) admin = users.create("Admin IT", "admin-" + UUID.randomUUID() + "@it.test", PW, null, Role.ADMIN, null, null);
        return admin;
    }

    protected User newUser(Role role) { return newUser(role, null); }

    protected User newUser(Role role, Long hotelId) {
        return users.create(role + " IT", role.name().toLowerCase() + "-" + UUID.randomUUID() + "@it.test", PW, "0900000000", role, hotelId, admin().getId());
    }

    protected static AuthUser auth(User u) { return new AuthUser(u.getId(), u.getEmail(), u.getFullName(), u.getRole(), u.getHotelId()); }

    protected Fixture newHotel(int rooms, long basePrice, CancellationPolicy policy, Integer freeDays, boolean approve) {
        return newHotel(newUser(Role.HOTEL_OWNER), "IT-City-" + UUID.randomUUID().toString().substring(0, 8), rooms, basePrice, policy, freeDays, approve);
    }

    protected Fixture newHotel(User owner, String city, int rooms, long basePrice, CancellationPolicy policy, Integer freeDays, boolean approve) {
        AuthUser a = auth(owner);
        Hotel h = portal.createHotel(a, new HotelCommand("Khách sạn IT " + UUID.randomUUID().toString().substring(0, 6), city, "1 Đường Test",
                "Mô tả khách sạn kiểm thử", 3, null, "14:00", "12:00", null));
        if (approve) h = adminHotels.approve(h.getId(), admin().getId());
        RoomType t = portal.createRoomType(a, h.getId(), new RoomTypeCommand("Deluxe IT", "Phòng kiểm thử", 2, "1 giường đôi", 25, basePrice,
                policy, freeDays, null, List.of()));
        List<Long> ids = new java.util.ArrayList<>();
        for (int i = 1; i <= rooms; i++) ids.add(portal.addRoom(a, t.getId(), String.valueOf(100 + i)).room().getId());
        return new Fixture(owner, a, h, t, ids);
    }

    protected String login(User u) {
        JsonNode res = post("/api/v1/auth/login", null, "{\"email\":\"" + u.getEmail() + "\",\"password\":\"" + PW + "\"}").getBody();
        return res.path("data").path("accessToken").asText();
    }

    protected ResponseEntity<JsonNode> post(String path, String token, String body) { return call(HttpMethod.POST, path, token, body); }
    protected ResponseEntity<JsonNode> put(String path, String token, String body) { return call(HttpMethod.PUT, path, token, body); }
    protected ResponseEntity<JsonNode> get(String path, String token) { return call(HttpMethod.GET, path, token, null); }

    protected ResponseEntity<JsonNode> call(HttpMethod method, String path, String token, String body) {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        if (token != null) h.setBearerAuth(token);
        return http.exchange(path, method, new HttpEntity<>(body, h), JsonNode.class);
    }

    protected ResponseEntity<JsonNode> postRaw(String path, String body, String headerName, String headerValue) {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        if (headerName != null) h.set(headerName, headerValue);
        return http.exchange(path, HttpMethod.POST, new HttpEntity<>(body, h), JsonNode.class);
    }

    protected String bookingBody(long roomTypeId, LocalDate in, LocalDate out, int rooms, int guests, String email) {
        return "{\"roomTypeId\":" + roomTypeId + ",\"checkIn\":\"" + in + "\",\"checkOut\":\"" + out + "\",\"roomsCount\":" + rooms
                + ",\"guests\":" + guests + ",\"guestName\":\"Khách IT\",\"guestEmail\":\"" + email + "\",\"guestPhone\":\"0911222333\"}";
    }

    protected ResponseEntity<JsonNode> tryBook(long roomTypeId, LocalDate in, LocalDate out) {
        return post("/api/v1/bookings", null, bookingBody(roomTypeId, in, out, 1, 2, "guest-" + UUID.randomUUID() + "@it.test"));
    }

    /** Đặt phòng như khách vãng lai, trả data (có bookingCode + accessKey). */
    protected JsonNode book(long roomTypeId, LocalDate in, LocalDate out) {
        var res = tryBook(roomTypeId, in, out);
        if (res.getStatusCode().value() != 201) throw new AssertionError("Tạo booking lỗi: " + res.getBody());
        return res.getBody().path("data");
    }

    /** Khởi tạo thanh toán + hoàn tất qua cổng giả lập (đi đúng đường webhook có chữ ký). */
    protected JsonNode pay(JsonNode booking) {
        String q = "?key=" + booking.path("accessKey").asText();
        long paymentId = post("/api/v1/bookings/code/" + booking.path("bookingCode").asText() + "/payment" + q, null, null)
                .getBody().path("data").path("id").asLong();
        post("/api/v1/payments/mock/" + paymentId + "/complete" + q, null, "{\"result\":\"SUCCESS\"}");
        return get("/api/v1/bookings/code/" + booking.path("bookingCode").asText() + q, null).getBody().path("data");
    }

    protected int booked(long roomTypeId, LocalDate night) {
        return inventoryRepo.findRange(List.of(roomTypeId), night, night.plusDays(1)).stream().findFirst().map(i -> i.getBookedRooms()).orElse(0);
    }

    protected int total(long roomTypeId, LocalDate night) {
        return inventoryRepo.findRange(List.of(roomTypeId), night, night.plusDays(1)).stream().findFirst().map(i -> i.getTotalRooms()).orElse(-1);
    }
}
