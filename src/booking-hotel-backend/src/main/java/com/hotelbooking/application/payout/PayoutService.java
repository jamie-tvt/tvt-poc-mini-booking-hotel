package com.hotelbooking.application.payout;

import com.hotelbooking.application.audit.AuditService;
import com.hotelbooking.application.booking.BookingLifecycle;
import com.hotelbooking.application.hotel.HotelScope;
import com.hotelbooking.application.notification.NotificationService;
import com.hotelbooking.domain.common.BusinessException;
import com.hotelbooking.domain.common.TimeProvider;
import com.hotelbooking.domain.payout.Payout;
import com.hotelbooking.domain.payout.PayoutStatus;
import com.hotelbooking.infrastructure.persistence.jpa.JpaPayoutRepository;
import com.hotelbooking.infrastructure.security.AuthUser;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** FR-PO-004: khoản trả khách sạn (sinh khi check-out) — owner xem, admin đánh dấu đã chuyển. */
@Service
public class PayoutService {
    private final JpaPayoutRepository payouts;
    private final HotelScope scope;
    private final NotificationService notifications;
    private final AuditService audit;
    private final TimeProvider time;

    public PayoutService(JpaPayoutRepository payouts, HotelScope scope, NotificationService notifications, AuditService audit, TimeProvider time) {
        this.payouts = payouts;
        this.scope = scope;
        this.notifications = notifications;
        this.audit = audit;
        this.time = time;
    }

    @Transactional(readOnly = true)
    public Page<Payout> forOwner(AuthUser me, Long hotelId, PayoutStatus status, Pageable pageable) {
        List<Long> ids = hotelId == null ? scope.hotelIds(me) : List.of(scope.ownedHotel(me, hotelId).getId());
        if (ids.isEmpty()) return Page.empty(pageable);
        return payouts.findForHotels(ids, status, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Payout> search(PayoutStatus status, Pageable pageable) { return payouts.search(status, pageable); }

    @Transactional
    public Payout markPaid(Long id, Long adminId) {
        Payout p = payouts.findByIdForUpdate(id).orElseThrow(() -> BusinessException.notFound("khoản trả khách sạn"));
        p.markPaid(adminId, time.now());
        notifications.notify(p.getHotel().getOwnerId(), p.getBooking().getId(), "Đã chuyển tiền đơn " + p.getBooking().getBookingCode(),
                "Nền tảng đã chuyển " + BookingLifecycle.vnd(p.getAmount()) + " cho " + p.getHotel().getName() + ".");
        audit.log(adminId, "PAYOUT_PAID", "payout", id, p.getBooking().getBookingCode());
        return p;
    }
}
