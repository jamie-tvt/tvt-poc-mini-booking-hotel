package com.hotelbooking.infrastructure.seed;

import static org.assertj.core.api.Assertions.*;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/** Catalog 200 chỗ nghỉ miền Tây: vừa cột DB (V1__init_schema.sql), khoá tiện nghi hợp lệ, ảnh là link CDN Unsplash. */
class MekongCatalogTest {
    private static final Set<String> BUILT_IN_FACILITIES = Set.of("wifi", "air", "tv", "minibar", "safe", "bathtub", "dryer", "breakfast",
            "airport", "pool", "gym", "parking", "elevator");
    private static final Set<String> PROVINCES = Set.of("Cần Thơ", "Hậu Giang", "Sóc Trăng", "Bạc Liêu", "Cà Mau", "Kiên Giang", "An Giang",
            "Đồng Tháp", "Tiền Giang", "Bến Tre", "Vĩnh Long", "Trà Vinh", "Long An");
    private final MekongCatalog catalog = MekongCatalog.load();

    @Test
    void has200HotelsWithUniqueNamesAcrossThirteenProvinces() {
        assertThat(catalog.hotels()).hasSize(200);
        assertThat(catalog.hotels().stream().map(MekongCatalog.HotelRow::name).collect(Collectors.toSet())).hasSize(200);
        assertThat(catalog.hotels().stream().map(MekongCatalog.HotelRow::city).collect(Collectors.toSet())).isEqualTo(PROVINCES);
        assertThat(catalog.hotels()).extracting(MekongCatalog.HotelRow::status).containsOnly("ACTIVE", "PENDING_APPROVAL");
    }

    @Test
    void ownersAreNewDemoAccountsReferencedByHotels() {
        Set<String> emails = catalog.owners().stream().map(MekongCatalog.OwnerRow::email).collect(Collectors.toSet());
        assertThat(emails).hasSize(catalog.owners().size()).allSatisfy(e -> assertThat(e).matches("chunha\\d{2}@example\\.com"));
        assertThat(catalog.hotels()).allSatisfy(h -> assertThat(emails).contains(h.owner()));
    }

    @Test
    void valuesFitDatabaseColumnsAndDomainRules() {
        Set<String> facilityKeys = new HashSet<>(BUILT_IN_FACILITIES);
        catalog.facilities().forEach(f -> {
            facilityKeys.add(f.key());
            assertThat(f.name().length()).isLessThanOrEqualTo(80);
            assertThat(f.icon().length()).isLessThanOrEqualTo(40);
        });
        assertThat(catalog.hotels()).allSatisfy(h -> {
            assertThat(h.name().length()).isLessThanOrEqualTo(160);
            assertThat(h.city().length()).isLessThanOrEqualTo(80);
            assertThat(h.address().length()).isLessThanOrEqualTo(255);
            assertThat(h.phone()).matches("0\\d{9,10}");
            assertThat(h.stars()).isBetween(1, 5);
            assertThat(h.checkIn()).matches("\\d{2}:\\d{2}");
            assertThat(h.roomTypes()).hasSizeBetween(2, 4).allSatisfy(t -> {
                assertThat(t.name().length()).isLessThanOrEqualTo(120);
                assertThat(t.bedInfo().length()).isLessThanOrEqualTo(120);
                assertThat(t.capacity()).isBetween(1, 20);
                assertThat(t.areaM2()).isPositive();
                assertThat(t.basePrice()).isPositive();
                assertThat(t.roomCount()).isPositive();
                if (t.cancellationPolicy().equals("FREE_BEFORE_DATE")) assertThat(t.freeCancelDays()).isBetween(0, 60);
                else assertThat(t.freeCancelDays()).isNull();
                assertThat(facilityKeys).containsAll(t.facilities());
            });
            List<String> rooms = h.roomTypes().stream()
                    .flatMap(t -> Stream.iterate(1, i -> i <= t.roomCount(), i -> i + 1).map(i -> String.valueOf(t.floor() * 100 + i))).toList();
            assertThat(rooms).doesNotHaveDuplicates();
        });
    }

    @Test
    void imagesAreUnsplashCdnLinksWithinColumnSizeAndCredited() {
        Set<String> used = new HashSet<>();
        assertThat(catalog.hotels()).allSatisfy(h -> {
            assertThat(h.images()).hasSizeBetween(3, 6).doesNotHaveDuplicates();
            Stream.concat(h.images().stream(), h.roomTypes().stream().map(MekongCatalog.RoomTypeRow::imageUrl)).forEach(url -> {
                assertThat(url).startsWith("https://images.unsplash.com/photo-").endsWith("?auto=format&fit=crop&w=1200&q=75");
                assertThat(url.length()).isLessThanOrEqualTo(255);
                used.add(url.replaceAll(".*/photo-([0-9]+-[0-9a-f]+)\\?.*", "$1"));
            });
        });
        assertThat(catalog.credits()).containsOnlyKeys(used);
    }
}
