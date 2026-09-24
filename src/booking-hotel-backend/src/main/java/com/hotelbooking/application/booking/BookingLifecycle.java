package com.hotelbooking.application.booking;

import com.hotelbooking.application.inventory.InventoryService;
import com.hotelbooking.application.notification.NotificationService;
import com.hotelbooking.domain.booking.Booking;
import com.hotelbooking.domain.booking.BookingStatus;
import com.hotelbooking.domain.booking.RefundRule;
import com.hotelbooking.domain.inventory.RoomInventory;
import com.hotelbooking.domain.payment.Payment;
import com.hotelbooking.domain.payment.PaymentStatus;
import com.hotelbooking.infrastructure.persistence.jpa.JpaPaymentRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Các bước dùng chung khi huỷ/hết hạn booking. Người gọi PHẢI đã khoá theo thứ tự inventory → booking;
 * lớp này khoá tiếp payment (thứ tự khoá thống nhất: inventory → booking → payment).
 */
@Component
public class BookingLifecycle {
    private final JpaPaymentRepository payments;
    private final NotificationService notifications;

    public BookingLifecycle(JpaPaymentRepository payments, NotificationService notifications) {
        this.payments = payments;
        this.notifications = notifications;
    }

    /** Huỷ booking, trả tồn kho mọi đêm, xử lý tiền theo refundPercent. Trả số tiền hoàn. */
    public long cancel(Booking b, List<RoomInventory> nights, String reason, int refundPercent, Instant now) {
        boolean wasConfirmed = b.getStatus() == BookingStatus.CONFIRMED;
        b.cancel(reason, now);
        InventoryService.release(nights, b.getRoomsCount(), b.getCheckIn());
        long refunded = settlePayments(b, refundPercent, reason);
        String money = !wasConfirmed ? "" : refunded > 0 ? " Số tiền hoàn: " + vnd(refunded) + "." : " Đơn không đủ điều kiện hoàn tiền theo chính sách huỷ.";
        notifyGuest(b, "Đơn " + b.getBookingCode() + " đã huỷ", "Lý do: " + reason + "." + money);
        return refunded;
    }

    public void expire(Booking b, List<RoomInventory> nights, Instant now) {
        b.expire(now);
        InventoryService.release(nights, b.getRoomsCount(), b.getCheckIn());
        settlePayments(b, 100, "Quá hạn thanh toán");
        notifyGuest(b, "Đơn " + b.getBookingCode() + " đã hết hạn",
                "Đơn chưa được thanh toán trong thời gian giữ phòng nên hệ thống đã huỷ và trả phòng.");
    }

    /** Giao dịch PENDING → CANCELLED; giao dịch PAID → hoàn refundPercent%. */
    public long settlePayments(Booking b, int refundPercent, String reason) {
        long refunded = 0;
        for (Payment p : payments.lockByBookingId(b.getId())) {
            if (p.getStatus() == PaymentStatus.PENDING) {
                p.cancel(reason);
            } else if (p.getStatus() == PaymentStatus.PAID && refundPercent > 0) {
                long amount = RefundRule.amount(p.getAmount(), refundPercent);
                p.refund(amount, reason + " — hoàn " + refundPercent + "%");
                refunded += amount;
            }
        }
        return refunded;
    }

    /** Khách vãng lai (userId NULL) không có hộp thông báo — xem trạng thái ở màn đơn. */
    public void notifyGuest(Booking b, String title, String content) {
        if (b.getUserId() != null) notifications.notify(b.getUserId(), b.getId(), title, content);
    }

    public static String vnd(long amount) { return String.format("%,d", amount).replace(',', '.') + " ₫"; }
}
