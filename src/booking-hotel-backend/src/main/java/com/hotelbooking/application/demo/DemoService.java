package com.hotelbooking.application.demo;

import com.hotelbooking.application.audit.AuditService;
import com.hotelbooking.application.booking.BookingExpiryJob;
import com.hotelbooking.domain.common.BusinessException;
import com.hotelbooking.infrastructure.config.AppProperties;
import com.hotelbooking.infrastructure.config.OffsetTimeProvider;
import java.time.Instant;
import org.springframework.stereotype.Service;

/** Công cụ demo: dời đồng hồ nghiệp vụ để trình diễn hết hạn thanh toán, mốc hoàn tiền, ngày nhận phòng. */
@Service
public class DemoService {
    public record Clock(Instant now, long offsetMinutes) {}

    private final OffsetTimeProvider clock;
    private final BookingExpiryJob expiryJob;
    private final AuditService audit;
    private final boolean enabled;

    public DemoService(OffsetTimeProvider clock, BookingExpiryJob expiryJob, AuditService audit, AppProperties props) {
        this.clock = clock;
        this.expiryJob = expiryJob;
        this.audit = audit;
        this.enabled = props.demoTools();
    }

    public Clock get() {
        assertEnabled();
        return new Clock(clock.now(), clock.offsetMinutes());
    }

    public Clock set(long offsetMinutes, Long actorId) {
        assertEnabled();
        if (offsetMinutes < 0 || offsetMinutes > 60L * 24 * 60) throw BusinessException.rule("Chỉ dời tới tối đa 60 ngày về phía trước");
        clock.setOffsetMinutes(offsetMinutes);
        audit.log(actorId, "TIME_TRAVEL", "system", null, "offset=" + offsetMinutes + " phút");
        return get();
    }

    public int expireNow() {
        assertEnabled();
        return expiryJob.run();
    }

    private void assertEnabled() {
        if (!enabled) throw BusinessException.notFound("công cụ demo");
    }
}
