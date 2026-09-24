package com.hotelbooking.domain;

import static org.assertj.core.api.Assertions.*;

import com.hotelbooking.domain.common.BusinessException;
import com.hotelbooking.domain.common.ErrorCode;
import com.hotelbooking.domain.inventory.Pricing;
import com.hotelbooking.domain.inventory.RoomInventory;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** BR-PR-01: giá niêm yết = base × (1 + fee%), làm tròn LÊN bội 1.000đ. */
class PricingTest {

    @ParameterizedTest
    @CsvSource({"1200000,10,1320000", "850000,10,935000", "450000,10,495000", "333333,10,367000", "1000,10,2000",
            "100000,0,100000", "999,0,1000", "1,10,1000", "3200000,12,3584000", "1234567,15,1420000", "0,10,0"})
    void listing_price_rounds_up_to_1000(long base, int fee, long expected) {
        assertThat(Pricing.listingPrice(base, fee)).isEqualTo(expected);
    }

    @Test
    void exact_multiple_is_not_rounded_further() {
        // 900.000 × 1,1 = 990.000 đúng bội 1.000 → giữ nguyên, không nhảy lên 991.000
        assertThat(Pricing.listingPrice(900_000, 10)).isEqualTo(990_000);
    }

    @Test
    void quote_sums_nights_times_rooms_and_splits_base_and_fee() {
        LocalDate d = LocalDate.of(2026, 10, 1);
        var q = Pricing.quote(List.of(Pricing.night(d, 1_200_000, 10), Pricing.night(d.plusDays(1), 1_500_000, 10)), 2);
        assertThat(q.baseAmount()).isEqualTo((1_200_000 + 1_500_000) * 2);
        assertThat(q.totalAmount()).isEqualTo((1_320_000 + 1_650_000) * 2);
        assertThat(q.feeAmount()).isEqualTo(540_000);
        assertThat(q.firstNightListing()).isEqualTo(1_320_000);
    }

    @Test
    void inventory_rejects_overbooking_with_ROOM_UNAVAILABLE_and_price_override_wins() {
        RoomInventory n = new RoomInventory(1L, LocalDate.of(2026, 10, 1), 2);
        n.reserve(2);
        assertThatThrownBy(() -> n.reserve(1)).isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).code()).isEqualTo(ErrorCode.ROOM_UNAVAILABLE));
        assertThatThrownBy(() -> n.changeTotal(1)).isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).code()).isEqualTo(ErrorCode.CONFLICT));
        n.release(1);
        assertThat(n.available()).isEqualTo(1);
        assertThat(n.basePrice(500_000)).isEqualTo(500_000);
        n.setPriceOverride(650_000L);
        assertThat(n.basePrice(500_000)).isEqualTo(650_000);
    }
}
