package com.hotelbooking.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.hotelbooking.domain.booking.RefundRule;
import com.hotelbooking.domain.hotel.CancellationPolicy;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** BR-CN-01: FREE_BEFORE_DATE N ngày → huỷ khi còn ≥ N ngày trước ngày nhận phòng hoàn 100%, sau đó 0%. */
class RefundRuleTest {
    private static final LocalDate CHECK_IN = LocalDate.of(2026, 10, 20);

    @ParameterizedTest(name = "còn {0} ngày, miễn phí trước {1} ngày → {2}%")
    @CsvSource({"10,3,100", "3,3,100", "2,3,0", "0,3,0", "1,1,100", "0,1,0", "0,0,100", "7,7,100", "6,7,0"})
    void free_before_date(int daysBefore, int freeDays, int expected) {
        assertThat(RefundRule.percentFor(CancellationPolicy.FREE_BEFORE_DATE, freeDays, CHECK_IN.minusDays(daysBefore), CHECK_IN))
                .isEqualTo(expected);
    }

    @Test
    void non_refundable_is_always_zero() {
        assertThat(RefundRule.percentFor(CancellationPolicy.NON_REFUNDABLE, null, CHECK_IN.minusDays(60), CHECK_IN)).isZero();
    }

    @Test
    void refund_amount_is_integer_vnd() {
        assertThat(RefundRule.amount(2_640_000, 100)).isEqualTo(2_640_000);
        assertThat(RefundRule.amount(2_640_000, 0)).isZero();
    }
}
