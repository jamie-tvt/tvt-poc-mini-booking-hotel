package com.hotelbooking.infrastructure.integration.mockgateway;

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
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Cổng thanh toán giả lập cho demo và test. Hành xử như cổng thật: trang thanh toán riêng,
 * kết quả gửi về qua webhook có chữ ký HMAC-SHA256 (header X-Mock-Signature).
 */
@Component
@ConditionalOnProperty(name = "app.payment.provider", havingValue = "mock", matchIfMissing = true)
public class MockPaymentGateway implements PaymentGateway {
    private final AppProperties props;
    private final ObjectMapper mapper;

    public MockPaymentGateway(AppProperties props, ObjectMapper mapper) {
        this.props = props;
        this.mapper = mapper;
    }

    @Override
    public PaymentProvider provider() { return PaymentProvider.MOCK; }

    @Override
    public String checkoutUrl(Payment payment, Booking booking) {
        return checkoutUrl(props.frontendUrl(), payment.getId(), booking.getAccessKey());
    }

    /** {FRONTEND_URL}/pay/mock/{paymentId}?key={accessKey} — khách vãng lai mở được mà không cần đăng nhập. */
    public static String checkoutUrl(String frontendUrl, Long paymentId, String accessKey) {
        return frontendUrl + "/pay/mock/" + paymentId + "?key=" + accessKey;
    }

    /** Dựng body + chữ ký như cổng thật sẽ gửi (trang giả lập gọi qua PaymentService.mockComplete). */
    public String[] buildSignedEvent(Long paymentId, long amount, boolean success) {
        try {
            String body = mapper.writeValueAsString(Map.of(
                    "eventId", UUID.randomUUID().toString(), "paymentId", paymentId,
                    "transactionCode", "MOCK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                    "result", success ? "SUCCESS" : "FAILED", "amount", amount));
            return new String[] {body, sign(body)};
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public String sign(String body) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(props.payment().mockSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @Override
    public Optional<GatewayEvent> parseWebhook(String rawBody, String signature) {
        if (signature == null || !MessageDigest.isEqual(sign(rawBody).getBytes(StandardCharsets.UTF_8),
                signature.trim().toLowerCase().getBytes(StandardCharsets.UTF_8))) {
            throw new BusinessException(ErrorCode.INVALID_SIGNATURE, "Chữ ký webhook không hợp lệ");
        }
        try {
            JsonNode n = mapper.readTree(rawBody);
            return Optional.of(new GatewayEvent(n.get("paymentId").asLong(), n.get("transactionCode").asText(),
                    "SUCCESS".equals(n.get("result").asText()), n.get("amount").asLong(), "MOCK_CARD"));
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Nội dung webhook không đọc được");
        }
    }
}
