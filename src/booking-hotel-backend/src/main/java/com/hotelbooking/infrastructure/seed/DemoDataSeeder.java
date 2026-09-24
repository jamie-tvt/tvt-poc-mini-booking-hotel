package com.hotelbooking.infrastructure.seed;

import com.hotelbooking.application.common.Codes;
import com.hotelbooking.application.systemsetting.SettingService;
import com.hotelbooking.domain.booking.Booking;
import com.hotelbooking.domain.booking.BookingStatus;
import com.hotelbooking.domain.common.BusinessDay;
import com.hotelbooking.domain.common.TimeProvider;
import com.hotelbooking.domain.hotel.*;
import com.hotelbooking.domain.inventory.Pricing;
import com.hotelbooking.domain.inventory.RoomInventory;
import com.hotelbooking.domain.notification.Notification;
import com.hotelbooking.domain.payment.Invoice;
import com.hotelbooking.domain.payment.Payment;
import com.hotelbooking.domain.payment.PaymentProvider;
import com.hotelbooking.domain.payout.Payout;
import com.hotelbooking.domain.review.Review;
import com.hotelbooking.domain.user.User;
import com.hotelbooking.infrastructure.persistence.jpa.*;
import java.time.*;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Dữ liệu mẫu sinh theo "hôm nay" (giờ VN) nên lúc nào mở demo cũng có đơn nhận phòng hôm nay, đơn sắp tới, đơn đã ở.
 * Chỉ chạy khi DB chưa có người dùng. Tài khoản theo §6 hợp đồng (mật khẩu 12345678).
 * Tồn kho (room_inventory) được tăng đúng theo các booking đang/đã giữ phòng → khớp với đường đặt phòng thật.
 */
