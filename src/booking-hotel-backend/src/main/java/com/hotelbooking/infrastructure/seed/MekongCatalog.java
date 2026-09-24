package com.hotelbooking.infrastructure.seed;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Map;

/**
 * Catalog 200 chỗ nghỉ miền Tây (seed/mekong-catalog.json) — sinh bởi src/seed-catalog/generate.mjs, không sửa tay.
 * Tên cơ sở là hư cấu, địa danh có thật. Bản demo offline (offline-demo/mock/db.ts) đọc CHÍNH file này.
 */
public record MekongCatalog(List<FacilityRow> facilities, List<OwnerRow> owners, List<HotelRow> hotels, Map<String, String> credits) {

    public static final String RESOURCE = "/seed/mekong-catalog.json";

    /** Tiện nghi bổ sung cho chỗ nghỉ dân dã; key dùng trong HotelRow.roomTypes[].facilities. */
    public record FacilityRow(String category, String key, String name, String icon) {}

    public record OwnerRow(String fullName, String email, String phone) {}

    public record HotelRow(String slug, String owner, String kind, String name, String city, String address, int stars, String phone,
                           String checkIn, String checkOut, String status, String description, List<String> images, List<RoomTypeRow> roomTypes) {}

    /** Phòng đánh số theo tầng: floor 1 → 101, 102, … */
    public record RoomTypeRow(String name, String description, int capacity, String bedInfo, int areaM2, long basePrice,
                              String cancellationPolicy, Integer freeCancelDays, String imageUrl, int floor, int roomCount, List<String> facilities) {}

    public static MekongCatalog load() {
        try (InputStream in = MekongCatalog.class.getResourceAsStream(RESOURCE)) {
            if (in == null) throw new IllegalStateException("Thiếu " + RESOURCE);
            return new ObjectMapper().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false).readValue(in, MekongCatalog.class);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
