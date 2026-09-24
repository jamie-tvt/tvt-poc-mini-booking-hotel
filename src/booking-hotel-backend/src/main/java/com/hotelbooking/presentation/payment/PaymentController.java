package com.hotelbooking.presentation.payment;

import com.hotelbooking.application.payment.PaymentService;
import com.hotelbooking.domain.payment.PaymentStatus;
import com.hotelbooking.infrastructure.security.AuthUser;
import com.hotelbooking.presentation.common.*;
import com.hotelbooking.presentation.common.DtoMapper.View;
import com.hotelbooking.presentation.common.Dtos.PaymentDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class PaymentController {
    public enum MockResult { SUCCESS, FAILED }
    public record MockCompleteRequest(@NotNull MockResult result) {}
    public record ReasonRequest(@Size(max = 255) String reason) {}

    private final PaymentService payments;
    private final DtoMapper map;

    public PaymentController(PaymentService payments, DtoMapper map) {
        this.payments = payments;
        this.map = map;
    }

    /** → PaymentDto có checkoutUrl = {FRONTEND_URL}/pay/mock/{paymentId}?key={accessKey}. */
    @PostMapping("/bookings/code/{code}/payment")
    public ApiResponse<PaymentDto> initiate(@PathVariable String code, @RequestParam(required = false) String key, @AuthenticationPrincipal AuthUser me) {
        var c = payments.initiate(code, key, viewer(me));
        return ApiResponse.ok(map.payment(c.payment(), c.checkoutUrl(), View.GUEST));
    }

    @GetMapping("/payments/{id}")
    public ApiResponse<PaymentDto> get(@PathVariable Long id, @RequestParam(required = false) String key, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.payment(payments.get(id, key, viewer(me)), null, View.GUEST));
    }

    @PostMapping("/payments/mock/{id}/complete")
    public ApiResponse<PaymentDto> mockComplete(@PathVariable Long id, @RequestParam(required = false) String key,
                                                @Valid @RequestBody MockCompleteRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.payment(payments.mockComplete(id, key, viewer(me), r.result() == MockResult.SUCCESS), null, View.GUEST));
    }

    /** Webhook nhận nguyên văn body để kiểm chữ ký trên đúng các byte cổng đã ký. */
    @PostMapping(value = "/payments/webhook/mock", consumes = "application/json")
    public ApiResponse<Map<String, Boolean>> mockWebhook(@RequestBody String raw, @RequestHeader(value = "X-Mock-Signature", required = false) String sig) {
        payments.handleWebhook(raw, sig);
        return ApiResponse.ok(Map.of("received", true));
    }

    @PostMapping(value = "/payments/stripe/webhook")
    public ApiResponse<Map<String, Boolean>> stripeWebhook(@RequestBody String raw, @RequestHeader(value = "Stripe-Signature", required = false) String sig) {
        payments.handleWebhook(raw, sig);
        return ApiResponse.ok(Map.of("received", true));
    }

    @GetMapping("/admin/payments")
    public ApiResponse<PageResponse<PaymentDto>> search(@RequestParam(required = false) PaymentStatus status,
                                                        @RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(PageResponse.of(payments.search(status, Paging.of(page, size)), p -> map.payment(p, null, View.STAFF)));
    }

    /** Admin hoàn 100%. */
    @PostMapping("/admin/payments/{id}/refund")
    public ApiResponse<PaymentDto> refund(@PathVariable Long id, @RequestBody(required = false) @Valid ReasonRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.payment(payments.refund(id, me.id(), r == null ? null : r.reason()), null, View.STAFF), "Đã hoàn tiền", 200);
    }

    private static Long viewer(AuthUser me) { return me == null ? null : me.id(); }
}
