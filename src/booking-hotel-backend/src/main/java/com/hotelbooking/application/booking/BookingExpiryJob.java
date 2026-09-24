package com.hotelbooking.application.booking;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Quét booking PENDING quá hạn thanh toán → EXPIRED và trả tồn kho. Một booking một giao dịch. */
@Component
public class BookingExpiryJob {
    private static final Logger log = LoggerFactory.getLogger(BookingExpiryJob.class);
    private final BookingService bookings;

    public BookingExpiryJob(BookingService bookings) { this.bookings = bookings; }

    @Scheduled(fixedDelayString = "${app.jobs.expiry-interval-ms:30000}", initialDelay = 10000)
    public void scheduled() { run(); }

    public int run() {
        int n = 0;
        for (Long id : bookings.overdueIds()) {
            try {
                if (bookings.expireOne(id)) n++;
            } catch (RuntimeException e) {
                log.warn("Không huỷ được booking {}: {}", id, e.getMessage());
            }
        }
        return n;
    }
}
