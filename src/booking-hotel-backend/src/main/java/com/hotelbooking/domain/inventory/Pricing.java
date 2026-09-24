package com.hotelbooking.domain.inventory;

import java.time.LocalDate;
import java.util.List;

/**
 * BR-PR-01: giá niêm yết/đêm = giá cơ bản × (1 + fee%/100), làm tròn LÊN bội 1.000đ.
 * Tổng = Σ các đêm × số phòng. baseAmount (phần khách sạn) và feeAmount (phí nền tảng) tách riêng.
 * Toàn bộ tính bằng số nguyên (VND không có phần lẻ) → không có sai số dấu phẩy động.
 */
public final class Pricing {
    public static final long ROUND_TO = 1_000;

    private Pricing() {}

    public static long listingPrice(long basePrice, int feePercent) {
        if (basePrice < 0 || feePercent < 0) throw new IllegalArgumentException("Giá và phí không được âm");
        long hundredths = basePrice * (100 + feePercent);           // đơn vị 1/100 đồng
        long unit = 100 * ROUND_TO;
        return -Math.floorDiv(-hundredths, unit) * ROUND_TO;   // chia làm tròn lên (Math.ceilDiv chỉ có từ Java 18)
    }

    public record Night(LocalDate date, long basePrice, long listingPrice) {}

    public record Quote(List<Night> nights, int rooms, long baseAmount, long totalAmount) {
        public long feeAmount() { return totalAmount - baseAmount; }
        public long firstNightListing() { return nights.isEmpty() ? 0 : nights.get(0).listingPrice(); }
    }

    public static Night night(LocalDate date, long basePrice, int feePercent) {
        return new Night(date, basePrice, listingPrice(basePrice, feePercent));
    }

    public static Quote quote(List<Night> nights, int rooms) {
        long base = 0, total = 0;
        for (Night n : nights) {
            base += n.basePrice() * rooms;
            total += n.listingPrice() * rooms;
        }
        return new Quote(List.copyOf(nights), rooms, base, total);
    }
}
