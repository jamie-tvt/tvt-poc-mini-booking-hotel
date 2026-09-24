package com.hotelbooking.application.hotel;

import com.hotelbooking.application.hotel.HotelOffer.RoomTypeOffer;
import com.hotelbooking.application.systemsetting.SettingService;
import com.hotelbooking.domain.common.BusinessDay;
import com.hotelbooking.domain.common.BusinessException;
import com.hotelbooking.domain.common.TimeProvider;
import com.hotelbooking.domain.hotel.*;
import com.hotelbooking.domain.inventory.Pricing;
import com.hotelbooking.domain.inventory.RoomInventory;
import com.hotelbooking.domain.review.Review;
import com.hotelbooking.domain.review.ReviewStatus;
import com.hotelbooking.infrastructure.persistence.jpa.*;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Tìm kiếm & xem khách sạn (FR-SRC-001..003). Tính trên room_inventory cho MỌI đêm của khoảng tìm:
 * đêm chưa có dòng tồn kho = còn nguyên số phòng active, giá cơ bản của loại phòng.
 * Chỉ đọc (không INSERT dòng tồn kho) — dòng chỉ được tạo khi đặt phòng thật.
 */
@Service
public class CatalogService {
    public record SearchFilter(String city, Long minPrice, Long maxPrice, Set<Integer> stars, Set<Long> facilityIds, String sort) {}

    private final JpaHotelRepository hotels;
    private final JpaHotelImageRepository images;
    private final JpaRoomTypeRepository roomTypes;
    private final JpaRoomRepository rooms;
    private final JpaRoomInventoryRepository inventory;
    private final JpaReviewRepository reviews;
    private final JpaFacilityCategoryRepository categories;
    private final JpaFacilityRepository facilities;
    private final SettingService settings;
    private final TimeProvider time;

    public CatalogService(JpaHotelRepository hotels, JpaHotelImageRepository images, JpaRoomTypeRepository roomTypes, JpaRoomRepository rooms,
                          JpaRoomInventoryRepository inventory, JpaReviewRepository reviews, JpaFacilityCategoryRepository categories,
                          JpaFacilityRepository facilities, SettingService settings, TimeProvider time) {
        this.hotels = hotels;
        this.images = images;
        this.roomTypes = roomTypes;
        this.rooms = rooms;
        this.inventory = inventory;
        this.reviews = reviews;
        this.categories = categories;
        this.facilities = facilities;
        this.settings = settings;
        this.time = time;
    }

    public LocalDate today() { return BusinessDay.today(time); }

    @Transactional(readOnly = true)
    public Page<HotelOffer> search(StayQuery q, SearchFilter f, Pageable pageable) {
        String city = f.city() == null || f.city().isBlank() ? null : f.city().trim().toLowerCase();
        List<Hotel> candidates = hotels.findByStatusOrderByIdAsc(HotelStatus.ACTIVE).stream()
                .filter(h -> city == null || h.getCity().toLowerCase().contains(city))
                .filter(h -> f.stars() == null || f.stars().isEmpty() || f.stars().contains(h.getStarRating()))
                .toList();
        List<HotelOffer> offers = offersFor(candidates, q, f.facilityIds()).stream()
                .filter(o -> o.availableRoomTypes() > 0 && o.fromPrice() != null)
                .filter(o -> f.minPrice() == null || o.fromPrice() >= f.minPrice())
                .filter(o -> f.maxPrice() == null || o.fromPrice() <= f.maxPrice())
                .sorted(comparator(f.sort()))
                .toList();
        int from = (int) Math.min(pageable.getOffset(), offers.size());
        int to = Math.min(from + pageable.getPageSize(), offers.size());
        return new PageImpl<>(offers.subList(from, to), pageable, offers.size());
    }

    private static Comparator<HotelOffer> comparator(String sort) {
        Comparator<HotelOffer> byRating = Comparator.comparing((HotelOffer o) -> o.ratingAverage() == null ? 0 : o.ratingAverage()).reversed()
                .thenComparing(o -> -o.ratingCount());
        if (sort == null || sort.isBlank()) return byRating.thenComparing(o -> o.hotel().getId());
        return switch (sort.trim().toLowerCase()) {
            case "price,asc", "price" -> Comparator.comparing(HotelOffer::fromPrice).thenComparing(o -> o.hotel().getId());
            case "price,desc" -> Comparator.comparing(HotelOffer::fromPrice).reversed().thenComparing(o -> o.hotel().getId());
            case "stars", "stars,desc" -> Comparator.comparing((HotelOffer o) -> o.hotel().getStarRating()).reversed().thenComparing(byRating);
            case "rating", "rating,desc" -> byRating.thenComparing(o -> o.hotel().getId());
            default -> throw BusinessException.badRequest("sort chỉ nhận price,asc | price,desc | rating | stars");
        };
    }

    /** Chi tiết khách sạn đang ACTIVE (khách sạn khác → 404 với khách). */
    @Transactional(readOnly = true)
    public HotelOffer detail(Long hotelId, StayQuery q) {
        Hotel h = hotels.findById(hotelId).filter(Hotel::isPublic).orElseThrow(() -> BusinessException.notFound("khách sạn"));
        return offersFor(List.of(h), q, null).get(0);
    }

    @Transactional(readOnly = true)
    public List<String> images(Hotel h) {
        List<String> list = images.findByHotelIdOrderBySortOrderAsc(h.getId()).stream().map(HotelImage::getImageUrl).collect(Collectors.toList());
        if (list.isEmpty() && h.getCoverImageUrl() != null) list.add(h.getCoverImageUrl());
        return list;
    }

