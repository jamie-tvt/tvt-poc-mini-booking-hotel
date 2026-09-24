package com.hotelbooking.application.payment;

import com.hotelbooking.domain.booking.Booking;
import com.hotelbooking.domain.payment.Payment;
import com.hotelbooking.domain.payment.PaymentProvider;
import java.util.Optional;

/** Cổng thanh toán (port). Bản giả lập và Stripe cùng cài interface này → đổi cổng không sửa nghiệp vụ. */
public interface PaymentGateway {
    PaymentProvider provider();

    /** Trả URL trang thanh toán để chuyển khách tới. */
    String checkoutUrl(Payment payment, Booking booking);

    /** Xác minh chữ ký và đọc sự kiện. Sai chữ ký → BusinessException INVALID_SIGNATURE. Sự kiện không liên quan → empty. */
    Optional<GatewayEvent> parseWebhook(String rawBody, String signatureHeader);

    record GatewayEvent(Long paymentId, String transactionCode, boolean success, long amount, String method) {}
}
