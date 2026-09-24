package com.hotelbooking.application.payment;

import com.hotelbooking.application.audit.AuditService;
import com.hotelbooking.application.booking.BookingLifecycle;
import com.hotelbooking.application.inventory.InventoryService;
import com.hotelbooking.application.notification.NotificationService;
import com.hotelbooking.application.payment.PaymentGateway.GatewayEvent;
import com.hotelbooking.domain.booking.Booking;
import com.hotelbooking.domain.booking.BookingRef;
import com.hotelbooking.domain.booking.BookingStatus;
import com.hotelbooking.domain.common.BusinessException;
import com.hotelbooking.domain.common.ErrorCode;
import com.hotelbooking.domain.common.TimeProvider;
import com.hotelbooking.domain.inventory.RoomInventory;
import com.hotelbooking.domain.payment.*;
import com.hotelbooking.infrastructure.integration.mockgateway.MockPaymentGateway;
import com.hotelbooking.infrastructure.persistence.jpa.JpaBookingRepository;
import com.hotelbooking.infrastructure.persistence.jpa.JpaInvoiceRepository;
import com.hotelbooking.infrastructure.persistence.jpa.JpaPaymentRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Thanh toán. Trạng thái chỉ đổi qua webhook đã xác minh chữ ký, không bao giờ tin redirect của trình duyệt.
 * Khoá: (inventory →) booking → payment. Kiểm quyền bằng BookingRef (projection) để entity được nạp lần đầu bằng FOR UPDATE.
 */
