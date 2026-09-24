package com.hotelbooking.infrastructure.integration.stripe;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelbooking.application.payment.PaymentGateway;
import com.hotelbooking.domain.booking.Booking;
import com.hotelbooking.domain.common.BusinessException;
import com.hotelbooking.domain.common.ErrorCode;
import com.hotelbooking.domain.payment.Payment;
import com.hotelbooking.domain.payment.PaymentProvider;
import com.hotelbooking.infrastructure.config.AppProperties;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;

/**
 * Stripe Checkout gọi thẳng REST API (không cần SDK). Bật bằng PAYMENT_PROVIDER=stripe + STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET.
 * VND là tiền tệ không có phần lẻ nên unit_amount = số tiền đồng.
 */
@Component
@ConditionalOnProperty(name = "app.payment.provider", havingValue = "stripe")
public class StripePaymentGateway implements PaymentGateway {
    private static final long TOLERANCE_SECONDS = 300;
    private final AppProperties props;
    private final ObjectMapper mapper;
    private final RestClient http;

    public StripePaymentGateway(AppProperties props, ObjectMapper mapper) {
        this.props = props;
        this.mapper = mapper;
        this.http = RestClient.builder().baseUrl("https://api.stripe.com/v1")
                .defaultHeader("Authorization", "Bearer " + props.payment().stripeSecretKey()).build();
    }

    @Override
    public PaymentProvider provider() { return PaymentProvider.STRIPE; }

    @Override
    public String checkoutUrl(Payment payment, Booking booking) {
        var form = new LinkedMultiValueMap<String, String>();
        form.add("mode", "payment");
        form.add("client_reference_id", String.valueOf(payment.getId()));
        form.add("metadata[paymentId]", String.valueOf(payment.getId()));
        form.add("line_items[0][quantity]", "1");
        form.add("line_items[0][price_data][currency]", "vnd");
        form.add("line_items[0][price_data][unit_amount]", String.valueOf(payment.getAmount()));
        form.add("line_items[0][price_data][product_data][name]",
                booking.getHotel().getName() + " — " + booking.getRoomType().getName() + " — " + booking.getBookingCode());
        String page = props.frontendUrl() + "/booking/" + booking.getBookingCode() + "?key=" + booking.getAccessKey();
        form.add("success_url", page + "&paid=1");
        form.add("cancel_url", page);
        JsonNode res = http.post().uri("/checkout/sessions").contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form).retrieve().body(JsonNode.class);
        return res.get("url").asText();
    }

    @Override
    public Optional<GatewayEvent> parseWebhook(String rawBody, String header) {
        verify(rawBody, header);
        try {
            JsonNode event = mapper.readTree(rawBody);
            String type = event.path("type").asText();
            JsonNode s = event.path("data").path("object");
            boolean success = "checkout.session.completed".equals(type) && "paid".equals(s.path("payment_status").asText());
            boolean failed = "checkout.session.async_payment_failed".equals(type) || "checkout.session.expired".equals(type);
            if (!success && !failed) return Optional.empty();
            return Optional.of(new GatewayEvent(s.path("metadata").path("paymentId").asLong(),
                    s.path("payment_intent").asText(s.path("id").asText()), success, s.path("amount_total").asLong(), "STRIPE"));
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Nội dung webhook không đọc được");
        }
    }

    /** Theo tài liệu Stripe: header "t=...,v1=..."; chữ ký = HMAC-SHA256("t.payload", whsec). */
    private void verify(String payload, String header) {
        if (header == null) throw new BusinessException(ErrorCode.INVALID_SIGNATURE, "Thiếu chữ ký Stripe");
        String t = null, v1 = null;
        for (String part : header.split(",")) {
            String[] kv = part.split("=", 2);
            if (kv.length == 2 && kv[0].trim().equals("t")) t = kv[1].trim();
            if (kv.length == 2 && kv[0].trim().equals("v1")) v1 = kv[1].trim();
        }
        if (t == null || v1 == null) throw new BusinessException(ErrorCode.INVALID_SIGNATURE, "Chữ ký Stripe sai định dạng");
        if (Math.abs(Instant.now().getEpochSecond() - Long.parseLong(t)) > TOLERANCE_SECONDS) {
            throw new BusinessException(ErrorCode.INVALID_SIGNATURE, "Chữ ký Stripe đã quá hạn");
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(props.payment().stripeWebhookSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String expected = HexFormat.of().formatHex(mac.doFinal((t + "." + payload).getBytes(StandardCharsets.UTF_8)));
            if (!MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), v1.getBytes(StandardCharsets.UTF_8))) {
                throw new BusinessException(ErrorCode.INVALID_SIGNATURE, "Chữ ký Stripe không hợp lệ");
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