    @Transactional(readOnly = true)
    public Page<Review> reviews(Long hotelId, Pageable pageable) {
        hotels.findById(hotelId).filter(Hotel::isPublic).orElseThrow(() -> BusinessException.notFound("khách sạn"));
        return reviews.findByHotelIdAndStatusOrderByCreatedAtDesc(hotelId, ReviewStatus.VISIBLE, pageable);
    }

    @Transactional(readOnly = true)
    public List<String> cities() { return hotels.activeCities(); }

    @Transactional(readOnly = true)
    public Map<FacilityCategory, List<Facility>> facilityCatalog() {
        Map<Long, List<Facility>> byCat = facilities.findAllByOrderByIdAsc().stream()
                .collect(Collectors.groupingBy(x -> x.getCategory().getId(), LinkedHashMap::new, Collectors.toList()));
        Map<FacilityCategory, List<Facility>> out = new LinkedHashMap<>();
        for (FacilityCategory c : categories.findAllByOrderByIdAsc()) out.put(c, byCat.getOrDefault(c.getId(), List.of()));
        return out;
    }

    /**
     * Tính offer cho nhiều khách sạn với số truy vấn cố định (loại phòng, số phòng active, tồn kho, đánh giá)
     * thay vì N+1 theo từng khách sạn.
     */
    @Transactional(readOnly = true)
    public List<HotelOffer> offersFor(List<Hotel> hs, StayQuery q, Set<Long> requiredFacilities) {
        if (hs.isEmpty()) return List.of();
        List<Long> hotelIds = hs.stream().map(Hotel::getId).toList();
        Map<Long, List<RoomType>> typesByHotel = roomTypes.findByHotelIdInAndActiveTrueOrderByIdAsc(hotelIds).stream()
                .collect(Collectors.groupingBy(t -> t.getHotel().getId()));
        List<Long> typeIds = typesByHotel.values().stream().flatMap(List::stream).map(RoomType::getId).toList();
        Map<Long, Integer> activeRooms = new HashMap<>();
        Map<Long, Map<LocalDate, RoomInventory>> nights = new HashMap<>();
        if (!typeIds.isEmpty()) {
            for (Object[] row : rooms.countActiveByRoomType(typeIds)) activeRooms.put((Long) row[0], ((Number) row[1]).intValue());
            if (q.hasDates()) {
                for (RoomInventory i : inventory.findRange(typeIds, q.checkIn(), q.checkOut())) {
                    nights.computeIfAbsent(i.getRoomTypeId(), k -> new HashMap<>()).put(i.getStayDate(), i);
                }
            }
        }
        Map<Long, Object[]> stats = new HashMap<>();
        for (Object[] row : reviews.stats(hotelIds)) stats.put((Long) row[0], row);
        int fee = settings.feePercent();

        List<HotelOffer> out = new ArrayList<>();
        for (Hotel h : hs) {
            List<RoomTypeOffer> offers = new ArrayList<>();
            for (RoomType t : typesByHotel.getOrDefault(h.getId(), List.of())) {
                offers.add(offer(t, activeRooms.getOrDefault(t.getId(), 0), nights.getOrDefault(t.getId(), Map.of()), q, fee, requiredFacilities));
            }
            List<RoomTypeOffer> eligible = offers.stream().filter(RoomTypeOffer::eligible).toList();
            Long fromPrice = eligible.stream().map(o -> perNight(o, q)).min(Long::compare).orElse(null);
            Object[] s = stats.get(h.getId());
            Double avg = s == null ? null : Math.round(((Number) s[1]).doubleValue() * 10) / 10.0;
            long count = s == null ? 0 : ((Number) s[2]).longValue();
            out.add(new HotelOffer(h, fromPrice, avg, count, eligible.size(), offers));
        }
        return out;
    }

    private static RoomTypeOffer offer(RoomType t, int active, Map<LocalDate, RoomInventory> rows, StayQuery q, int fee, Set<Long> required) {
        boolean hasFacilities = required == null || required.isEmpty()
                || t.getFacilities().stream().map(Facility::getId).collect(Collectors.toSet()).containsAll(required);
        boolean fits = t.fits(q.guests(), q.rooms());
        if (!q.hasDates()) {
            long listing = Pricing.listingPrice(t.getBasePrice(), fee);
            return new RoomTypeOffer(t, active, null, listing, null, fits && hasFacilities && active >= q.rooms());
        }
        List<Pricing.Night> list = new ArrayList<>();
        int available = Integer.MAX_VALUE;
        for (LocalDate d = q.checkIn(); d.isBefore(q.checkOut()); d = d.plusDays(1)) {
            RoomInventory r = rows.get(d);
            available = Math.min(available, r == null ? active : r.available());
            list.add(Pricing.night(d, r == null ? t.getBasePrice() : r.basePrice(t.getBasePrice()), fee));
        }
        available = Math.max(0, available);
        Pricing.Quote quote = Pricing.quote(list, q.rooms());
        return new RoomTypeOffer(t, active, available, quote.firstNightListing(), quote, fits && hasFacilities && available >= q.rooms());
    }

    /** Giá niêm yết/đêm/phòng: không có ngày = giá từ base; có ngày = trung bình các đêm (làm tròn lên 1.000đ). */
    private static long perNight(RoomTypeOffer o, StayQuery q) {
        if (o.quote() == null) return o.listingPrice();
        long perRoom = o.quote().totalAmount() / q.rooms();
        return -Math.floorDiv(-perRoom, (long) q.nights() * Pricing.ROUND_TO) * Pricing.ROUND_TO;
    }
}
