package com.hotelbooking.it;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotelbooking.application.booking.BookingExpiryJob;
import com.hotelbooking.domain.hotel.CancellationPolicy;
import com.hotelbooking.infrastructure.integration.mockgateway.MockPaymentGateway;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class PaymentAndExpiryIT extends IntegrationTestBase {
    @Autowired MockPaymentGateway gateway;
    @Autowired BookingExpiryJob expiryJob;

    @Test
    void webhook_rejects_bad_signature_is_idempotent_and_confirms_booking() {
        var f = newHotel(3, 1_200_000, CancellationPolicy.FREE_BEFORE_DATE, 3, true);
        LocalDate in = today().plusDays(10);
        JsonNode b = book(f.roomType().getId(), in, in.plusDays(2));
        assertThat(b.path("totalAmount").asLong()).isEqualTo(2 * 1_320_000);          // BR-PR-01: 1.200.000 × 1,1
        assertThat(b.path("baseAmount").asLong()).isEqualTo(2 * 1_200_000);
        assertThat(b.path("feeAmount").asLong()).isEqualTo(2 * 120_000);
        String q = "?key=" + b.path("accessKey").asText();
        String code = b.path("bookingCode").asText();

        JsonNode payment = post("/api/v1/bookings/code/" + code + "/payment" + q, null, null).getBody().path("data");
        long paymentId = payment.path("id").asLong();
        assertThat(payment.path("checkoutUrl").asText()).endsWith("/pay/mock/" + paymentId + q);

        String[] signed = gateway.buildSignedEvent(paymentId, payment.path("amount").asLong(), true);
        var forged = postRaw("/api/v1/payments/webhook/mock", signed[0], "X-Mock-Signature", "deadbeef");
        assertThat(forged.getStatusCode().value()).isEqualTo(401);
        assertThat(forged.getBody().path("code").asText()).isEqualTo("INVALID_SIGNATURE");
        assertThat(get("/api/v1/bookings/code/" + code + q, null).getBody().path("data").path("status").asText()).isEqualTo("PENDING");

        assertThat(postRaw("/api/v1/payments/webhook/mock", signed[0], "X-Mock-Signature", signed[1]).getStatusCode().value()).isEqualTo(200);
        // Cổng gửi lại đúng sự kiện đó → 200, không xử lý lần hai
        assertThat(postRaw("/api/v1/payments/webhook/mock", signed[0], "X-Mock-Signature", signed[1]).getStatusCode().value()).isEqualTo(200);

        JsonNode after = get("/api/v1/bookings/code/" + code + q, null).getBody().path("data");
        assertThat(after.path("status").asText()).isEqualTo("CONFIRMED");
        assertThat(after.path("paymentStatus").asText()).isEqualTo("PAID");
        assertThat(after.path("invoice").path("payments").size()).isEqualTo(1);
        assertThat(after.path("invoice").path("amount").asLong()).isEqualTo(2 * 1_320_000);
        assertThat(after.path("refundPreview").path("percent").asInt()).isEqualTo(100);
    }

    @Test
    void unpaid_booking_expires_and_releases_every_night() {
        var f = newHotel(1, 600_000, CancellationPolicy.FREE_BEFORE_DATE, 1, true);
        long rt = f.roomType().getId();
        LocalDate in = today().plusDays(4);
        JsonNode b = book(rt, in, in.plusDays(3));
        for (int i = 0; i < 3; i++) assertThat(booked(rt, in.plusDays(i))).isEqualTo(1);
        assertThat(tryBook(rt, in.plusDays(1), in.plusDays(2)).getStatusCode().value()).isEqualTo(409);

        clock.setOffsetMinutes(16);   // quá hạn giữ phòng 15 phút
        assertThat(expiryJob.run()).isGreaterThanOrEqualTo(1);

        String q = "?key=" + b.path("accessKey").asText();
        JsonNode after = get("/api/v1/bookings/code/" + b.path("bookingCode").asText() + q, null).getBody().path("data");
        assertThat(after.path("status").asText()).isEqualTo("EXPIRED");
        assertThat(after.path("canPay").asBoolean()).isFalse();
        for (int i = 0; i < 3; i++) assertThat(booked(rt, in.plusDays(i))).isZero();
        assertThat(post("/api/v1/bookings/code/" + b.path("bookingCode").asText() + "/payment" + q, null, null).getStatusCode().value()).isEqualTo(422);
        assertThat(tryBook(rt, in.plusDays(1), in.plusDays(2)).getStatusCode().value()).isEqualTo(201);
    }

    @Test
    void guest_cancel_follows_policy_and_returns_inventory() {
        var f = newHotel(2, 1_000_000, CancellationPolicy.FREE_BEFORE_DATE, 3, true);
        long rt = f.roomType().getId();
        // còn 2 ngày < 3 → không hoàn
        JsonNode late = pay(book(rt, today().plusDays(2), today().plusDays(3)));
        assertThat(late.path("refundPreview").path("percent").asInt()).isZero();
        JsonNode lateCancel = post("/api/v1/bookings/code/" + late.path("bookingCode").asText() + "/cancel?key=" + late.path("accessKey").asText(),
                null, "{\"reason\":\"Đổi kế hoạch\"}").getBody().path("data");
        assertThat(lateCancel.path("status").asText()).isEqualTo("CANCELLED");
        assertThat(lateCancel.path("invoice").path("payments").get(0).path("status").asText()).isEqualTo("PAID");
        assertThat(booked(rt, today().plusDays(2))).isZero();

        // còn 5 ngày ≥ 3 → hoàn 100%
        JsonNode early = pay(book(rt, today().plusDays(5), today().plusDays(6)));
        JsonNode earlyCancel = post("/api/v1/bookings/code/" + early.path("bookingCode").asText() + "/cancel?key=" + early.path("accessKey").asText(),
                null, null).getBody().path("data");
        JsonNode p = earlyCancel.path("invoice").path("payments").get(0);
        assertThat(p.path("status").asText()).isEqualTo("REFUNDED");
        assertThat(p.path("refundAmount").asLong()).isEqualTo(1_100_000);
        assertThat(booked(rt, today().plusDays(5))).isZero();
    }
}
