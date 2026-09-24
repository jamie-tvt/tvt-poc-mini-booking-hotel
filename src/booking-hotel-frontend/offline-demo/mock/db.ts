/**
 * "Cơ sở dữ liệu" của API giả lập: 1 object JSON lưu ở localStorage.
 * Seed bám DemoDataSeeder.java của backend (cùng tài khoản, khách sạn, loại phòng, tồn kho, đơn mẫu, sinh theo "hôm nay" giờ VN).
 */
import type {
  BookingStatus, CancellationPolicy, HotelStatus, PaymentProvider, PaymentStatus, PayoutStatus, ReviewStatus, Role,
} from "@/types/domain";

export const DB_KEY = "hb.demo.db.v1";
export const GUEST_CODE = "HB-GUEST1";
export const GUEST_KEY = "demo-guest-key-000000001";
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export interface User { id: number; role: Role; fullName: string; email: string; password: string; phone?: string; hotelId?: number; active: boolean; createdAt: number }
export interface FacilityCategory { id: number; name: string }
export interface Facility { id: number; categoryId: number; name: string; icon: string }
export interface Hotel {
  id: number; ownerId: number; name: string; city: string; address: string; description: string; starRating: number; phone?: string;
  checkInTime: string; checkOutTime: string; coverImageUrl?: string; images: string[]; status: HotelStatus; rejectReason?: string;
  createdAt: number; updatedAt: number;
}
export interface RoomType {
  id: number; hotelId: number; name: string; description: string; capacity: number; bedInfo: string; areaM2: number; basePrice: number;
  cancellationPolicy: CancellationPolicy; freeCancelDays?: number; imageUrl?: string; active: boolean; facilityIds: number[]; createdAt: number;
}
export interface Room { id: number; roomTypeId: number; hotelId: number; roomNumber: string; active: boolean }
/** Tồn kho 1 đêm: khoá `${roomTypeId}@${YYYY-MM-DD}`. Đêm chưa có dòng = còn nguyên số phòng hoạt động, giá cơ bản. */
export interface Night { total: number; booked: number; priceOverride?: number }
export interface Booking {
  id: number; bookingCode: string; accessKey: string; userId?: number; hotelId: number; roomTypeId: number; roomIds: number[];
  checkIn: string; checkOut: string; nights: number; roomsCount: number; guests: number; guestName: string; guestEmail: string; guestPhone: string;
  note?: string; baseAmount: number; feeAmount: number; totalAmount: number; cancellationPolicy: CancellationPolicy; freeCancelDays?: number;
  status: BookingStatus; bookedAt: number; expiresAt?: number; cancelledAt?: number; cancelReason?: string; checkedInAt?: number; checkedOutAt?: number;
}
export interface Invoice { id: number; bookingId: number; invoiceCode: string; amount: number; baseAmount: number; feeAmount: number; createdAt: number }
export interface Payment {
  id: number; invoiceId: number; amount: number; refundAmount?: number; provider: PaymentProvider; transactionCode?: string; paymentMethod?: string;
  status: PaymentStatus; note?: string; createdAt: number; paidAt?: number;
}
export interface Payout { id: number; hotelId: number; bookingId: number; amount: number; status: PayoutStatus; createdAt: number; paidAt?: number }
export interface Review { id: number; hotelId: number; bookingId: number; userId?: number; guestName: string; rating: number; content: string; status: ReviewStatus; createdAt: number }
export interface Notification { id: number; userId: number; bookingId?: number; title: string; content: string; read: boolean; createdAt: number }
export interface Audit { id: number; userId?: number; action: string; entityType?: string; entityId?: number; result: string; detail?: string; createdAt: number }
export interface Setting { key: string; value: string; description: string }
export interface Token { token: string; userId: number; family: string; revoked: boolean }

export interface DB {
  version: 2; // 2: ảnh Unsplash (F4) — dữ liệu cũ trong localStorage được seed lại
  seededAt: number;
  offsetMinutes: number;
  seq: Record<string, number>;
  users: User[]; facilityCategories: FacilityCategory[]; facilities: Facility[]; hotels: Hotel[]; roomTypes: RoomType[]; rooms: Room[];
  inventory: Record<string, Night>; bookings: Booking[]; invoices: Invoice[]; payments: Payment[]; payouts: Payout[]; reviews: Review[];
  notifications: Notification[]; audit: Audit[]; settings: Setting[]; tokens: Token[];
}

