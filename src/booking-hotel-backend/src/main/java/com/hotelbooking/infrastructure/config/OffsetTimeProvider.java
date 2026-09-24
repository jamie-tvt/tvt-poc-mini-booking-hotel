package com.hotelbooking.infrastructure.config;

import com.hotelbooking.domain.common.TimeProvider;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Component;

/** Đồng hồ nghiệp vụ = giờ thật + độ lệch (chỉ đổi được khi bật DEMO_TOOLS). */
@Component
public class OffsetTimeProvider implements TimeProvider {
    private final AtomicLong offsetMinutes = new AtomicLong();

    @Override
    public Instant now() { return Instant.now().plus(Duration.ofMinutes(offsetMinutes.get())); }

    public long offsetMinutes() { return offsetMinutes.get(); }

    public void setOffsetMinutes(long minutes) { offsetMinutes.set(minutes); }
}