@Service
public class PaymentService {
    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);
    public record Checkout(Payment payment, String checkoutUrl) {}

    private final JpaPaymentRepository payments;
    private final JpaInvoiceRepository invoices;
    private final JpaBookingRepository bookings;
    private final InventoryService inventory;
    private final BookingLifecycle lifecycle;
    private final PaymentGateway gateway;
    private final ObjectProvider<MockPaymentGateway> mockGateway;
    private final NotificationService notifications;
    private final AuditService audit;
    private final TimeProvider time;

    public PaymentService(JpaPaymentRepository payments, JpaInvoiceRepository invoices, JpaBookingRepository bookings, InventoryService inventory,
                          BookingLifecycle lifecycle, PaymentGateway gateway, ObjectProvider<MockPaymentGateway> mockGateway,
                          NotificationService notifications, AuditService audit, TimeProvider time) {
        this.payments = payments;
        this.invoices = invoices;
        this.bookings = bookings;
        this.inventory = inventory;
        this.lifecycle = lifecycle;
        this.gateway = gateway;
        this.mockGateway = mockGateway;
        this.notifications = notifications;
        this.audit = audit;
        this.time = time;
    }

    @Transactional
    public Checkout initiate(String code, String key, Long viewerId) {
        BookingRef ref = bookings.findRefByCode(code == null ? "" : code.trim().toUpperCase()).filter(r -> r.accessibleBy(key, viewerId))
                .orElseThrow(() -> BusinessException.notFound("đơn đặt phòng"));
        Booking b = bookings.findByIdForUpdate(ref.id()).orElseThrow();
        if (b.getStatus() != BookingStatus.PENDING) throw BusinessException.rule("Đơn này không ở trạng thái chờ thanh toán");
        if (b.isPaymentOverdue(time.now())) throw BusinessException.rule("Đơn đã quá hạn thanh toán, vui lòng đặt lại");
        Invoice invoice = invoices.findByBookingId(b.getId()).orElseThrow();
        Payment p = payments.lockByBookingId(b.getId()).stream()
                .filter(x -> x.getStatus() == PaymentStatus.PENDING && x.getProvider() == gateway.provider())
                .findFirst()
                .orElseGet(() -> payments.save(new Payment(invoice, gateway.provider(), time.now())));
        audit.log(viewerId, "INITIATE", "payment", p.getId(), b.getBookingCode());
        return new Checkout(p, gateway.checkoutUrl(p, b));
    }

    /** Trang "cổng giả lập" gọi: tự ký rồi đi đúng đường webhook như cổng thật. */
    @Transactional
    public Payment mockComplete(Long paymentId, String key, Long viewerId, boolean success) {
        MockPaymentGateway mock = mockGateway.getIfAvailable();
        if (mock == null) throw BusinessException.rule("Cổng giả lập đang tắt");
        bookings.findRefByPayment(paymentId).filter(r -> r.accessibleBy(key, viewerId))
                .orElseThrow(() -> BusinessException.notFound("thanh toán"));
        Long amount = payments.findAmount(paymentId);
        String[] signed = mock.buildSignedEvent(paymentId, amount, success);
        handleWebhook(signed[0], signed[1]);
        return payments.findById(paymentId).orElseThrow();
    }

    @Transactional
    public void handleWebhook(String rawBody, String signature) {
        Optional<GatewayEvent> event = gateway.parseWebhook(rawBody, signature);
        event.ifPresent(this::apply);
    }

    private void apply(GatewayEvent e) {
        Instant now = time.now();
        // Idempotent: mã giao dịch đã ghi nhận → bỏ qua (cổng thường gửi lại webhook nhiều lần). UNIQUE ở DB là lớp chặn cuối.
        if (payments.existsByTransactionCode(e.transactionCode())) {
            log.info("Webhook trùng transactionCode={} — bỏ qua", e.transactionCode());
            return;
        }
        BookingRef ref = bookings.findRefByPayment(e.paymentId()).orElseThrow(() -> BusinessException.notFound("thanh toán"));
        Booking b = bookings.findByIdForUpdate(ref.id()).orElseThrow();
        Payment p = payments.findByIdForUpdate(e.paymentId()).orElseThrow();
        if (p.getStatus() != PaymentStatus.PENDING) {
            log.warn("Webhook cho payment {} ở trạng thái {} — bỏ qua", p.getId(), p.getStatus());
            return;
        }
        if (!e.success()) {
            p.markFailed(e.transactionCode(), "Cổng thanh toán báo thất bại");
            lifecycle.notifyGuest(b, "Thanh toán chưa thành công",
                    "Giao dịch cho đơn " + b.getBookingCode() + " thất bại. Bạn có thể thanh toán lại trước khi hết thời gian giữ phòng.");
            audit.log(null, "PAYMENT_FAILED", "payment", p.getId(), e.transactionCode());
            return;
        }
        if (e.amount() != p.getAmount()) {
            p.markFailed(e.transactionCode(), "Số tiền cổng báo (" + e.amount() + ") khác hoá đơn");
            audit.log(null, "PAYMENT_AMOUNT_MISMATCH", "payment", p.getId(), e.transactionCode());
            return;
        }
        p.markPaid(e.transactionCode(), e.amount(), e.method(), now);
        if (b.getStatus() == BookingStatus.PENDING) {
            b.confirm();
            lifecycle.notifyGuest(b, "Đặt phòng thành công " + b.getBookingCode(),
                    "Đã nhận " + BookingLifecycle.vnd(p.getAmount()) + ". Hẹn gặp bạn tại " + b.getHotel().getName() + " ngày " + b.getCheckIn() + "!");
            notifications.notify(b.getHotel().getOwnerId(), b.getId(), "Đơn mới " + b.getBookingCode(),
                    b.getGuestName() + " đặt " + b.getRoomsCount() + " phòng " + b.getRoomType().getName() + ", nhận phòng " + b.getCheckIn() + ".");
            audit.log(null, "PAYMENT_PAID", "payment", p.getId(), e.transactionCode());
        } else {
            // Tiền về sau khi đơn đã hết hạn/huỷ (tồn kho đã trả): không giữ tiền của khách
            p.refund(p.getAmount(), "Nhận tiền khi đơn đã " + b.getStatus() + " — hoàn tự động");
            lifecycle.notifyGuest(b, "Đơn " + b.getBookingCode() + " đã hết hiệu lực",
                    "Hệ thống nhận được tiền sau khi đơn hết hạn nên đã hoàn lại toàn bộ.");
            audit.log(null, "PAYMENT_LATE_REFUND", "payment", p.getId(), e.transactionCode());
        }
    }

    // ---------------------------------------------------------------- admin
    /** Admin hoàn 100%; đơn còn CONFIRMED thì huỷ và trả tồn kho. Khoá: inventory → booking → payment. */
    @Transactional
    public Payment refund(Long paymentId, Long adminId, String reason) {
        BookingRef ref = bookings.findRefByPayment(paymentId).orElseThrow(() -> BusinessException.notFound("thanh toán"));
        List<RoomInventory> nights = inventory.lockNights(ref.roomTypeId(), ref.checkIn(), ref.checkOut());
        Booking b = bookings.findByIdForUpdate(ref.id()).orElseThrow();
        Payment p = payments.findByIdForUpdate(paymentId).orElseThrow();
        if (p.getStatus() != PaymentStatus.PAID) throw new BusinessException(ErrorCode.INVALID_TRANSITION, "Chỉ hoàn được giao dịch đã thanh toán");
        String why = reason == null || reason.isBlank() ? "Quản trị viên hoàn tiền" : reason.trim();
        if (b.getStatus() == BookingStatus.CONFIRMED) {
            b.cancel(why, time.now());
            InventoryService.release(nights, b.getRoomsCount(), b.getCheckIn());
        }
        p.refund(p.getAmount(), why);
        lifecycle.notifyGuest(b, "Hoàn tiền đơn " + b.getBookingCode(), "Đã hoàn " + BookingLifecycle.vnd(p.getAmount()) + ". " + why);
        audit.log(adminId, "REFUND", "payment", paymentId, why);
        return p;
    }

    @Transactional(readOnly = true)
    public Payment get(Long id, String key, Long viewerId) {
        bookings.findRefByPayment(id).filter(r -> r.accessibleBy(key, viewerId)).orElseThrow(() -> BusinessException.notFound("thanh toán"));
        return payments.findById(id).orElseThrow();
    }

    @Transactional(readOnly = true)
    public Page<Payment> search(PaymentStatus status, Pageable pageable) { return payments.search(status, pageable); }

    @Transactional(readOnly = true)
    public Optional<Invoice> invoice(Long bookingId) { return invoices.findByBookingId(bookingId); }

    @Transactional(readOnly = true)
    public List<Payment> forBooking(Long bookingId) { return payments.findByBookingId(bookingId); }
}