export type Table = "users" | "facilityCategories" | "facilities" | "hotels" | "roomTypes" | "rooms" | "bookings" | "invoices" | "payments"
  | "payouts" | "reviews" | "notifications" | "audit";

export function insert<T extends { id: number }>(db: DB, table: Table, row: Omit<T, "id">): T {
  db.seq[table] = (db.seq[table] ?? 0) + 1;
  const full = { id: db.seq[table], ...row } as T;
  (db[table] as unknown as T[]).push(full);
  return full;
}

// ------------------------------------------------------------------ ngày theo giờ Việt Nam (UTC+7, không đổi giờ)

export const vnToday = (now: number) => new Date(now + 7 * HOUR).toISOString().slice(0, 10);
export const addDays = (ymd: string, n: number) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);
/** Thời điểm `hour` giờ (giờ VN) của ngày ymd. */
export const at = (ymd: string, hour: number) => Date.parse(`${ymd}T00:00:00Z`) + (hour - 7) * HOUR;
export function nightsOf(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) out.push(d);
  return out;
}

/** BR-PR-01: giá niêm yết = giá cơ bản × (1 + fee%), làm tròn LÊN bội 1.000đ. */
export const listingPrice = (base: number, feePercent: number) => Math.ceil((base * (100 + feePercent)) / 100_000) * 1000;

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export function randomCode(prefix: string, len: number) {
  let s = prefix;
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}
export const accessKey = () => randomCode("", 24).toLowerCase();

export function activeRoomCount(db: DB, roomTypeId: number) {
  return db.rooms.filter((r) => r.roomTypeId === roomTypeId && r.active).length;
}
/** Dòng tồn kho của đêm (tạo khi cần — như INSERT IGNORE ở backend). */
export function night(db: DB, roomTypeId: number, date: string): Night {
  const k = `${roomTypeId}@${date}`;
  return (db.inventory[k] ??= { total: activeRoomCount(db, roomTypeId), booked: 0 });
}
export const peekNight = (db: DB, roomTypeId: number, date: string): Night | undefined => db.inventory[`${roomTypeId}@${date}`];

// ------------------------------------------------------------------ seed