@Component
@ConditionalOnProperty(name = "app.seed-demo", havingValue = "true")
public class DemoDataSeeder implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);
    public static final String GUEST_CODE = "HB-GUEST1";
    public static final String GUEST_KEY = "demo-guest-key-000000001";

    private final JpaUserRepository users;
    private final JpaUserRoleRepository roles;
    private final JpaFacilityCategoryRepository categories;
    private final JpaFacilityRepository facilities;
    private final JpaHotelRepository hotels;
    private final JpaHotelImageRepository images;
    private final JpaRoomTypeRepository roomTypes;
    private final JpaRoomRepository rooms;
    private final JpaRoomInventoryRepository inventory;
    private final JpaBookingRepository bookings;
    private final JpaInvoiceRepository invoices;
    private final JpaPaymentRepository payments;
    private final JpaPayoutRepository payouts;
    private final JpaReviewRepository reviews;
    private final JpaNotificationRepository notifications;
    private final SettingService settings;
    private final PasswordEncoder encoder;
    private final TimeProvider time;

    private final Map<String, Facility> fac = new HashMap<>();
    private final Map<Long, List<Room>> roomsByType = new HashMap<>();
    private final Map<String, RoomInventory> nights = new HashMap<>();
    private Instant now;
    private LocalDate today;
    private int fee;

    public DemoDataSeeder(JpaUserRepository users, JpaUserRoleRepository roles, JpaFacilityCategoryRepository categories,
                          JpaFacilityRepository facilities, JpaHotelRepository hotels, JpaHotelImageRepository images,
                          JpaRoomTypeRepository roomTypes, JpaRoomRepository rooms, JpaRoomInventoryRepository inventory,
                          JpaBookingRepository bookings, JpaInvoiceRepository invoices, JpaPaymentRepository payments,
                          JpaPayoutRepository payouts, JpaReviewRepository reviews, JpaNotificationRepository notifications,
                          SettingService settings, PasswordEncoder encoder, TimeProvider time) {
        this.users = users; this.roles = roles; this.categories = categories; this.facilities = facilities; this.hotels = hotels;
        this.images = images; this.roomTypes = roomTypes; this.rooms = rooms; this.inventory = inventory; this.bookings = bookings;
        this.invoices = invoices; this.payments = payments; this.payouts = payouts; this.reviews = reviews;
        this.notifications = notifications; this.settings = settings; this.encoder = encoder; this.time = time;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (users.count() > 0) return;
        now = time.now();
        today = BusinessDay.of(now);
        fee = settings.feePercent();
        String pw = encoder.encode("12345678");

        User hao = user("CUSTOMER", "Nguyễn Văn Hào", "customer@example.com", "0901234567", pw, null);
        User mai = user("CUSTOMER", "Trần Thị Mai", "mai.tran@example.com", "0912345678", pw, null);
        User khoa = user("HOTEL_OWNER", "Trần Minh Khoa", "owner@example.com", "0923456789", pw, null);
        User thu = user("HOTEL_OWNER", "Lê Thị Thu", "owner2@example.com", "0934567890", pw, null);
        user("ADMIN", "Quản trị viên", "admin@example.com", "0956789012", pw, null);

        facilityCatalog();

        Hotel ninhKieu = hotel(khoa, "Ninh Kiều Riverside Hotel", "Cần Thơ", "2 Hai Bà Trưng, P. Tân An, Q. Ninh Kiều", 4, "02923821888",
                "ninh-kieu-riverside", "Khách sạn bốn sao bên bến Ninh Kiều, nhìn thẳng ra sông Hậu và cầu đi bộ. Cách chợ đêm 3 phút đi bộ, "
                        + "có hồ bơi tầng thượng, nhà hàng đặc sản miền Tây và tour chợ nổi Cái Răng lúc bình minh.", HotelStatus.ACTIVE);
        RoomType nkDeluxe = roomType(ninhKieu, "Deluxe hướng sông", "Ban công nhìn sông Hậu, bồn tắm, cửa kính lớn đón bình minh.",
                2, "1 giường đôi lớn", 32, 1_200_000, CancellationPolicy.FREE_BEFORE_DATE, 3, 1, 6,
                "wifi", "air", "tv", "minibar", "safe", "bathtub", "dryer", "breakfast", "pool", "gym", "elevator", "parking");
        RoomType nkSuperior = roomType(ninhKieu, "Superior", "Phòng hướng phố, yên tĩnh, phù hợp công tác ngắn ngày.",
                2, "2 giường đơn", 26, 850_000, CancellationPolicy.FREE_BEFORE_DATE, 1, 2, 8,
                "wifi", "air", "tv", "safe", "dryer", "breakfast", "pool", "gym", "elevator", "parking");
        RoomType nkFamily = roomType(ninhKieu, "Family", "Hai giường đôi, góc sofa cho trẻ nhỏ, rộng rãi cho gia đình 4 người.",
                4, "2 giường đôi", 45, 1_650_000, CancellationPolicy.NON_REFUNDABLE, null, 3, 3,
                "wifi", "air", "tv", "minibar", "safe", "bathtub", "dryer", "breakfast", "pool", "elevator", "parking");

        Hotel caiRang = hotel(khoa, "Cái Răng Homestay", "Cần Thơ", "Hẻm 30 Lý Thường Kiệt, P. Lê Bình, Q. Cái Răng", 3, "0939112233",
                "cai-rang-homestay", "Homestay nhà vườn cách chợ nổi Cái Răng 5 phút chèo xuồng. Chủ nhà nấu bữa sáng hủ tiếu, "
                        + "cho mượn xe đạp và dẫn khách đi chợ nổi từ 5 giờ sáng.", HotelStatus.ACTIVE);
        RoomType crGarden = roomType(caiRang, "Phòng vườn", "Phòng gỗ mở ra vườn trái cây, có mùng và quạt trần.",
                2, "1 giường đôi", 20, 450_000, CancellationPolicy.FREE_BEFORE_DATE, 2, 1, 4,
                "wifi", "air", "breakfast", "parking");
        roomType(caiRang, "Bungalow", "Bungalow lá dừa riêng biệt sát kênh, hiên võng.",
                3, "1 giường đôi + 1 giường đơn", 28, 700_000, CancellationPolicy.FREE_BEFORE_DATE, 2, 2, 2,
                "wifi", "air", "tv", "breakfast", "parking");

        Hotel viThanh = hotel(thu, "Vị Thanh Green Hotel", "Hậu Giang", "15 Trần Hưng Đạo, P. 5, TP. Vị Thanh", 3, "02933878999",
                "vi-thanh-green", "Khách sạn xanh giữa trung tâm Vị Thanh, gần hồ Xáng Thổi và chợ nổi Ngã Bảy. Phòng sạch, giá hợp lý.",
                HotelStatus.ACTIVE);
        roomType(viThanh, "Standard", "Phòng tiêu chuẩn đầy đủ tiện nghi cơ bản.",
                2, "1 giường đôi", 22, 550_000, CancellationPolicy.FREE_BEFORE_DATE, 1, 1, 6,
                "wifi", "air", "tv", "breakfast", "elevator", "parking");
        roomType(viThanh, "Suite", "Phòng suite có phòng khách riêng và bồn tắm.",
                3, "1 giường đôi lớn + sofa bed", 40, 950_000, CancellationPolicy.FREE_BEFORE_DATE, 2, 2, 2,
                "wifi", "air", "tv", "minibar", "bathtub", "dryer", "breakfast", "elevator", "parking");

        Hotel sunset = hotel(thu, "Sunset Bay Resort Phú Quốc", "Kiên Giang", "Bãi Trường, xã Dương Tơ, TP. Phú Quốc", 5, "02973996688",
                "sunset-bay", "Resort năm sao trên bãi Trường: biệt thự hồ bơi riêng, bãi biển riêng ngắm hoàng hôn, spa và đưa đón sân bay.",
                HotelStatus.ACTIVE);
        RoomType sbGarden = roomType(sunset, "Garden Villa", "Biệt thự giữa vườn nhiệt đới, hồ bơi riêng nhỏ.",
                2, "1 giường king", 60, 3_200_000, CancellationPolicy.NON_REFUNDABLE, null, 1, 4,
                "wifi", "air", "tv", "minibar", "safe", "bathtub", "dryer", "breakfast", "airport", "pool", "gym", "parking");
        roomType(sunset, "Ocean Villa", "Biệt thự hai phòng ngủ sát biển, hồ bơi vô cực nhìn hoàng hôn.",
                4, "2 giường king", 110, 5_500_000, CancellationPolicy.FREE_BEFORE_DATE, 7, 2, 2,
                "wifi", "air", "tv", "minibar", "safe", "bathtub", "dryer", "breakfast", "airport", "pool", "gym", "parking");

        Hotel lotus = hotel(khoa, "Mekong Lotus Hotel", "Cần Thơ", "88 Nguyễn Văn Cừ, P. An Khánh, Q. Ninh Kiều", 3, "02923777666",
                "mekong-lotus", "Khách sạn mới khai trương gần Đại học Cần Thơ, đang chờ nền tảng duyệt hồ sơ.", HotelStatus.PENDING_APPROVAL);
        roomType(lotus, "Superior", "Phòng tiêu chuẩn mới, nội thất gỗ sen.",
                2, "1 giường đôi", 24, 600_000, CancellationPolicy.FREE_BEFORE_DATE, 1, 1, 3,
                "wifi", "air", "tv", "elevator", "parking");

        user("HOTEL_STAFF", "Phạm Văn Lộc", "staff@example.com", "0945678901", pw, ninhKieu.getId());

        // ------------------------------------------------------------ đơn mẫu
        // Hào: nhận phòng hôm nay (staff demo check-in), đơn sau 10 ngày (huỷ hoàn 100%), đơn tuần trước chưa đánh giá
        booking(hao, nkDeluxe, today, today.plusDays(2), 1, 2, BookingStatus.CONFIRMED, 5, null, null);
        booking(hao, nkSuperior, today.plusDays(10), today.plusDays(12), 1, 2, BookingStatus.CONFIRMED, 1, null, null);
        Booking haoPast = booking(hao, crGarden, today.minusDays(7), today.minusDays(5), 1, 2, BookingStatus.CHECKED_OUT, 12, null, null);
        payouts.save(new Payout(haoPast, at(today.minusDays(5), 11)));
        notifications.save(new Notification(hao.getId(), haoPast.getId(), "Cảm ơn bạn đã lưu trú tại Cái Răng Homestay",
                "Hãy để lại đánh giá cho kỳ nghỉ (đơn " + haoPast.getBookingCode() + ") để giúp khách sau chọn phòng nhé.", at(today.minusDays(5), 11)));

        // Mai: 2 đơn đã ở và đã đánh giá, 1 đơn đang ở
        Booking maiSunset = booking(mai, sbGarden, today.minusDays(20), today.minusDays(17), 1, 2, BookingStatus.CHECKED_OUT, 40, null, null);
        paidPayout(maiSunset, today.minusDays(15));
        reviews.save(new Review(sunset.getId(), maiSunset.getId(), mai.getId(), mai.getFullName(), 5,
                "Biệt thự riêng tư, hồ bơi sạch, nhân viên chu đáo. Hoàng hôn ở bãi Trường đẹp nhất từng thấy!", at(today.minusDays(16), 9)));
        Booking maiNk = booking(mai, nkDeluxe, today.minusDays(30), today.minusDays(28), 1, 2, BookingStatus.CHECKED_OUT, 45, null, null);
        paidPayout(maiNk, today.minusDays(26));
        reviews.save(new Review(ninhKieu.getId(), maiNk.getId(), mai.getId(), mai.getFullName(), 4,
                "Phòng view sông rất đẹp, bữa sáng nhiều món miền Tây. Thang máy giờ cao điểm hơi chờ lâu.", at(today.minusDays(27), 20)));
        Booking maiStay = booking(mai, nkSuperior, today.minusDays(1), today.plusDays(1), 1, 2, BookingStatus.CHECKED_IN, 6, null, null);
        notifications.save(new Notification(mai.getId(), maiStay.getId(), "Chào mừng bạn đến Ninh Kiều Riverside Hotel",
                "Bạn đã nhận phòng " + roomsByType.get(nkSuperior.getId()).get(0).getRoomNumber() + ". Chúc kỳ nghỉ vui vẻ!", at(today.minusDays(1), 14)));

        // Khách vãng lai: tra cứu bằng HB-GUEST1 + guest@example.com
        booking(null, nkDeluxe, today.plusDays(3), today.plusDays(4), 1, 2, BookingStatus.CONFIRMED, 2, GUEST_CODE, GUEST_KEY);

        log.info("Đã tạo dữ liệu mẫu: {} tài khoản, {} khách sạn, {} loại phòng, {} phòng, {} đơn, {} đêm tồn kho",
                users.count(), hotels.count(), roomTypes.count(), rooms.count(), bookings.count(), inventory.count());
    }

    // ---------------------------------------------------------------- helpers
    private User user(String role, String name, String email, String phone, String pw, Long hotelId) {
        return users.save(new User(roles.findByName(role).orElseThrow(), name, email, pw, phone, hotelId, now));
    }

    private void facilityCatalog() {
        Object[][] data = {
                {"Phòng", new String[][] {{"wifi", "Wi-Fi", "wifi"}, {"air", "Điều hoà", "air-vent"}, {"tv", "TV", "tv"},
                        {"minibar", "Minibar", "wine"}, {"safe", "Két sắt", "lock"}}},
                {"Phòng tắm", new String[][] {{"bathtub", "Bồn tắm", "bath"}, {"dryer", "Máy sấy tóc", "wind"}}},
                {"Dịch vụ", new String[][] {{"breakfast", "Bữa sáng", "coffee"}, {"airport", "Đưa đón sân bay", "plane"},
                        {"pool", "Hồ bơi", "waves"}, {"gym", "Gym", "dumbbell"}}},
                {"Tiện ích", new String[][] {{"parking", "Chỗ đậu xe", "car"}, {"elevator", "Thang máy", "arrow-up-down"}}}};
        for (Object[] c : data) {
            FacilityCategory cat = categories.save(new FacilityCategory((String) c[0]));
            for (String[] f : (String[][]) c[1]) fac.put(f[0], facilities.save(new Facility(cat, f[1], f[2])));
        }
    }

    private Hotel hotel(User owner, String name, String city, String address, int stars, String phone, String slug, String desc, HotelStatus status) {
        Hotel h = new Hotel(owner.getId(), now);
        String cover = "/images/hotels/" + slug + ".svg";
        h.updateProfile(name, city, address, desc, stars, phone, "14:00", "12:00", cover, now);
        if (status != HotelStatus.PENDING_APPROVAL) h.changeStatus(status, now);
        h = hotels.save(h);
        images.save(new HotelImage(h.getId(), cover, 0));
        return h;
    }

    /** Phòng đánh số theo tầng: loại phòng thứ n ở tầng n → 101, 102, … / 201, 202, … */
    private RoomType roomType(Hotel h, String name, String desc, int capacity, String bed, int area, long price, CancellationPolicy policy,
                              Integer freeDays, int floor, int roomCount, String... facilityKeys) {
        RoomType t = new RoomType(h, now);
        Set<Facility> fs = new LinkedHashSet<>();
        for (String k : facilityKeys) fs.add(Objects.requireNonNull(fac.get(k), k));
        t.update(name, desc, capacity, bed, area, price, policy, freeDays, null, fs, now);
        t = roomTypes.save(t);
        List<Room> list = new ArrayList<>();
        for (int i = 1; i <= roomCount; i++) list.add(rooms.save(new Room(t, String.valueOf(floor * 100 + i), now)));
        roomsByType.put(t.getId(), list);
        return t;
    }

    private static Instant at(LocalDate d, int hour) { return d.atTime(hour, 0).atZone(BusinessDay.VN).toInstant(); }

    /** Tạo booking đã thanh toán ở trạng thái cho trước và tăng tồn kho đúng như đường đặt phòng thật. */
    private Booking booking(User u, RoomType t, LocalDate in, LocalDate out, int roomsCount, int guests, BookingStatus status,
                            int bookedDaysAgo, String code, String key) {
        List<Pricing.Night> priced = new ArrayList<>();
        for (LocalDate d = in; d.isBefore(out); d = d.plusDays(1)) {
            RoomInventory n = night(t, d);
            n.reserve(roomsCount);
            priced.add(Pricing.night(d, n.basePrice(t.getBasePrice()), fee));
        }
        Instant bookedAt = at(in.minusDays(bookedDaysAgo).isBefore(today) ? in.minusDays(bookedDaysAgo) : today, 9);
        if (bookedAt.isAfter(now)) bookedAt = now.minus(Duration.ofHours(2));
        Booking.Guest g = u == null
                ? new Booking.Guest("Lê Hoàng Nam", "guest@example.com", "0987654321", "Nhận phòng muộn khoảng 20:00")
                : new Booking.Guest(u.getFullName(), u.getEmail(), u.getPhone(), null);
        Booking b = new Booking(code != null ? code : Codes.random("HB-", 6), key != null ? key : Codes.accessKey(),
                u == null ? null : u.getId(), t, in, out, guests, g, Pricing.quote(priced, roomsCount), bookedAt, null);
        List<Room> assigned = status == BookingStatus.CHECKED_IN || status == BookingStatus.CHECKED_OUT
                ? roomsByType.get(t.getId()).subList(0, roomsCount) : null;
        Instant checkedIn = assigned == null ? null : at(in, 14);
        Instant checkedOut = status == BookingStatus.CHECKED_OUT ? at(out, 11) : null;
        b.seedState(status, bookedAt, checkedIn, checkedOut, assigned);
        b = bookings.save(b);
        Invoice inv = invoices.save(new Invoice(b, "INV-" + b.getBookingCode().substring(3), bookedAt));
        Payment p = new Payment(inv, PaymentProvider.MOCK, bookedAt);
        p.markPaid("SEED-" + b.getBookingCode(), inv.getAmount(), "MOCK_CARD", bookedAt.plus(Duration.ofMinutes(3)));
        payments.save(p);
        return b;
    }

    private void paidPayout(Booking b, LocalDate paidOn) {
        Payout p = new Payout(b, at(b.getCheckOut(), 11));
        p.markPaid(null, at(paidOn, 10));
        payouts.save(p);
    }

    private RoomInventory night(RoomType t, LocalDate d) {
        return nights.computeIfAbsent(t.getId() + "@" + d,
                k -> inventory.save(new RoomInventory(t.getId(), d, roomsByType.get(t.getId()).size())));
    }
}