export function seed(now = Date.now()): DB {
  const db: DB = {
    version: 2, seededAt: now, offsetMinutes: 0, seq: {},
    users: [], facilityCategories: [], facilities: [], hotels: [], roomTypes: [], rooms: [], inventory: {}, bookings: [], invoices: [],
    payments: [], payouts: [], reviews: [], notifications: [], audit: [], tokens: [],
    settings: [
      { key: "booking.payment_timeout_minutes", value: "15", description: "Thời gian giữ phòng chờ thanh toán (phút)" },
      { key: "platform.fee_percent", value: "10", description: "Phí nền tảng cộng vào giá cơ bản (%), giá niêm yết làm tròn lên bội 1.000đ (BR-PR-01)" },
    ],
  };
  const fee = 10;
  const today = vnToday(now);

  const user = (role: Role, fullName: string, email: string, phone: string, hotelId?: number) =>
    insert<User>(db, "users", { role, fullName, email, password: "12345678", phone, hotelId, active: true, createdAt: now - 90 * DAY });
  const hao = user("CUSTOMER", "Nguyễn Văn Hào", "customer@example.com", "0901234567");
  const mai = user("CUSTOMER", "Trần Thị Mai", "mai.tran@example.com", "0912345678");
  const khoa = user("HOTEL_OWNER", "Trần Minh Khoa", "owner@example.com", "0923456789");
  const thu = user("HOTEL_OWNER", "Lê Thị Thu", "owner2@example.com", "0934567890");
  user("ADMIN", "Quản trị viên", "admin@example.com", "0956789012");

  const fac: Record<string, number> = {};
  for (const [cat, items] of [
    ["Phòng", [["wifi", "Wi-Fi", "wifi"], ["air", "Điều hoà", "air-vent"], ["tv", "TV", "tv"], ["minibar", "Minibar", "wine"], ["safe", "Két sắt", "lock"]]],
    ["Phòng tắm", [["bathtub", "Bồn tắm", "bath"], ["dryer", "Máy sấy tóc", "wind"]]],
    ["Dịch vụ", [["breakfast", "Bữa sáng", "coffee"], ["airport", "Đưa đón sân bay", "plane"], ["pool", "Hồ bơi", "waves"], ["gym", "Gym", "dumbbell"]]],
    ["Tiện ích", [["parking", "Chỗ đậu xe", "car"], ["elevator", "Thang máy", "arrow-up-down"]]],
  ] as [string, string[][]][]) {
    const c = insert<FacilityCategory>(db, "facilityCategories", { name: cat });
    for (const [key, name, icon] of items) fac[key] = insert<Facility>(db, "facilities", { categoryId: c.id, name, icon }).id;
  }

  // Ảnh bìa: link CDN Unsplash (Unsplash License) — giống DemoDataSeeder.java; mất mạng → HotelImage dùng SVG dự phòng
  const covers: Record<string, string> = {
    "ninh-kieu-riverside": "https://images.unsplash.com/photo-1683617638309-b1fc59c8c7b3?auto=format&fit=crop&w=1200&q=75", // Tan Dao
    "cai-rang-homestay": "https://images.unsplash.com/photo-1778123178296-fdd5cb2424b5?auto=format&fit=crop&w=1200&q=75", // Ahmet Yüksek
    "vi-thanh-green": "https://images.unsplash.com/photo-1619676289827-3b6eefa7ff93?auto=format&fit=crop&w=1200&q=75", // Hà Nguyễn
    "sunset-bay": "https://images.unsplash.com/photo-1783162919371-8d7e9fa65f58?auto=format&fit=crop&w=1200&q=75", // Wolfgang Unger
    "mekong-lotus": "https://images.unsplash.com/photo-1784007686796-bcaaf1044000?auto=format&fit=crop&w=1200&q=75", // Jamie Trinh
  };
  const hotel = (owner: User, name: string, city: string, address: string, stars: number, phone: string, slug: string, desc: string,
    status: HotelStatus) => {
    const cover = covers[slug] ?? `/images/hotels/${slug}.svg`;
    return insert<Hotel>(db, "hotels", {
      ownerId: owner.id, name, city, address, description: desc, starRating: stars, phone, checkInTime: "14:00", checkOutTime: "12:00",
      coverImageUrl: cover, images: [cover], status, createdAt: now - 60 * DAY, updatedAt: now - 60 * DAY,
    });
  };
  const roomType = (h: Hotel, name: string, desc: string, capacity: number, bed: string, area: number, price: number,
    policy: CancellationPolicy, freeDays: number | undefined, floor: number, count: number, ...keys: string[]) => {
    const t = insert<RoomType>(db, "roomTypes", {
      hotelId: h.id, name, description: desc, capacity, bedInfo: bed, areaM2: area, basePrice: price, cancellationPolicy: policy,
      freeCancelDays: policy === "FREE_BEFORE_DATE" ? freeDays : undefined, active: true, facilityIds: keys.map((k) => fac[k]), createdAt: now - 60 * DAY,
    });
    for (let i = 1; i <= count; i++) insert<Room>(db, "rooms", { roomTypeId: t.id, hotelId: h.id, roomNumber: String(floor * 100 + i), active: true });
    return t;
  };

  const ninhKieu = hotel(khoa, "Ninh Kiều Riverside Hotel", "Cần Thơ", "2 Hai Bà Trưng, P. Tân An, Q. Ninh Kiều", 4, "02923821888", "ninh-kieu-riverside",
    "Khách sạn bốn sao bên bến Ninh Kiều, nhìn thẳng ra sông Hậu và cầu đi bộ. Cách chợ đêm 3 phút đi bộ, có hồ bơi tầng thượng, nhà hàng đặc sản miền Tây và tour chợ nổi Cái Răng lúc bình minh.", "ACTIVE");
  const nkDeluxe = roomType(ninhKieu, "Deluxe hướng sông", "Ban công nhìn sông Hậu, bồn tắm, cửa kính lớn đón bình minh.", 2, "1 giường đôi lớn", 32, 1_200_000,
    "FREE_BEFORE_DATE", 3, 1, 6, "wifi", "air", "tv", "minibar", "safe", "bathtub", "dryer", "breakfast", "pool", "gym", "elevator", "parking");
  const nkSuperior = roomType(ninhKieu, "Superior", "Phòng hướng phố, yên tĩnh, phù hợp công tác ngắn ngày.", 2, "2 giường đơn", 26, 850_000,
    "FREE_BEFORE_DATE", 1, 2, 8, "wifi", "air", "tv", "safe", "dryer", "breakfast", "pool", "gym", "elevator", "parking");
  roomType(ninhKieu, "Family", "Hai giường đôi, góc sofa cho trẻ nhỏ, rộng rãi cho gia đình 4 người.", 4, "2 giường đôi", 45, 1_650_000,
    "NON_REFUNDABLE", undefined, 3, 3, "wifi", "air", "tv", "minibar", "safe", "bathtub", "dryer", "breakfast", "pool", "elevator", "parking");
  const caiRang = hotel(khoa, "Cái Răng Homestay", "Cần Thơ", "Hẻm 30 Lý Thường Kiệt, P. Lê Bình, Q. Cái Răng", 3, "0939112233", "cai-rang-homestay",
    "Homestay nhà vườn cách chợ nổi Cái Răng 5 phút chèo xuồng. Chủ nhà nấu bữa sáng hủ tiếu, cho mượn xe đạp và dẫn khách đi chợ nổi từ 5 giờ sáng.", "ACTIVE");
  const crGarden = roomType(caiRang, "Phòng vườn", "Phòng gỗ mở ra vườn trái cây, có mùng và quạt trần.", 2, "1 giường đôi", 20, 450_000,
    "FREE_BEFORE_DATE", 2, 1, 4, "wifi", "air", "breakfast", "parking");
  roomType(caiRang, "Bungalow", "Bungalow lá dừa riêng biệt sát kênh, hiên võng.", 3, "1 giường đôi + 1 giường đơn", 28, 700_000,
    "FREE_BEFORE_DATE", 2, 2, 2, "wifi", "air", "tv", "breakfast", "parking");
  const viThanh = hotel(thu, "Vị Thanh Green Hotel", "Hậu Giang", "15 Trần Hưng Đạo, P. 5, TP. Vị Thanh", 3, "02933878999", "vi-thanh-green",
    "Khách sạn xanh giữa trung tâm Vị Thanh, gần hồ Xáng Thổi và chợ nổi Ngã Bảy. Phòng sạch, giá hợp lý.", "ACTIVE");
  roomType(viThanh, "Standard", "Phòng tiêu chuẩn đầy đủ tiện nghi cơ bản.", 2, "1 giường đôi", 22, 550_000,
    "FREE_BEFORE_DATE", 1, 1, 6, "wifi", "air", "tv", "breakfast", "elevator", "parking");
  roomType(viThanh, "Suite", "Phòng suite có phòng khách riêng và bồn tắm.", 3, "1 giường đôi lớn + sofa bed", 40, 950_000,
    "FREE_BEFORE_DATE", 2, 2, 2, "wifi", "air", "tv", "minibar", "bathtub", "dryer", "breakfast", "elevator", "parking");
  const sunset = hotel(thu, "Sunset Bay Resort Phú Quốc", "Kiên Giang", "Bãi Trường, xã Dương Tơ, TP. Phú Quốc", 5, "02973996688", "sunset-bay",
    "Resort năm sao trên bãi Trường: biệt thự hồ bơi riêng, bãi biển riêng ngắm hoàng hôn, spa và đưa đón sân bay.", "ACTIVE");
  const sbGarden = roomType(sunset, "Garden Villa", "Biệt thự giữa vườn nhiệt đới, hồ bơi riêng nhỏ.", 2, "1 giường king", 60, 3_200_000,
    "NON_REFUNDABLE", undefined, 1, 4, "wifi", "air", "tv", "minibar", "safe", "bathtub", "dryer", "breakfast", "airport", "pool", "gym", "parking");
  roomType(sunset, "Ocean Villa", "Biệt thự hai phòng ngủ sát biển, hồ bơi vô cực nhìn hoàng hôn.", 4, "2 giường king", 110, 5_500_000,
    "FREE_BEFORE_DATE", 7, 2, 2, "wifi", "air", "tv", "minibar", "safe", "bathtub", "dryer", "breakfast", "airport", "pool", "gym", "parking");
  const lotus = hotel(khoa, "Mekong Lotus Hotel", "Cần Thơ", "88 Nguyễn Văn Cừ, P. An Khánh, Q. Ninh Kiều", 3, "02923777666", "mekong-lotus",
    "Khách sạn mới khai trương gần Đại học Cần Thơ, đang chờ nền tảng duyệt hồ sơ.", "PENDING_APPROVAL");
  roomType(lotus, "Superior", "Phòng tiêu chuẩn mới, nội thất gỗ sen.", 2, "1 giường đôi", 24, 600_000,
    "FREE_BEFORE_DATE", 1, 1, 3, "wifi", "air", "tv", "elevator", "parking");
  user("HOTEL_STAFF", "Phạm Văn Lộc", "staff@example.com", "0945678901", ninhKieu.id);

  // ------------------------------------------------------------ đơn mẫu (đã thanh toán, tăng tồn kho như đường đặt thật)
  const booking = (u: User | null, t: RoomType, checkIn: string, checkOut: string, rooms: number, guests: number, status: BookingStatus,
    bookedDaysAgo: number, code?: string, key?: string) => {
    let base = 0, total = 0;
    for (const d of nightsOf(checkIn, checkOut)) {
      const n = night(db, t.id, d);
      n.booked += rooms;
      const b = n.priceOverride ?? t.basePrice;
      base += b * rooms;
      total += listingPrice(b, fee) * rooms;
    }
    const orderDay = addDays(checkIn, -bookedDaysAgo) < today ? addDays(checkIn, -bookedDaysAgo) : today;
    let bookedAt = at(orderDay, 9);
    if (bookedAt > now) bookedAt = now - 2 * HOUR;
    const bookingCode = code ?? randomCode("HB-", 6);
    const assigned = status === "CHECKED_IN" || status === "CHECKED_OUT"
      ? db.rooms.filter((r) => r.roomTypeId === t.id).slice(0, rooms).map((r) => r.id) : [];
    const b = insert<Booking>(db, "bookings", {
      bookingCode, accessKey: key ?? accessKey(), userId: u?.id, hotelId: t.hotelId, roomTypeId: t.id, roomIds: assigned, checkIn, checkOut,
      nights: daysBetween(checkIn, checkOut), roomsCount: rooms, guests,
      guestName: u?.fullName ?? "Lê Hoàng Nam", guestEmail: u?.email ?? "guest@example.com", guestPhone: u?.phone ?? "0987654321",
      note: u ? undefined : "Nhận phòng muộn khoảng 20:00", baseAmount: base, feeAmount: total - base, totalAmount: total,
      cancellationPolicy: t.cancellationPolicy, freeCancelDays: t.freeCancelDays, status, bookedAt,
      checkedInAt: assigned.length ? at(checkIn, 14) : undefined, checkedOutAt: status === "CHECKED_OUT" ? at(checkOut, 11) : undefined,
    });
    const inv = insert<Invoice>(db, "invoices", {
      bookingId: b.id, invoiceCode: `INV-${bookingCode.slice(3)}`, amount: total, baseAmount: base, feeAmount: total - base, createdAt: bookedAt,
    });
    insert<Payment>(db, "payments", {
      invoiceId: inv.id, amount: total, provider: "MOCK", transactionCode: `SEED-${bookingCode}`, paymentMethod: "MOCK_CARD", status: "PAID",
      createdAt: bookedAt, paidAt: bookedAt + 3 * 60_000,
    });
    return b;
  };
  const payout = (b: Booking, paidOn?: string) =>
    insert<Payout>(db, "payouts", {
      hotelId: b.hotelId, bookingId: b.id, amount: b.baseAmount, status: paidOn ? "PAID" : "PENDING", createdAt: at(b.checkOut, 11),
      paidAt: paidOn ? at(paidOn, 10) : undefined,
    });

  // Hào: nhận phòng hôm nay (lễ tân demo check-in), đơn sau 10 ngày (huỷ hoàn 100%), đơn tuần trước chưa đánh giá
  booking(hao, nkDeluxe, today, addDays(today, 2), 1, 2, "CONFIRMED", 5);
  booking(hao, nkSuperior, addDays(today, 10), addDays(today, 12), 1, 2, "CONFIRMED", 1);
  const haoPast = booking(hao, crGarden, addDays(today, -7), addDays(today, -5), 1, 2, "CHECKED_OUT", 12);
  payout(haoPast);
  insert<Notification>(db, "notifications", {
    userId: hao.id, bookingId: haoPast.id, title: "Cảm ơn bạn đã lưu trú tại Cái Răng Homestay", read: false, createdAt: at(addDays(today, -5), 11),
    content: `Hãy để lại đánh giá cho kỳ nghỉ (đơn ${haoPast.bookingCode}) để giúp khách sau chọn phòng nhé.`,
  });
  // Mai: 2 đơn đã ở và đã đánh giá, 1 đơn đang ở
  const maiSunset = booking(mai, sbGarden, addDays(today, -20), addDays(today, -17), 1, 2, "CHECKED_OUT", 40);
  payout(maiSunset, addDays(today, -15));
  insert<Review>(db, "reviews", {
    hotelId: sunset.id, bookingId: maiSunset.id, userId: mai.id, guestName: mai.fullName, rating: 5, status: "VISIBLE", createdAt: at(addDays(today, -16), 9),
    content: "Biệt thự riêng tư, hồ bơi sạch, nhân viên chu đáo. Hoàng hôn ở bãi Trường đẹp nhất từng thấy!",
  });
  const maiNk = booking(mai, nkDeluxe, addDays(today, -30), addDays(today, -28), 1, 2, "CHECKED_OUT", 45);
  payout(maiNk, addDays(today, -26));
  insert<Review>(db, "reviews", {
    hotelId: ninhKieu.id, bookingId: maiNk.id, userId: mai.id, guestName: mai.fullName, rating: 4, status: "VISIBLE", createdAt: at(addDays(today, -27), 20),
    content: "Phòng view sông rất đẹp, bữa sáng nhiều món miền Tây. Thang máy giờ cao điểm hơi chờ lâu.",
  });
  const maiStay = booking(mai, nkSuperior, addDays(today, -1), addDays(today, 1), 1, 2, "CHECKED_IN", 6);
  insert<Notification>(db, "notifications", {
    userId: mai.id, bookingId: maiStay.id, title: "Chào mừng bạn đến Ninh Kiều Riverside Hotel", read: false, createdAt: at(addDays(today, -1), 14),
    content: `Bạn đã nhận phòng ${db.rooms.find((r) => r.id === maiStay.roomIds[0])!.roomNumber}. Chúc kỳ nghỉ vui vẻ!`,
  });
  // Khách vãng lai: tra cứu bằng HB-GUEST1 + guest@example.com
  booking(null, nkDeluxe, addDays(today, 3), addDays(today, 4), 1, 2, "CONFIRMED", 2, GUEST_CODE, GUEST_KEY);
  return db;
}

// ------------------------------------------------------------------ lưu trữ

let memory: DB | null = null;

export function load(): DB {
  if (memory) return memory;
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed?.version === 2) return (memory = parsed);
    }
  } catch {
    /* localStorage bị chặn / dữ liệu hỏng → seed lại */
  }
  memory = seed();
  save(memory);
  return memory;
}

export function save(db: DB) {
  memory = db;
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* chế độ riêng tư: chỉ giữ trong bộ nhớ */
  }
}

export function invalidate() {
  memory = null;
}

export function reset() {
  memory = seed();
  save(memory);
}
