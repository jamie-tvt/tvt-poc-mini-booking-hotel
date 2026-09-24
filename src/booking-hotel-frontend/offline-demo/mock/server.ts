/**
 * API giả lập chạy trong trình duyệt — thay backend Spring Boot khi demo offline.
 * Hình dạng request/response theo docs/technical/api-contracts.md; nghiệp vụ bám các *Service.java
 * (CatalogService, BookingService, FrontDeskService, PaymentService, PortalHotelService, HotelScope…).
 */
import * as store from "./db";
import type { Booking, DB, Hotel, Payment, Room, RoomType, User } from "./db";
import { activeRoomCount, addDays, daysBetween, listingPrice, nightsOf, peekNight, randomCode, vnToday } from "./db";
import type { BookingStatus, CancellationPolicy, HotelStatus, PaymentStatus, PayoutStatus, Role } from "@/types/domain";

const PORTAL: Role[] = ["HOTEL_OWNER", "HOTEL_STAFF"];

// ------------------------------------------------------------------ lỗi

class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public errors: { field: string; message: string }[] | null = null) {
    super(message);
  }
}
const notFound = (what: string) => new HttpError(404, "NOT_FOUND", `Không tìm thấy ${what}`);
const rule = (msg: string) => new HttpError(422, "BUSINESS_RULE", msg);
const bad = (msg: string) => new HttpError(400, "BAD_REQUEST", msg);
const conflict = (msg: string) => new HttpError(409, "CONFLICT", msg);
const invalid = (field: string, message: string) => new HttpError(400, "VALIDATION_FAILED", "Dữ liệu không hợp lệ", [{ field, message }]);

const MACHINES: Record<string, Record<string, string[]>> = {
  "Đơn đặt phòng": {
    PENDING: ["CONFIRMED", "CANCELLED", "EXPIRED"], CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"], CHECKED_IN: ["CHECKED_OUT"],
  },
  "Thanh toán": { PENDING: ["PAID", "FAILED", "CANCELLED"], PAID: ["REFUNDED"] },
  "Khách sạn": { PENDING_APPROVAL: ["ACTIVE", "REJECTED"], ACTIVE: ["SUSPENDED"], SUSPENDED: ["ACTIVE"], REJECTED: ["PENDING_APPROVAL"] },
  "Khoản trả khách sạn": { PENDING: ["PAID"] },
};
function assertTransition(entity: keyof typeof MACHINES, from: string, to: string) {
  if (!(MACHINES[entity][from] ?? []).includes(to)) {
    throw new HttpError(409, "INVALID_TRANSITION", `${entity} không thể chuyển từ ${from} sang ${to}`);
  }
}

interface Ctx { db: DB; now: number; today: string; me: User | null; query: URLSearchParams; body: any; params: Record<string, string> }

// ------------------------------------------------------------------ tiện ích

const iso = (t?: number | null) => (t == null ? undefined : new Date(t).toISOString());
const vnd = (n: number) => `${n.toLocaleString("vi-VN").replace(/,/g, ".")} ₫`;
const dmy = (ymd: string) => ymd.split("-").reverse().join("/");
const setting = (db: DB, key: string, fallback: number) => {
  const v = Number.parseInt(db.settings.find((s) => s.key === key)?.value ?? "", 10);
  return Number.isFinite(v) ? v : fallback;
};
const feePercent = (db: DB) => setting(db, "platform.fee_percent", 10);
function page<T, R>(list: T[], q: URLSearchParams, map: (t: T) => R, defSize = 12) {
  const p = Math.max(0, Number.parseInt(q.get("page") ?? "0", 10) || 0);
  const raw = Number.parseInt(q.get("size") ?? "", 10);
  const size = !raw || raw < 1 ? defSize : Math.min(raw, 100);
  return { content: list.slice(p * size, p * size + size).map(map), page: p, size, totalElements: list.length, totalPages: Math.ceil(list.length / size) };
}
const byId = <T extends { id: number }>(list: T[], id: number | string | undefined | null) => list.find((x) => x.id === Number(id));
const must = <T>(v: T | undefined, what: string): T => {
  if (v === undefined) throw notFound(what);
  return v;
};
const blank = (s?: unknown) => (s == null || String(s).trim() === "" ? undefined : String(s).trim());
const isYmd = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
const PHONE = /^0\d{9,10}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function requireUser(c: Ctx, roles?: Role[]): User {
  if (!c.me) throw new HttpError(401, "UNAUTHORIZED", "Bạn cần đăng nhập để tiếp tục.");
  if (roles && !roles.includes(c.me.role)) throw new HttpError(403, "ACCESS_DENIED", "Bạn không có quyền thực hiện thao tác này.");
  return c.me;
}
function audit(db: DB, now: number, userId: number | undefined, action: string, entityType: string, entityId?: number, detail?: string, result = "SUCCESS") {
  store.insert(db, "audit", { userId, action, entityType, entityId, detail, result, createdAt: now });
}
function notify(db: DB, now: number, userId: number, bookingId: number | undefined, title: string, content: string) {
  store.insert(db, "notifications", { userId, bookingId, title, content, read: false, createdAt: now });
}
/** Khách vãng lai (không userId) không có hộp thông báo — xem trạng thái ở màn đơn. */
const notifyGuest = (db: DB, now: number, b: Booking, title: string, content: string) => {
  if (b.userId) notify(db, now, b.userId, b.id, title, content);
};

// ------------------------------------------------------------------ phạm vi khách sạn (≈ HotelScope.java) — ngoài phạm vi → 404

function scopeHotelIds(db: DB, u: User): number[] {
  if (u.role === "HOTEL_OWNER") return db.hotels.filter((h) => h.ownerId === u.id).map((h) => h.id).sort((a, b) => a - b);
  if (u.role === "HOTEL_STAFF" && u.hotelId) return [u.hotelId];
  return [];
}
function scopeHotel(db: DB, u: User, id: unknown, ownerOnly = false): Hotel {
  const h = byId(db.hotels, id as number);
  if (!h || !scopeHotelIds(db, u).includes(h.id) || (ownerOnly && h.ownerId !== u.id)) throw notFound("khách sạn");
  return h;
}
function scopeRoomType(db: DB, u: User, id: unknown, ownerOnly = false): RoomType {
  const t = byId(db.roomTypes, id as number);
  if (!t || !t.active) throw notFound("loại phòng");
  const h = byId(db.hotels, t.hotelId)!;
  if (!scopeHotelIds(db, u).includes(h.id) || (ownerOnly && h.ownerId !== u.id)) throw notFound("loại phòng");
  return t;
}
function scopeBooking(db: DB, u: User, id: unknown): Booking {
  const b = byId(db.bookings, id as number);
  if (!b || !scopeHotelIds(db, u).includes(b.hotelId)) throw notFound("đơn đặt phòng");
  return b;
}

// ------------------------------------------------------------------ mapper (≈ DtoMapper.java)

function userDto(db: DB, u: User) {
  return {
    id: u.id, fullName: u.fullName, email: u.email, phone: u.phone, role: u.role, hotelId: u.hotelId,
    hotelName: u.hotelId ? byId(db.hotels, u.hotelId)?.name : undefined, active: u.active, createdAt: iso(u.createdAt),
  };
}
function facilityDto(db: DB, id: number) {
  const f = byId(db.facilities, id);
  if (!f) return null;
  return { id: f.id, name: f.name, icon: f.icon, categoryId: f.categoryId, categoryName: byId(db.facilityCategories, f.categoryId)?.name ?? "" };
}
function facilityCatalog(db: DB) {
  return [...db.facilityCategories].sort((a, b) => a.id - b.id).map((c) => ({
    id: c.id, name: c.name,
    facilities: db.facilities.filter((f) => f.categoryId === c.id).sort((a, b) => a.id - b.id).map((f) => facilityDto(db, f.id)!),
  }));
}

interface Stay { checkIn?: string; checkOut?: string; guests: number; rooms: number }
const hasDates = (q: Stay) => !!q.checkIn;
function validateDates(checkIn: unknown, checkOut: unknown, today: string) {
  if (!isYmd(checkIn) || !isYmd(checkOut)) throw bad("Cần chọn cả ngày nhận và ngày trả phòng");
  if (checkOut <= checkIn) throw bad("Ngày trả phòng phải sau ngày nhận phòng");
  if (checkIn < today) throw bad("Ngày nhận phòng không được ở quá khứ");
  if (daysBetween(checkIn, checkOut) > 30) throw bad("Mỗi lần đặt tối đa 30 đêm");
}
function stayOf(q: URLSearchParams, today: string): Stay {
  const g = q.get("guests") ? Number(q.get("guests")) : 1;
  const r = q.get("rooms") ? Number(q.get("rooms")) : 1;
  if (!(g >= 1 && g <= 100)) throw bad("Số khách không hợp lệ");
  if (!(r >= 1 && r <= 5)) throw bad("Số phòng từ 1 đến 5");
  const ci = blank(q.get("checkIn"));
  const co = blank(q.get("checkOut"));
  if (!!ci !== !!co) throw bad("Cần chọn cả ngày nhận và ngày trả phòng");
  if (ci) validateDates(ci, co, today);
  return { checkIn: ci, checkOut: co, guests: g, rooms: r };
}
const NO_STAY: Stay = { guests: 1, rooms: 1 };

/** Báo giá 1 loại phòng cho khoảng lưu trú (≈ CatalogService.offer). */
function roomTypeOffer(db: DB, t: RoomType, q: Stay, required?: Set<number>) {
  const fee = feePercent(db);
  const active = activeRoomCount(db, t.id);
  const hasFacilities = !required || required.size === 0 || [...required].every((id) => t.facilityIds.includes(id));
  const fits = t.capacity * q.rooms >= q.guests;
  if (!hasDates(q)) {
    return { t, active, available: undefined as number | undefined, listing: listingPrice(t.basePrice, fee), nightly: undefined as undefined | { date: string; basePrice: number; listingPrice: number }[], total: undefined as number | undefined, eligible: fits && hasFacilities && active >= q.rooms };
  }
  let available = Infinity;
  const nightly = nightsOf(q.checkIn!, q.checkOut!).map((date) => {
    const n = peekNight(db, t.id, date);
    available = Math.min(available, n ? n.total - n.booked : active);
    const base = n?.priceOverride ?? t.basePrice;
    return { date, basePrice: base, listingPrice: listingPrice(base, fee) };
  });
  available = Math.max(0, available === Infinity ? 0 : available);
  const total = nightly.reduce((s, n) => s + n.listingPrice, 0) * q.rooms;
  return { t, active, available, listing: nightly[0]?.listingPrice ?? 0, nightly, total, eligible: fits && hasFacilities && available >= q.rooms };
}
type Offer = ReturnType<typeof roomTypeOffer>;

function roomTypeDto(db: DB, o: Offer) {
  const t = o.t;
  return {
    id: t.id, hotelId: t.hotelId, name: t.name, description: t.description, capacity: t.capacity, bedInfo: t.bedInfo, areaM2: t.areaM2,
    basePrice: t.basePrice, listingPrice: o.listing, totalRooms: o.active, cancellationPolicy: t.cancellationPolicy, freeCancelDays: t.freeCancelDays,
    imageUrl: t.imageUrl, facilities: [...t.facilityIds].sort((a, b) => a - b).map((id) => facilityDto(db, id)).filter(Boolean),
    availableRooms: o.available ?? null, nightlyPrices: o.nightly ?? null, stayTotal: o.total ?? null,
  };
}

function hotelOffer(db: DB, h: Hotel, q: Stay, required?: Set<number>) {
  const offers = db.roomTypes.filter((t) => t.hotelId === h.id && t.active).sort((a, b) => a.id - b.id).map((t) => roomTypeOffer(db, t, q, required));
  const eligible = offers.filter((o) => o.eligible);
  const perNight = (o: Offer) => (o.total === undefined ? o.listing : Math.ceil(o.total / q.rooms / (daysBetween(q.checkIn!, q.checkOut!) * 1000)) * 1000);
  const fromPrice = eligible.length ? Math.min(...eligible.map(perNight)) : null;
  const rs = db.reviews.filter((r) => r.hotelId === h.id && r.status === "VISIBLE");
  const ratingAverage = rs.length ? Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10 : null;
  return { h, offers, fromPrice, ratingAverage, ratingCount: rs.length, availableRoomTypes: eligible.length };
}
type HotelOffer = ReturnType<typeof hotelOffer>;

function hotelSummary(db: DB, o: HotelOffer) {
  const h = o.h;
  return {
    id: h.id, name: h.name, city: h.city, address: h.address, starRating: h.starRating, coverImageUrl: h.coverImageUrl, status: h.status,
    fromPrice: o.fromPrice, ratingAverage: o.ratingAverage, ratingCount: o.ratingCount, availableRoomTypes: o.availableRoomTypes,
    ownerName: byId(db.users, h.ownerId)?.fullName, rejectReason: h.rejectReason ?? null,
  };
}
function hotelDetail(db: DB, o: HotelOffer) {
  const h = o.h;
  const facIds = new Set<number>();
  o.offers.forEach((x) => x.t.facilityIds.forEach((id) => facIds.add(id)));
  return {
    ...hotelSummary(db, o), description: h.description, checkInTime: h.checkInTime, checkOutTime: h.checkOutTime, phone: h.phone,
    images: h.images.length ? h.images : h.coverImageUrl ? [h.coverImageUrl] : [],
    roomTypes: o.offers.map((x) => roomTypeDto(db, x)),
    facilities: [...facIds].sort((a, b) => a - b).map((id) => facilityDto(db, id)).filter(Boolean),
  };
}

const invoiceOf = (db: DB, bookingId: number) => db.invoices.find((i) => i.bookingId === bookingId);
const paymentsOf = (db: DB, bookingId: number) => {
  const inv = invoiceOf(db, bookingId);
  return inv ? db.payments.filter((p) => p.invoiceId === inv.id).sort((a, b) => a.createdAt - b.createdAt || a.id - b.id) : [];
};
const bookingOfPayment = (db: DB, p: Payment) => byId(db.bookings, byId(db.invoices, p.invoiceId)!.bookingId)!;

type View = "GUEST" | "STAFF";
function paymentDto(db: DB, p: Payment, view: View) {
  const b = bookingOfPayment(db, p);
  return {
    id: p.id, bookingCode: b.bookingCode, amount: p.amount, refundAmount: p.refundAmount ?? null, status: p.status, provider: p.provider,
    transactionCode: p.transactionCode ?? null, createdAt: iso(p.createdAt), paidAt: iso(p.paidAt) ?? null,
    checkoutUrl: view === "GUEST" && p.status === "PENDING" && p.provider === "MOCK" ? `/pay/mock/${p.id}?key=${b.accessKey}` : null,
    guestName: b.guestName, note: p.note,
  };
}

function refundPercent(policy: CancellationPolicy, freeDays: number | undefined, today: string, checkIn: string) {
  if (policy === "NON_REFUNDABLE") return 0;
  return daysBetween(today, checkIn) >= (freeDays ?? 0) ? 100 : 0;
}
const overdue = (b: Booking, now: number) => b.status === "PENDING" && b.expiresAt != null && b.expiresAt <= now;

function bookingDto(db: DB, b: Booking, c: { now: number; today: string }, view: View, withInvoice = true) {
  const ps = paymentsOf(db, b.id);
  const h = byId(db.hotels, b.hotelId)!;
  const t = byId(db.roomTypes, b.roomTypeId)!;
  const canCancel = b.status === "PENDING" || (b.status === "CONFIRMED" && c.today <= b.checkIn);
  let refundPreview = null;
  if (canCancel && b.status === "CONFIRMED") {
    const paid = ps.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
    const percent = refundPercent(b.cancellationPolicy, b.freeCancelDays, c.today, b.checkIn);
    refundPreview = { percent, amount: Math.floor((paid * percent) / 100) };
  }
  const inv = invoiceOf(db, b.id);
  const rooms = b.roomIds.map((id) => byId(db.rooms, id)?.roomNumber).filter(Boolean).sort() as string[];
  return {
    id: b.id, bookingCode: b.bookingCode, accessKey: view === "GUEST" ? b.accessKey : null, status: b.status, hotelId: h.id, hotelName: h.name,
    hotelCity: h.city, hotelCoverImageUrl: h.coverImageUrl, roomTypeId: t.id, roomTypeName: t.name, roomNumber: rooms.length ? rooms.join(", ") : null,
    checkIn: b.checkIn, checkOut: b.checkOut, nights: b.nights, roomsCount: b.roomsCount, guests: b.guests, guestName: b.guestName,
    guestEmail: b.guestEmail, guestPhone: b.guestPhone, note: b.note ?? null, baseAmount: b.baseAmount, feeAmount: b.feeAmount,
    totalAmount: b.totalAmount, bookedAt: iso(b.bookedAt), expiresAt: iso(b.expiresAt) ?? null, cancelledAt: iso(b.cancelledAt) ?? null,
    cancelReason: b.cancelReason ?? null, checkedInAt: iso(b.checkedInAt) ?? null, checkedOutAt: iso(b.checkedOutAt) ?? null,
    cancellationPolicy: b.cancellationPolicy, freeCancelDays: b.freeCancelDays ?? null, paymentStatus: ps.length ? ps[ps.length - 1].status : null,
    invoice: withInvoice && inv
      ? { id: inv.id, invoiceCode: inv.invoiceCode, amount: inv.amount, baseAmount: inv.baseAmount, feeAmount: inv.feeAmount, createdAt: iso(inv.createdAt), payments: ps.map((p) => paymentDto(db, p, view)) }
      : null,
    canPay: b.status === "PENDING" && !overdue(b, c.now),
    canCancel,
    canReview: b.status === "CHECKED_OUT" && !db.reviews.some((r) => r.bookingId === b.id),
    refundPreview,
  };
}
const reviewDto = (db: DB, r: DB["reviews"][number]) => ({
  id: r.id, hotelId: r.hotelId, bookingCode: byId(db.bookings, r.bookingId)?.bookingCode ?? "", guestName: r.guestName, rating: r.rating,
  content: r.content, status: r.status, createdAt: iso(r.createdAt),
});
function payoutDto(db: DB, p: DB["payouts"][number]) {
  return {
    id: p.id, hotelId: p.hotelId, hotelName: byId(db.hotels, p.hotelId)?.name ?? "", bookingCode: byId(db.bookings, p.bookingId)?.bookingCode ?? "",
    amount: p.amount, status: p.status, createdAt: iso(p.createdAt), paidAt: iso(p.paidAt) ?? null,
  };
}

// ------------------------------------------------------------------ vòng đời booking (≈ BookingLifecycle.java)

/** Trả tồn kho các đêm từ `from` trở đi (đêm đã qua giữ nguyên để báo cáo công suất đúng). */
function releaseNights(db: DB, b: Booking, from: string) {
  for (const d of nightsOf(b.checkIn, b.checkOut)) {
    if (d < from) continue;
    const n = peekNight(db, b.roomTypeId, d);
    if (n) n.booked = Math.max(0, n.booked - b.roomsCount);
  }
}
function settlePayments(db: DB, b: Booking, percent: number, reason: string) {
  let refunded = 0;
  for (const p of paymentsOf(db, b.id)) {
    if (p.status === "PENDING") Object.assign(p, { status: "CANCELLED", note: reason });
    else if (p.status === "PAID" && percent > 0) {
      const amount = Math.floor((p.amount * percent) / 100);
      Object.assign(p, { status: "REFUNDED", refundAmount: amount, note: `${reason} — hoàn ${percent}%` });
      refunded += amount;
    }
  }
  return refunded;
}
function cancelBooking(db: DB, b: Booking, reason: string, percent: number, now: number) {
  const wasConfirmed = b.status === "CONFIRMED";
  assertTransition("Đơn đặt phòng", b.status, "CANCELLED");
  Object.assign(b, { status: "CANCELLED", cancelledAt: now, cancelReason: reason, expiresAt: undefined });
  releaseNights(db, b, b.checkIn);
  const refunded = settlePayments(db, b, percent, reason);
  const money = !wasConfirmed ? "" : refunded > 0 ? ` Số tiền hoàn: ${vnd(refunded)}.` : " Đơn không đủ điều kiện hoàn tiền theo chính sách huỷ.";
  notifyGuest(db, now, b, `Đơn ${b.bookingCode} đã huỷ`, `Lý do: ${reason}.${money}`);
  return refunded;
}
function runExpiry(db: DB, now: number): number {
  let n = 0;
  for (const b of db.bookings) {
    if (!overdue(b, now)) continue;
    assertTransition("Đơn đặt phòng", b.status, "EXPIRED");
    Object.assign(b, { status: "EXPIRED", cancelledAt: now, cancelReason: "Quá hạn thanh toán" });
    releaseNights(db, b, b.checkIn);
    settlePayments(db, b, 100, "Quá hạn thanh toán");
    notifyGuest(db, now, b, `Đơn ${b.bookingCode} đã hết hạn`, "Đơn chưa được thanh toán trong thời gian giữ phòng nên hệ thống đã huỷ và trả phòng.");
    audit(db, now, undefined, "EXPIRE", "booking", b.id, b.bookingCode);
    n++;
  }
  return n;
}

/** Khách có key, hoặc chủ đơn đang đăng nhập (≈ BookingRef.accessibleBy). */
function accessible(c: Ctx, code: unknown, key: unknown): Booking {
  const b = c.db.bookings.find((x) => x.bookingCode === String(code ?? "").trim().toUpperCase());
  if (!b || !((key && key === b.accessKey) || (b.userId && c.me?.id === b.userId))) throw notFound("đơn đặt phòng");
  return b;
}
const occupiedRoomIds = (db: DB) => new Set(db.bookings.filter((b) => b.status === "CHECKED_IN").flatMap((b) => b.roomIds));

// ------------------------------------------------------------------ xác thực

function issueTokens(db: DB, u: User, family = randomCode("F", 12)) {
  const refreshToken = `demo-rt.${randomCode("", 32)}`;
  db.tokens.push({ token: refreshToken, userId: u.id, family, revoked: false });
  if (db.tokens.length > 200) db.tokens.splice(0, db.tokens.length - 200);
  return { accessToken: `demo-at.${u.id}.${randomCode("", 16)}`, refreshToken, expiresIn: 86_400, user: userDto(db, u) };
}
function userFromAuth(db: DB, header: string | null): User | null {
  const m = /^Bearer demo-at\.(\d+)\./.exec(header ?? "");
  if (!m) return null;
  const u = byId(db.users, m[1]);
  if (!u) return null;
  if (!u.active) throw new HttpError(403, "ACCOUNT_DISABLED", "Tài khoản đã bị khoá");
  return u;
}

// ------------------------------------------------------------------ bảng route

type Handler = (c: Ctx) => unknown;
type Method = "GET" | "POST" | "PUT" | "DELETE";
const routes: { method: Method; re: RegExp; keys: string[]; handler: Handler; status?: number; message?: string }[] = [];
function on(method: Method, pattern: string, handler: Handler, opts: { status?: number; message?: string } = {}) {
  const keys: string[] = [];
  const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), "([^/]+)"))}$`);
  routes.push({ method, re, keys, handler, ...opts });
}

// ---- 5.1 Xác thực
on("POST", "/auth/register", ({ db, now, body }) => {
  const fullName = blank(body.fullName);
  const email = blank(body.email)?.toLowerCase();
  if (!fullName) throw invalid("fullName", "Vui lòng nhập họ tên");
  if (!email || !EMAIL.test(email)) throw invalid("email", "Email không hợp lệ");
  if (!body.password || String(body.password).length < 8) throw invalid("password", "Mật khẩu tối thiểu 8 ký tự");
  if (body.confirmPassword !== undefined && body.password !== body.confirmPassword) throw bad("Mật khẩu xác nhận không khớp");
  if (body.phone && !PHONE.test(String(body.phone).trim())) throw invalid("phone", "Số điện thoại không hợp lệ");
  if (db.users.some((u) => u.email.toLowerCase() === email)) throw new HttpError(409, "EMAIL_EXISTS", "Email này đã được đăng ký");
  const u = store.insert<User>(db, "users", { role: "CUSTOMER", fullName, email, password: body.password, phone: blank(body.phone), active: true, createdAt: now });
  audit(db, now, u.id, "REGISTER", "user", u.id);
  return userDto(db, u);
}, { status: 201, message: "Đăng ký thành công" });
on("POST", "/auth/login", ({ db, now, body }) => {
  const email = String(body.email ?? "").trim().toLowerCase();
  const u = db.users.find((x) => x.email.toLowerCase() === email);
  if (!u || u.password !== body.password) {
    audit(db, now, u?.id, "LOGIN", "user", u?.id, `email=${email}`, "FAILURE");
    throw new HttpError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng");
  }
  if (!u.active) throw new HttpError(403, "ACCOUNT_DISABLED", "Tài khoản đã bị khoá, vui lòng liên hệ quản trị viên");
  audit(db, now, u.id, "LOGIN", "user", u.id);
  return issueTokens(db, u);
});
on("POST", "/auth/refresh", ({ db, body }) => {
  const t = db.tokens.find((x) => x.token === body.refreshToken);
  if (!t) throw new HttpError(401, "INVALID_REFRESH_TOKEN", "Phiên đăng nhập không hợp lệ");
  if (t.revoked) {
    db.tokens.filter((x) => x.family === t.family).forEach((x) => (x.revoked = true));
    throw new HttpError(401, "INVALID_REFRESH_TOKEN", "Phiên đăng nhập đã bị thu hồi, vui lòng đăng nhập lại");
  }
  const u = byId(db.users, t.userId)!;
  if (!u.active) throw new HttpError(403, "ACCOUNT_DISABLED", "Tài khoản đã bị khoá");
  t.revoked = true;
  return issueTokens(db, u, t.family);
});
on("POST", "/auth/logout", ({ db, body }) => {
  const t = db.tokens.find((x) => x.token === body.refreshToken);
  if (t) db.tokens.filter((x) => x.family === t.family).forEach((x) => (x.revoked = true));
  return null;
});
on("GET", "/users/me", (c) => userDto(c.db, requireUser(c)));
on("PUT", "/users/me", (c) => {
  const u = requireUser(c);
  const fullName = blank(c.body.fullName);
  if (!fullName) throw invalid("fullName", "Vui lòng nhập họ tên");
  if (c.body.phone && !PHONE.test(String(c.body.phone).trim())) throw invalid("phone", "Số điện thoại không hợp lệ");
  u.fullName = fullName;
  u.phone = blank(c.body.phone);
  return userDto(c.db, u);
}, { message: "Đã cập nhật hồ sơ" });

// ---- 5.2 Công khai
const csv = (raw: string | null) => {
  if (!raw) return new Set<number>();
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.some((s) => !/^\d+$/.test(s))) throw bad("Tham số danh sách phải là các số cách nhau bởi dấu phẩy");
  return new Set(parts.map(Number));
};
on("GET", "/hotels/search", ({ db, today, query }) => {
  const q = stayOf(query, today);
  const city = blank(query.get("city"))?.toLowerCase();
  const stars = csv(query.get("stars"));
  const facilityIds = csv(query.get("facilityIds"));
  const minPrice = query.get("minPrice") ? Number(query.get("minPrice")) : undefined;
  const maxPrice = query.get("maxPrice") ? Number(query.get("maxPrice")) : undefined;
  const byRating = (a: HotelOffer, b: HotelOffer) => (b.ratingAverage ?? 0) - (a.ratingAverage ?? 0) || b.ratingCount - a.ratingCount;
  const sort = (query.get("sort") ?? "").trim().toLowerCase();
  const cmp: Record<string, (a: HotelOffer, b: HotelOffer) => number> = {
    "": (a, b) => byRating(a, b) || a.h.id - b.h.id,
    "rating": (a, b) => byRating(a, b) || a.h.id - b.h.id,
    "rating,desc": (a, b) => byRating(a, b) || a.h.id - b.h.id,
    "price": (a, b) => a.fromPrice! - b.fromPrice! || a.h.id - b.h.id,
    "price,asc": (a, b) => a.fromPrice! - b.fromPrice! || a.h.id - b.h.id,
    "price,desc": (a, b) => b.fromPrice! - a.fromPrice! || a.h.id - b.h.id,
    "stars": (a, b) => b.h.starRating - a.h.starRating || byRating(a, b),
    "stars,desc": (a, b) => b.h.starRating - a.h.starRating || byRating(a, b),
  };
  if (!cmp[sort]) throw bad("sort chỉ nhận price,asc | price,desc | rating | stars");
  const offers = db.hotels
    .filter((h) => h.status === "ACTIVE" && (!city || h.city.toLowerCase().includes(city)) && (stars.size === 0 || stars.has(h.starRating)))
    .sort((a, b) => a.id - b.id)
    .map((h) => hotelOffer(db, h, q, facilityIds))
    .filter((o) => o.availableRoomTypes > 0 && o.fromPrice != null)
    .filter((o) => (minPrice === undefined || o.fromPrice! >= minPrice) && (maxPrice === undefined || o.fromPrice! <= maxPrice))
    .sort(cmp[sort]);
  return page(offers, query, (o) => hotelSummary(db, o));
});
on("GET", "/hotels/:id", ({ db, today, query, params }) => {
  const h = byId(db.hotels, params.id);
  if (!h || h.status !== "ACTIVE") throw notFound("khách sạn");
  return hotelDetail(db, hotelOffer(db, h, stayOf(query, today)));
});
on("GET", "/hotels/:id/reviews", ({ db, params, query }) => {
  const h = byId(db.hotels, params.id);
  if (!h || h.status !== "ACTIVE") throw notFound("khách sạn");
  return page(db.reviews.filter((r) => r.hotelId === h.id && r.status === "VISIBLE").sort((a, b) => b.createdAt - a.createdAt), query, (r) => reviewDto(db, r));
});
on("GET", "/cities", ({ db }) => [...new Set(db.hotels.filter((h) => h.status === "ACTIVE").map((h) => h.city))].sort((a, b) => a.localeCompare(b, "vi")));
on("GET", "/facility-categories", ({ db }) => facilityCatalog(db));

// ---- 5.3 Đặt phòng phía khách
on("POST", "/bookings", (c) => {
  const { db, now, today, body } = c;
  if (!body.roomTypeId) throw invalid("roomTypeId", "Vui lòng chọn loại phòng");
  if (!isYmd(body.checkIn)) throw invalid("checkIn", "Vui lòng chọn ngày nhận phòng");
  if (!isYmd(body.checkOut)) throw invalid("checkOut", "Vui lòng chọn ngày trả phòng");
  const rooms = Number(body.roomsCount);
  const guests = Number(body.guests);
  if (!(rooms >= 1)) throw invalid("roomsCount", "Tối thiểu 1 phòng");
  if (rooms > 5) throw invalid("roomsCount", "Tối đa 5 phòng mỗi đơn");
  if (!(guests >= 1)) throw invalid("guests", "Tối thiểu 1 khách");
  if (!blank(body.guestName)) throw invalid("guestName", "Vui lòng nhập họ tên");
  if (!blank(body.guestEmail)) throw invalid("guestEmail", "Vui lòng nhập email");
  if (!EMAIL.test(String(body.guestEmail).trim())) throw invalid("guestEmail", "Email không hợp lệ");
  if (!blank(body.guestPhone)) throw invalid("guestPhone", "Vui lòng nhập số điện thoại");
  if (!PHONE.test(String(body.guestPhone).trim())) throw invalid("guestPhone", "Số điện thoại không hợp lệ");
  validateDates(body.checkIn, body.checkOut, today);
  const t = byId(db.roomTypes, body.roomTypeId);
  if (!t || !t.active) throw notFound("loại phòng");
  if (byId(db.hotels, t.hotelId)!.status !== "ACTIVE") throw rule("Khách sạn hiện không nhận đặt phòng");
  if (t.capacity * rooms < guests) throw rule(`Loại phòng này chứa tối đa ${t.capacity * rooms} khách cho ${rooms} phòng`);
  const dates = nightsOf(body.checkIn, body.checkOut);
  // Kiểm MỌI đêm trước khi giữ: thiếu 1 đêm → 409, không đêm nào bị giữ
  for (const d of dates) {
    const n = store.night(db, t.id, d);
    const avail = n.total - n.booked;
    if (avail < rooms) {
      throw new HttpError(409, "ROOM_UNAVAILABLE", avail <= 0 ? `Loại phòng này đã hết phòng đêm ${dmy(d)}` : `Đêm ${dmy(d)} chỉ còn ${avail} phòng`);
    }
  }
  const fee = feePercent(db);
  let base = 0, total = 0;
  for (const d of dates) {
    const n = store.night(db, t.id, d);
    n.booked += rooms;
    const bp = n.priceOverride ?? t.basePrice;
    base += bp * rooms;
    total += listingPrice(bp, fee) * rooms;
  }
  let code: string;
  do code = randomCode("HB-", 6);
  while (db.bookings.some((b) => b.bookingCode === code));
  const userId = c.me?.role === "CUSTOMER" ? c.me.id : undefined;
  const b = store.insert<Booking>(db, "bookings", {
    bookingCode: code, accessKey: store.accessKey(), userId, hotelId: t.hotelId, roomTypeId: t.id, roomIds: [], checkIn: body.checkIn, checkOut: body.checkOut,
    nights: dates.length, roomsCount: rooms, guests, guestName: String(body.guestName).trim(), guestEmail: String(body.guestEmail).trim().toLowerCase(),
    guestPhone: String(body.guestPhone).trim(), note: blank(body.note), baseAmount: base, feeAmount: total - base, totalAmount: total,
    cancellationPolicy: t.cancellationPolicy, freeCancelDays: t.freeCancelDays, status: "PENDING", bookedAt: now,
    expiresAt: now + setting(db, "booking.payment_timeout_minutes", 15) * 60_000,
  });
  store.insert(db, "invoices", { bookingId: b.id, invoiceCode: `INV-${code.slice(3)}`, amount: total, baseAmount: base, feeAmount: total - base, createdAt: now });
  notifyGuest(db, now, b, `Đã giữ phòng ${code}`, `Vui lòng thanh toán ${vnd(total)} trước khi hết thời gian giữ phòng.`);
  audit(db, now, userId, "CREATE", "booking", b.id, `${code} ${t.name} x${rooms} ${b.checkIn}→${b.checkOut}`);
  return bookingDto(db, b, c, "GUEST");
}, { status: 201, message: "Đã giữ phòng, vui lòng thanh toán" });

on("GET", "/bookings/code/:code", (c) => bookingDto(c.db, accessible(c, c.params.code, c.query.get("key")), c, "GUEST"));
on("POST", "/bookings/lookup", (c) => {
  if (!blank(c.body.bookingCode)) throw invalid("bookingCode", "Vui lòng nhập mã đặt phòng");
  if (!blank(c.body.email)) throw invalid("email", "Vui lòng nhập email");
  const b = c.db.bookings.find((x) => x.bookingCode === String(c.body.bookingCode).trim().toUpperCase()
    && x.guestEmail.toLowerCase() === String(c.body.email).trim().toLowerCase());
  if (!b) throw notFound("đơn đặt phòng");
  return bookingDto(c.db, b, c, "GUEST");
});
on("POST", "/bookings/code/:code/cancel", (c) => {
  const b = accessible(c, c.params.code, c.query.get("key"));
  let percent = 0;
  if (b.status === "CONFIRMED") {
    if (c.today > b.checkIn) throw rule("Đã qua ngày nhận phòng nên không thể huỷ");
    percent = refundPercent(b.cancellationPolicy, b.freeCancelDays, c.today, b.checkIn);
  }
  const refunded = cancelBooking(c.db, b, blank(c.body?.reason) ?? "Khách huỷ", percent, c.now);
  audit(c.db, c.now, c.me?.id, "CANCEL", "booking", b.id, `hoàn ${percent}% = ${refunded}`);
  return bookingDto(c.db, b, c, "GUEST");
}, { message: "Đã huỷ đơn đặt phòng" });
on("POST", "/bookings/code/:code/payment", (c) => {
  const b = accessible(c, c.params.code, c.query.get("key"));
  if (b.status !== "PENDING") throw rule("Đơn này không ở trạng thái chờ thanh toán");
  if (overdue(b, c.now)) throw rule("Đơn đã quá hạn thanh toán, vui lòng đặt lại");
  const inv = invoiceOf(c.db, b.id)!;
  const p = paymentsOf(c.db, b.id).find((x) => x.status === "PENDING" && x.provider === "MOCK")
    ?? store.insert<Payment>(c.db, "payments", { invoiceId: inv.id, amount: inv.amount, provider: "MOCK", status: "PENDING", createdAt: c.now });
  audit(c.db, c.now, c.me?.id, "INITIATE", "payment", p.id, b.bookingCode);
  return paymentDto(c.db, p, "GUEST");
});
function accessiblePayment(c: Ctx): Payment {
  const p = byId(c.db.payments, c.params.id);
  if (!p) throw notFound("thanh toán");
  const b = bookingOfPayment(c.db, p);
  const key = c.query.get("key");
  if (!((key && key === b.accessKey) || (b.userId && c.me?.id === b.userId))) throw notFound("thanh toán");
  return p;
}
on("GET", "/payments/:id", (c) => paymentDto(c.db, accessiblePayment(c), "GUEST"));
/** Trang "cổng giả lập" gọi — đi đúng đường xử lý webhook (idempotent, kiểm trạng thái). */
on("POST", "/payments/mock/:id/complete", (c) => {
  const { db, now } = c;
  const p = accessiblePayment(c);
  const b = bookingOfPayment(db, p);
  if (p.status !== "PENDING") return paymentDto(db, p, "GUEST");
  const tx = randomCode("MOCK-", 10);
  if (c.body.result !== "SUCCESS") {
    Object.assign(p, { status: "FAILED", transactionCode: tx, note: "Cổng thanh toán báo thất bại" });
    notifyGuest(db, now, b, "Thanh toán chưa thành công", `Giao dịch cho đơn ${b.bookingCode} thất bại. Bạn có thể thanh toán lại trước khi hết thời gian giữ phòng.`);
    audit(db, now, undefined, "PAYMENT_FAILED", "payment", p.id, tx);
    return paymentDto(db, p, "GUEST");
  }
  Object.assign(p, { status: "PAID", transactionCode: tx, paymentMethod: "MOCK_CARD", paidAt: now });
  const h = byId(db.hotels, b.hotelId)!;
  if (b.status === "PENDING") {
    Object.assign(b, { status: "CONFIRMED", expiresAt: undefined });
    notifyGuest(db, now, b, `Đặt phòng thành công ${b.bookingCode}`, `Đã nhận ${vnd(p.amount)}. Hẹn gặp bạn tại ${h.name} ngày ${dmy(b.checkIn)}!`);
    notify(db, now, h.ownerId, b.id, `Đơn mới ${b.bookingCode}`,
      `${b.guestName} đặt ${b.roomsCount} phòng ${byId(db.roomTypes, b.roomTypeId)!.name}, nhận phòng ${dmy(b.checkIn)}.`);
    audit(db, now, undefined, "PAYMENT_PAID", "payment", p.id, tx);
  } else {
    Object.assign(p, { status: "REFUNDED", refundAmount: p.amount, note: `Nhận tiền khi đơn đã ${b.status} — hoàn tự động` });
    notifyGuest(db, now, b, `Đơn ${b.bookingCode} đã hết hiệu lực`, "Hệ thống nhận được tiền sau khi đơn hết hạn nên đã hoàn lại toàn bộ.");
    audit(db, now, undefined, "PAYMENT_LATE_REFUND", "payment", p.id, tx);
  }
  return paymentDto(db, p, "GUEST");
});
on("GET", "/users/me/bookings", (c) => {
  const me = requireUser(c, ["CUSTOMER"]);
  const status = blank(c.query.get("status")) as BookingStatus | undefined;
  const list = c.db.bookings.filter((b) => b.userId === me.id && (!status || b.status === status)).sort((a, b) => b.bookedAt - a.bookedAt);
  return page(list, c.query, (b) => bookingDto(c.db, b, c, "GUEST", false));
});
on("POST", "/reviews", (c) => {
  const rating = Number(c.body.rating);
  const content = String(c.body.content ?? "").trim();
  if (!(rating >= 1 && rating <= 5)) throw invalid("rating", "Điểm đánh giá từ 1 đến 5");
  if (content.length < 10) throw invalid("content", "Nội dung tối thiểu 10 ký tự");
  const b = accessible(c, c.body.bookingCode, c.body.key);
  if (b.status !== "CHECKED_OUT") throw rule("Bạn chỉ đánh giá được sau khi đã trả phòng");
  if (c.db.reviews.some((r) => r.bookingId === b.id)) throw new HttpError(409, "ALREADY_REVIEWED", "Bạn đã đánh giá kỳ nghỉ này");
  const r = store.insert<DB["reviews"][number]>(c.db, "reviews", {
    hotelId: b.hotelId, bookingId: b.id, userId: b.userId, guestName: b.guestName, rating, content, status: "VISIBLE", createdAt: c.now,
  });
  audit(c.db, c.now, c.me?.id, "CREATE", "review", r.id, `${b.bookingCode} rating=${rating}`);
  return reviewDto(c.db, r);
}, { status: 201, message: "Cảm ơn bạn đã đánh giá" });

// ---- 5.4 Hotel Portal — khách sạn
function validateHotel(b: any) {
  if (!blank(b.name)) throw invalid("name", "Vui lòng nhập tên khách sạn");
  if (!blank(b.city)) throw invalid("city", "Vui lòng nhập thành phố");
  if (!blank(b.address)) throw invalid("address", "Vui lòng nhập địa chỉ");
  if (!blank(b.description)) throw invalid("description", "Vui lòng nhập mô tả");
  const stars = Number(b.starRating);
  if (!(stars >= 1 && stars <= 5)) throw invalid("starRating", "Hạng sao từ 1 đến 5");
  if (b.phone && !PHONE.test(String(b.phone).trim())) throw invalid("phone", "Số điện thoại không hợp lệ");
  const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!TIME.test(String(b.checkInTime ?? ""))) throw invalid("checkInTime", "Giờ nhận phòng dạng HH:mm");
  if (!TIME.test(String(b.checkOutTime ?? ""))) throw invalid("checkOutTime", "Giờ trả phòng dạng HH:mm");
  return {
    name: String(b.name).trim(), city: String(b.city).trim(), address: String(b.address).trim(), description: String(b.description).trim(),
    starRating: stars, phone: blank(b.phone), checkInTime: b.checkInTime, checkOutTime: b.checkOutTime, coverImageUrl: blank(b.coverImageUrl),
  };
}
on("GET", "/portal/hotels", (c) => {
  const me = requireUser(c, PORTAL);
  return scopeHotelIds(c.db, me).map((id) => hotelSummary(c.db, hotelOffer(c.db, byId(c.db.hotels, id)!, NO_STAY)));
});
on("GET", "/portal/hotels/:id", (c) => hotelDetail(c.db, hotelOffer(c.db, scopeHotel(c.db, requireUser(c, PORTAL), c.params.id), NO_STAY)));
on("POST", "/portal/hotels", (c) => {
  const me = requireUser(c, ["HOTEL_OWNER"]);
  const v = validateHotel(c.body);
  const h = store.insert<Hotel>(c.db, "hotels", {
    ownerId: me.id, ...v, images: v.coverImageUrl ? [v.coverImageUrl] : [], status: "PENDING_APPROVAL", createdAt: c.now, updatedAt: c.now,
  });
  audit(c.db, c.now, me.id, "CREATE", "hotel", h.id, h.name);
  return hotelDetail(c.db, hotelOffer(c.db, h, NO_STAY));
}, { status: 201, message: "Đã gửi khách sạn chờ duyệt" });
on("PUT", "/portal/hotels/:id", (c) => {
  const me = requireUser(c, ["HOTEL_OWNER"]);
  const h = scopeHotel(c.db, me, c.params.id, true);
  const v = validateHotel(c.body);
  const before = h.status;
  Object.assign(h, v, { updatedAt: c.now });
  if (v.coverImageUrl && !h.images.includes(v.coverImageUrl)) h.images = [v.coverImageUrl, ...h.images];
  if (h.status === "REJECTED") {
    h.status = "PENDING_APPROVAL"; // sửa xong gửi duyệt lại
    h.rejectReason = undefined;
  }
  audit(c.db, c.now, me.id, "UPDATE", "hotel", h.id, before === h.status ? undefined : `${before} → ${h.status}`);
  return hotelDetail(c.db, hotelOffer(c.db, h, NO_STAY));
}, { message: "Đã lưu hồ sơ khách sạn" });

// Loại phòng
function applyRoomType(c: Ctx, t: Partial<RoomType>) {
  const b = c.body;
  if (!blank(b.name)) throw invalid("name", "Vui lòng nhập tên loại phòng");
  if (!blank(b.description)) throw invalid("description", "Vui lòng nhập mô tả");
  const capacity = Number(b.capacity);
  if (!(capacity >= 1)) throw invalid("capacity", "Sức chứa từ 1 khách");
  if (capacity > 20) throw invalid("capacity", "Sức chứa tối đa 20 khách");
  if (!blank(b.bedInfo)) throw invalid("bedInfo", "Vui lòng nhập thông tin giường");
  if (!(Number(b.areaM2) >= 1)) throw invalid("areaM2", "Diện tích phải lớn hơn 0");
  if (!(Number(b.basePrice) >= 1000)) throw invalid("basePrice", "Giá cơ bản tối thiểu 1.000đ");
  const policy = b.cancellationPolicy as CancellationPolicy;
  if (policy !== "FREE_BEFORE_DATE" && policy !== "NON_REFUNDABLE") throw invalid("cancellationPolicy", "Vui lòng chọn chính sách huỷ");
  const freeDays = b.freeCancelDays == null || b.freeCancelDays === "" ? undefined : Number(b.freeCancelDays);
  if (policy === "FREE_BEFORE_DATE" && (freeDays === undefined || freeDays < 0 || freeDays > 60)) throw bad("Chính sách huỷ miễn phí cần số ngày từ 0 đến 60");
  const ids: number[] = (b.facilityIds ?? []).map(Number);
  if (ids.some((id) => !byId(c.db.facilities, id))) throw bad("Có tiện nghi không tồn tại");
  return Object.assign(t, {
    name: String(b.name).trim(), description: String(b.description).trim(), capacity, bedInfo: String(b.bedInfo).trim(), areaM2: Number(b.areaM2),
    basePrice: Number(b.basePrice), cancellationPolicy: policy, freeCancelDays: policy === "FREE_BEFORE_DATE" ? freeDays : undefined,
    imageUrl: blank(b.imageUrl), facilityIds: [...new Set(ids)],
  });
}
const roomTypeOut = (db: DB, t: RoomType) => roomTypeDto(db, roomTypeOffer(db, t, NO_STAY));
on("GET", "/portal/hotels/:id/room-types", (c) => {
  const h = scopeHotel(c.db, requireUser(c, PORTAL), c.params.id);
  return hotelOffer(c.db, h, NO_STAY).offers.map((o) => roomTypeDto(c.db, o));
});
on("POST", "/portal/hotels/:id/room-types", (c) => {
  const me = requireUser(c, ["HOTEL_OWNER"]);
  const h = scopeHotel(c.db, me, c.params.id, true);
  const values = applyRoomType(c, {});
  const t = store.insert<RoomType>(c.db, "roomTypes", { ...(values as RoomType), hotelId: h.id, active: true, createdAt: c.now });
  audit(c.db, c.now, me.id, "CREATE", "room_type", t.id, t.name);
  return roomTypeOut(c.db, t);
}, { status: 201, message: "Đã tạo loại phòng" });
on("PUT", "/portal/room-types/:id", (c) => {
  const me = requireUser(c, ["HOTEL_OWNER"]);
  const t = scopeRoomType(c.db, me, c.params.id, true);
  applyRoomType(c, t);
  audit(c.db, c.now, me.id, "UPDATE", "room_type", t.id);
  return roomTypeOut(c.db, t);
}, { message: "Đã lưu loại phòng" });
on("DELETE", "/portal/room-types/:id", (c) => {
  const me = requireUser(c, ["HOTEL_OWNER"]);
  const t = scopeRoomType(c.db, me, c.params.id, true);
  const busy = c.db.bookings.some((b) => b.roomTypeId === t.id && ["PENDING", "CONFIRMED", "CHECKED_IN"].includes(b.status) && b.checkOut > c.today);
  if (busy) throw conflict("Loại phòng còn đơn đặt chưa hoàn tất nên chưa thể xoá");
  t.active = false;
  audit(c.db, c.now, me.id, "DELETE", "room_type", t.id, t.name);
  return null;
}, { message: "Đã xoá loại phòng" });
on("PUT", "/portal/room-types/:id/prices", (c) => {
  const me = requireUser(c, ["HOTEL_OWNER"]);
  const { from, to } = c.body;
  const price = c.body.price == null || c.body.price === "" ? undefined : Number(c.body.price);
  if (!isYmd(from) || !isYmd(to)) throw bad("Vui lòng chọn khoảng ngày");
  if (to < from) throw bad("Ngày kết thúc phải từ ngày bắt đầu trở đi");
  if (from < c.today) throw bad("Không đặt giá cho ngày đã qua");
  if (daysBetween(from, to) + 1 > 366) throw bad("Mỗi lần đặt giá tối đa 366 ngày");
  if (price !== undefined && price < 1000) throw invalid("price", "Giá tối thiểu 1.000đ");
  const t = scopeRoomType(c.db, me, c.params.id, true);
  const dates = nightsOf(from, addDays(to, 1));
  for (const d of dates) store.night(c.db, t.id, d).priceOverride = price;
  audit(c.db, c.now, me.id, "SET_PRICE", "room_type", t.id, `${from}..${to} = ${price ?? "mặc định"}`);
  return { updatedNights: dates.length };
}, { message: "Đã cập nhật giá theo ngày" });

// Phòng
const roomDto = (db: DB, r: Room, occupied: Set<number>) => ({
  id: r.id, roomTypeId: r.roomTypeId, roomTypeName: byId(db.roomTypes, r.roomTypeId)?.name ?? "", roomNumber: r.roomNumber, active: r.active,
  occupied: occupied.has(r.id),
});
/** Số phòng hoạt động đổi → cập nhật tổng phòng các đêm từ hôm nay; không được xuống dưới số đã bán (409). */
function syncTotals(db: DB, roomTypeId: number, today: string, newActive: number) {
  const rows = Object.entries(db.inventory).filter(([k]) => k.startsWith(`${roomTypeId}@`) && k.slice(k.indexOf("@") + 1) >= today);
  for (const [k, n] of rows) {
    if (newActive < n.booked) throw conflict(`Đêm ${dmy(k.split("@")[1])} đã bán ${n.booked} phòng, không thể giảm tổng phòng xuống ${newActive}`);
  }
  rows.forEach(([, n]) => (n.total = newActive));
}
on("GET", "/portal/room-types/:id/rooms", (c) => {
  const t = scopeRoomType(c.db, requireUser(c, PORTAL), c.params.id);
  const occ = occupiedRoomIds(c.db);
  return c.db.rooms.filter((r) => r.roomTypeId === t.id).sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, "vi", { numeric: true })).map((r) => roomDto(c.db, r, occ));
});
on("POST", "/portal/room-types/:id/rooms", (c) => {
  const me = requireUser(c, ["HOTEL_OWNER"]);
  const t = scopeRoomType(c.db, me, c.params.id, true);
  const number = blank(c.body.roomNumber);
  if (!number) throw invalid("roomNumber", "Vui lòng nhập số phòng");
  if (c.db.rooms.some((r) => r.hotelId === t.hotelId && r.roomNumber === number)) throw conflict(`Số phòng ${number} đã tồn tại`);
  syncTotals(c.db, t.id, c.today, activeRoomCount(c.db, t.id) + 1);
  const r = store.insert<Room>(c.db, "rooms", { roomTypeId: t.id, hotelId: t.hotelId, roomNumber: number, active: true });
  audit(c.db, c.now, me.id, "CREATE", "room", r.id, `${t.name} #${number}`);
  return roomDto(c.db, r, new Set());
}, { status: 201, message: "Đã thêm phòng" });
on("PUT", "/portal/rooms/:id", (c) => {
  const me = requireUser(c, ["HOTEL_OWNER"]);
  const r = byId(c.db.rooms, c.params.id);
  if (!r || byId(c.db.hotels, r.hotelId)?.ownerId !== me.id) throw notFound("phòng");
  const number = blank(c.body.roomNumber);
  if (!number) throw invalid("roomNumber", "Vui lòng nhập số phòng");
  const active = !!c.body.active;
  if (number !== r.roomNumber && c.db.rooms.some((x) => x.hotelId === r.hotelId && x.roomNumber === number)) throw conflict(`Số phòng ${number} đã tồn tại`);
  const occ = occupiedRoomIds(c.db);
  if (!active && occ.has(r.id)) throw conflict("Phòng đang có khách, chưa thể tạm ngừng");
  const changed = r.active !== active;
  if (changed) syncTotals(c.db, r.roomTypeId, c.today, activeRoomCount(c.db, r.roomTypeId) + (active ? 1 : -1));
  r.roomNumber = number;
  r.active = active;
  audit(c.db, c.now, me.id, "UPDATE", "room", r.id, number + (changed ? (active ? " bật" : " tắt") : ""));
  return roomDto(c.db, r, occ);
}, { message: "Đã lưu phòng" });

// Nhân viên
on("GET", "/portal/hotels/:id/staff", (c) => {
  const h = scopeHotel(c.db, requireUser(c, ["HOTEL_OWNER"]), c.params.id, true);
  return c.db.users.filter((u) => u.role === "HOTEL_STAFF" && u.hotelId === h.id).sort((a, b) => a.fullName.localeCompare(b.fullName, "vi")).map((u) => userDto(c.db, u));
});
function createUser(c: Ctx, role: Role, hotelId: number | undefined) {
  const b = c.body;
  const email = blank(b.email)?.toLowerCase();
  if (!blank(b.fullName)) throw invalid("fullName", "Vui lòng nhập họ tên");
  if (!email || !EMAIL.test(email)) throw invalid("email", "Email không hợp lệ");
  if (!b.password || String(b.password).length < 8) throw invalid("password", "Mật khẩu tối thiểu 8 ký tự");
  if (b.phone && !PHONE.test(String(b.phone).trim())) throw invalid("phone", "Số điện thoại không hợp lệ");
  if (c.db.users.some((u) => u.email.toLowerCase() === email)) throw new HttpError(409, "EMAIL_EXISTS", "Email này đã được đăng ký");
  if (role === "HOTEL_STAFF" && !byId(c.db.hotels, hotelId)) throw bad("Nhân viên phải thuộc một khách sạn hợp lệ");
  const u = store.insert<User>(c.db, "users", {
    role, fullName: String(b.fullName).trim(), email, password: b.password, phone: blank(b.phone), hotelId: role === "HOTEL_STAFF" ? hotelId : undefined,
    active: true, createdAt: c.now,
  });
  audit(c.db, c.now, c.me?.id, "CREATE", "user", u.id, `role=${role}${hotelId ? ` hotel=${hotelId}` : ""}`);
  return u;
}
function setActive(c: Ctx, u: User, active: boolean) {
  if (u.id === c.me?.id && !active) throw rule("Không thể tự khoá tài khoản của chính mình");
  u.active = active;
  if (!active) c.db.tokens.filter((t) => t.userId === u.id).forEach((t) => (t.revoked = true));
  audit(c.db, c.now, c.me?.id, active ? "UNLOCK" : "LOCK", "user", u.id);
  return userDto(c.db, u);
}
on("POST", "/portal/hotels/:id/staff", (c) => {
  const h = scopeHotel(c.db, requireUser(c, ["HOTEL_OWNER"]), c.params.id, true);
  return userDto(c.db, createUser(c, "HOTEL_STAFF", h.id));
}, { status: 201, message: "Đã tạo tài khoản nhân viên" });
on("PUT", "/portal/staff/:id/active", (c) => {
  const me = requireUser(c, ["HOTEL_OWNER"]);
  const u = byId(c.db.users, c.params.id);
  if (!u || u.role !== "HOTEL_STAFF") throw notFound("nhân viên");
  scopeHotel(c.db, me, u.hotelId, true);
  return setActive(c, u, !!c.body.active);
});
on("GET", "/portal/payouts", (c) => {
  const me = requireUser(c, ["HOTEL_OWNER"]);
  const ids = c.query.get("hotelId") ? [scopeHotel(c.db, me, c.query.get("hotelId"), true).id] : scopeHotelIds(c.db, me);
  const status = blank(c.query.get("status")) as PayoutStatus | undefined;
  const list = c.db.payouts.filter((p) => ids.includes(p.hotelId) && (!status || p.status === status)).sort((a, b) => b.createdAt - a.createdAt);
  return page(list, c.query, (p) => payoutDto(c.db, p));
});

// Lễ tân (≈ FrontDeskService.java)
on("GET", "/portal/bookings", (c) => {
  const me = requireUser(c, PORTAL);
  const ids = c.query.get("hotelId") ? [scopeHotel(c.db, me, c.query.get("hotelId")).id] : scopeHotelIds(c.db, me);
  const status = blank(c.query.get("status")) as BookingStatus | undefined;
  const date = blank(c.query.get("date"));
  const kw = blank(c.query.get("keyword"))?.toLowerCase();
  const list = c.db.bookings
    .filter((b) => ids.includes(b.hotelId) && (!status || b.status === status) && (!date || b.checkIn === date || b.checkOut === date)
      && (!kw || b.bookingCode.toLowerCase().includes(kw) || b.guestName.toLowerCase().includes(kw) || b.guestPhone.includes(kw)))
    .sort((a, b) => b.checkIn.localeCompare(a.checkIn) || b.id - a.id);
  return page(list, c.query, (b) => bookingDto(c.db, b, c, "STAFF", false), 20);
});
on("GET", "/portal/bookings/:id", (c) => bookingDto(c.db, scopeBooking(c.db, requireUser(c, PORTAL), c.params.id), c, "STAFF"));
on("POST", "/portal/bookings/:id/check-in", (c) => {
  const me = requireUser(c, PORTAL);
  const b = scopeBooking(c.db, me, c.params.id);
  const ids = [...new Set<number>((c.body.roomIds ?? (c.body.roomId ? [c.body.roomId] : [])).map(Number))];
  if (!ids.length) throw bad("Vui lòng chọn phòng");
  const rooms = ids.map((id) => byId(c.db.rooms, id));
  if (rooms.some((r) => !r || r.hotelId !== b.hotelId)) throw notFound("phòng");
  const occ = occupiedRoomIds(c.db);
  const busy = (rooms as Room[]).filter((r) => occ.has(r.id));
  if (busy.length) throw conflict(`Phòng ${busy.map((r) => r.roomNumber).join(", ")} đang có khách`);
  assertTransition("Đơn đặt phòng", b.status, "CHECKED_IN");
  if (c.today < b.checkIn) throw rule(`Chưa tới ngày nhận phòng ${dmy(b.checkIn)}`);
  if (c.today >= b.checkOut) throw rule("Đã qua ngày trả phòng, hãy đánh dấu khách không đến");
  if (rooms.length !== b.roomsCount) throw rule(`Đơn này cần gán đúng ${b.roomsCount} phòng`);
  const t = byId(c.db.roomTypes, b.roomTypeId)!;
  for (const r of rooms as Room[]) {
    if (r.roomTypeId !== b.roomTypeId) throw rule(`Phòng ${r.roomNumber} không thuộc loại ${t.name}`);
    if (!r.active) throw rule(`Phòng ${r.roomNumber} đang tạm ngừng sử dụng`);
  }
  Object.assign(b, { roomIds: ids, status: "CHECKED_IN", checkedInAt: c.now });
  const numbers = (rooms as Room[]).map((r) => r.roomNumber).sort().join(", ");
  notifyGuest(c.db, c.now, b, `Chào mừng bạn đến ${byId(c.db.hotels, b.hotelId)!.name}`, `Bạn đã nhận phòng ${numbers}. Chúc kỳ nghỉ vui vẻ!`);
  audit(c.db, c.now, me.id, "CHECK_IN", "booking", b.id, `${b.bookingCode} phòng ${numbers}`);
  return bookingDto(c.db, b, c, "STAFF");
}, { message: "Đã nhận phòng" });
on("POST", "/portal/bookings/:id/check-out", (c) => {
  const me = requireUser(c, PORTAL);
  const b = scopeBooking(c.db, me, c.params.id);
  assertTransition("Đơn đặt phòng", b.status, "CHECKED_OUT");
  Object.assign(b, { status: "CHECKED_OUT", checkedOutAt: c.now });
  // Trả phòng sớm: trả tồn kho các đêm từ hôm nay (không hoàn tiền)
  if (c.today < b.checkOut) releaseNights(c.db, b, c.today > b.checkIn ? c.today : addDays(b.checkIn, 1));
  if (!c.db.payouts.some((p) => p.bookingId === b.id)) {
    store.insert(c.db, "payouts", { hotelId: b.hotelId, bookingId: b.id, amount: b.baseAmount, status: "PENDING", createdAt: c.now });
  }
  const h = byId(c.db.hotels, b.hotelId)!;
  notifyGuest(c.db, c.now, b, `Cảm ơn bạn đã lưu trú tại ${h.name}`, `Hãy để lại đánh giá cho kỳ nghỉ (đơn ${b.bookingCode}) để giúp khách sau chọn phòng nhé.`);
  notify(c.db, c.now, h.ownerId, b.id, `Khách trả phòng ${b.bookingCode}`, `Khoản thanh toán ${vnd(b.baseAmount)} đã được ghi nhận, chờ quản trị viên chuyển.`);
  audit(c.db, c.now, me.id, "CHECK_OUT", "booking", b.id, b.bookingCode);
  return bookingDto(c.db, b, c, "STAFF");
}, { message: "Đã trả phòng" });
on("POST", "/portal/bookings/:id/no-show", (c) => {
  const me = requireUser(c, PORTAL);
  const b = scopeBooking(c.db, me, c.params.id);
  assertTransition("Đơn đặt phòng", b.status, "NO_SHOW");
  if (c.today <= b.checkIn) throw rule(`Chỉ đánh dấu không đến từ ngày ${dmy(addDays(b.checkIn, 1))}`);
  Object.assign(b, { status: "NO_SHOW", cancelledAt: c.now, cancelReason: "Khách không đến nhận phòng" });
  if (c.today < b.checkOut) releaseNights(c.db, b, c.today);
  settlePayments(c.db, b, 0, "Khách không đến");
  notifyGuest(c.db, c.now, b, `Đơn ${b.bookingCode} được ghi nhận không đến`, "Khách sạn ghi nhận bạn không đến nhận phòng. Theo chính sách, đơn không được hoàn tiền.");
  audit(c.db, c.now, me.id, "NO_SHOW", "booking", b.id, b.bookingCode);
  return bookingDto(c.db, b, c, "STAFF");
}, { message: "Đã ghi nhận khách không đến" });

// ---- 5.5 Admin
const ADMIN: Role[] = ["ADMIN"];
on("GET", "/admin/dashboard", (c) => {
  requireUser(c, ADMIN);
  const { db, today } = c;
  const bookings: Record<string, number> = {};
  for (const s of ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "EXPIRED", "NO_SHOW"]) bookings[s] = db.bookings.filter((b) => b.status === s).length;
  const sellableType = (id: number) => {
    const t = byId(db.roomTypes, id);
    return !!t && t.active && byId(db.hotels, t.hotelId)?.status === "ACTIVE";
  };
  const booked = Object.entries(db.inventory).filter(([k]) => k.endsWith(`@${today}`) && sellableType(Number(k.split("@")[0]))).reduce((s, [, n]) => s + n.booked, 0);
  return {
    hotels: { total: db.hotels.length, active: db.hotels.filter((h) => h.status === "ACTIVE").length, pending: db.hotels.filter((h) => h.status === "PENDING_APPROVAL").length },
    bookings,
    revenue: {
      gross: db.payments.filter((p) => p.status === "PAID" || p.status === "REFUNDED").reduce((s, p) => s + p.amount, 0),
      platformFee: db.payments.filter((p) => p.status === "PAID").reduce((s, p) => s + (byId(db.invoices, p.invoiceId)?.feeAmount ?? 0), 0),
      refunded: db.payments.filter((p) => p.status === "REFUNDED").reduce((s, p) => s + (p.refundAmount ?? 0), 0),
    },
    occupancyTonight: { booked, total: db.rooms.filter((r) => r.active && sellableType(r.roomTypeId)).length },
    users: { total: db.users.length },
    recentBookings: [...db.bookings].sort((a, b) => b.bookedAt - a.bookedAt).slice(0, 8).map((b) => bookingDto(db, b, c, "STAFF", false)),
  };
});
on("GET", "/admin/hotels", (c) => {
  requireUser(c, ADMIN);
  const status = blank(c.query.get("status")) as HotelStatus | undefined;
  const kw = blank(c.query.get("keyword"))?.toLowerCase();
  const list = c.db.hotels.filter((h) => (!status || h.status === status) && (!kw || h.name.toLowerCase().includes(kw) || h.city.toLowerCase().includes(kw)))
    .sort((a, b) => b.id - a.id);
  return page(list, c.query, (h) => hotelSummary(c.db, hotelOffer(c.db, h, NO_STAY)));
});
on("GET", "/admin/hotels/:id", (c) => {
  requireUser(c, ADMIN);
  return hotelDetail(c.db, hotelOffer(c.db, must(byId(c.db.hotels, c.params.id), "khách sạn"), NO_STAY));
});
function changeHotel(c: Ctx, next: HotelStatus, action: string, title: string, tail: string) {
  const me = requireUser(c, ADMIN);
  const h = must(byId(c.db.hotels, c.params.id), "khách sạn");
  assertTransition("Khách sạn", h.status, next);
  h.status = next;
  if (next === "ACTIVE") h.rejectReason = undefined;
  h.updatedAt = c.now;
  notify(c.db, c.now, h.ownerId, undefined, title, `${h.name} ${tail}`);
  audit(c.db, c.now, me.id, action, "hotel", h.id, h.name);
  return hotelDetail(c.db, hotelOffer(c.db, h, NO_STAY));
}
on("POST", "/admin/hotels/:id/approve", (c) => changeHotel(c, "ACTIVE", "APPROVE", "Khách sạn đã được duyệt", "đã hiển thị với khách hàng."), { message: "Đã duyệt khách sạn" });
on("POST", "/admin/hotels/:id/suspend", (c) => changeHotel(c, "SUSPENDED", "SUSPEND", "Khách sạn bị tạm ngưng", "tạm ẩn khỏi tìm kiếm. Liên hệ quản trị viên."), { message: "Đã tạm ngưng khách sạn" });
on("POST", "/admin/hotels/:id/activate", (c) => changeHotel(c, "ACTIVE", "ACTIVATE", "Khách sạn hoạt động trở lại", "đã hiển thị lại với khách hàng."), { message: "Đã mở lại khách sạn" });
on("POST", "/admin/hotels/:id/reject", (c) => {
  const me = requireUser(c, ADMIN);
  const reason = blank(c.body.reason);
  if (!reason) throw invalid("reason", "Vui lòng nhập lý do");
  const h = must(byId(c.db.hotels, c.params.id), "khách sạn");
  assertTransition("Khách sạn", h.status, "REJECTED");
  Object.assign(h, { status: "REJECTED", rejectReason: reason, updatedAt: c.now });
  notify(c.db, c.now, h.ownerId, undefined, "Khách sạn chưa được duyệt", `${h.name}: ${reason}. Sửa hồ sơ để gửi duyệt lại.`);
  audit(c.db, c.now, me.id, "REJECT", "hotel", h.id, reason);
  return hotelDetail(c.db, hotelOffer(c.db, h, NO_STAY));
}, { message: "Đã từ chối khách sạn" });

// Tiện nghi
on("GET", "/admin/facility-categories", (c) => (requireUser(c, ADMIN), facilityCatalog(c.db)));
on("GET", "/admin/facilities", (c) => (requireUser(c, ADMIN), facilityCatalog(c.db).flatMap((x) => x.facilities)));
on("POST", "/admin/facility-categories", (c) => {
  const me = requireUser(c, ADMIN);
  const name = blank(c.body.name);
  if (!name) throw invalid("name", "Vui lòng nhập tên nhóm");
  if (c.db.facilityCategories.some((x) => x.name.toLowerCase() === name.toLowerCase())) throw conflict("Nhóm tiện nghi đã tồn tại");
  const cat = store.insert<DB["facilityCategories"][number]>(c.db, "facilityCategories", { name });
  audit(c.db, c.now, me.id, "CREATE", "facility_category", cat.id, name);
  return { id: cat.id, name, facilities: [] };
}, { status: 201, message: "Đã tạo nhóm tiện nghi" });
on("PUT", "/admin/facility-categories/:id", (c) => {
  const me = requireUser(c, ADMIN);
  const cat = must(byId(c.db.facilityCategories, c.params.id), "nhóm tiện nghi");
  const name = blank(c.body.name);
  if (!name) throw invalid("name", "Vui lòng nhập tên nhóm");
  cat.name = name;
  audit(c.db, c.now, me.id, "UPDATE", "facility_category", cat.id, name);
  return facilityCatalog(c.db).find((x) => x.id === cat.id);
});
on("DELETE", "/admin/facility-categories/:id", (c) => {
  const me = requireUser(c, ADMIN);
  const cat = must(byId(c.db.facilityCategories, c.params.id), "nhóm tiện nghi");
  if (c.db.facilities.some((f) => f.categoryId === cat.id)) throw conflict("Nhóm còn tiện nghi, hãy xoá tiện nghi trước");
  c.db.facilityCategories = c.db.facilityCategories.filter((x) => x !== cat);
  audit(c.db, c.now, me.id, "DELETE", "facility_category", cat.id, cat.name);
  return null;
}, { message: "Đã xoá nhóm tiện nghi" });
function facilityInput(c: Ctx) {
  const name = blank(c.body.name);
  const icon = blank(c.body.icon);
  if (!c.body.categoryId) throw invalid("categoryId", "Vui lòng chọn nhóm");
  if (!name) throw invalid("name", "Vui lòng nhập tên tiện nghi");
  if (!icon) throw invalid("icon", "Vui lòng nhập icon");
  must(byId(c.db.facilityCategories, c.body.categoryId), "nhóm tiện nghi");
  return { categoryId: Number(c.body.categoryId), name, icon };
}
on("POST", "/admin/facilities", (c) => {
  const me = requireUser(c, ADMIN);
  const f = store.insert<DB["facilities"][number]>(c.db, "facilities", facilityInput(c));
  audit(c.db, c.now, me.id, "CREATE", "facility", f.id, f.name);
  return facilityDto(c.db, f.id);
}, { status: 201, message: "Đã tạo tiện nghi" });
on("PUT", "/admin/facilities/:id", (c) => {
  const me = requireUser(c, ADMIN);
  const f = must(byId(c.db.facilities, c.params.id), "tiện nghi");
  Object.assign(f, facilityInput(c));
  audit(c.db, c.now, me.id, "UPDATE", "facility", f.id, f.name);
  return facilityDto(c.db, f.id);
});
on("DELETE", "/admin/facilities/:id", (c) => {
  const me = requireUser(c, ADMIN);
  const f = must(byId(c.db.facilities, c.params.id), "tiện nghi");
  if (c.db.roomTypes.some((t) => t.facilityIds.includes(f.id))) throw conflict("Tiện nghi đang được gán cho loại phòng, chưa thể xoá");
  c.db.facilities = c.db.facilities.filter((x) => x !== f);
  audit(c.db, c.now, me.id, "DELETE", "facility", f.id, f.name);
  return null;
}, { message: "Đã xoá tiện nghi" });

// Cấu hình, tài khoản, đơn, thanh toán, payout, nhật ký
on("GET", "/admin/settings", (c) => (requireUser(c, ADMIN), [...c.db.settings].sort((a, b) => a.key.localeCompare(b.key))));
on("PUT", "/admin/settings", (c) => {
  const me = requireUser(c, ADMIN);
  const ranges: Record<string, [number, number]> = { "platform.fee_percent": [0, 50], "booking.payment_timeout_minutes": [1, 1440] };
  const next = c.db.settings.map((s) => ({ ...s }));
  const items = (c.body.items ?? []) as { key: string; value: string }[];
  if (!items.length) throw invalid("items", "Danh sách cấu hình trống");
  for (const item of items) {
    const s = next.find((x) => x.key === item.key);
    if (!s) throw notFound(`tham số ${item.key}`);
    if (!/^-?\d+$/.test(String(item.value).trim())) throw bad(`${item.key} phải là số nguyên`);
    const v = Number.parseInt(String(item.value), 10);
    const [lo, hi] = ranges[item.key] ?? [-Infinity, Infinity];
    if (v < lo || v > hi) throw bad(`${item.key} phải nằm trong khoảng ${lo}–${hi}`);
    s.value = String(v);
  }
  c.db.settings = next;
  audit(c.db, c.now, me.id, "UPDATE", "setting", undefined, items.map((i) => `${i.key}=${i.value}`).join(", "));
  return [...next].sort((a, b) => a.key.localeCompare(b.key));
}, { message: "Đã lưu cấu hình" });
on("GET", "/admin/users", (c) => {
  requireUser(c, ADMIN);
  const kw = blank(c.query.get("keyword"))?.toLowerCase();
  const role = blank(c.query.get("role"));
  const list = c.db.users.filter((u) => (!role || u.role === role) && (!kw || u.fullName.toLowerCase().includes(kw) || u.email.toLowerCase().includes(kw)))
    .sort((a, b) => b.id - a.id);
  return page(list, c.query, (u) => userDto(c.db, u));
});
on("POST", "/admin/users", (c) => {
  requireUser(c, ADMIN);
  const role = c.body.role as Role;
  if (!["CUSTOMER", "HOTEL_OWNER", "HOTEL_STAFF", "ADMIN"].includes(role)) throw invalid("role", "Vui lòng chọn vai trò");
  return userDto(c.db, createUser(c, role, c.body.hotelId ? Number(c.body.hotelId) : undefined));
}, { status: 201, message: "Đã tạo tài khoản" });
on("PUT", "/admin/users/:id", (c) => {
  const me = requireUser(c, ADMIN);
  const u = must(byId(c.db.users, c.params.id), "tài khoản");
  const role = c.body.role as Role;
  if (u.id === me.id && role !== u.role) throw rule("Không thể tự đổi vai trò của chính mình");
  if (!blank(c.body.fullName)) throw invalid("fullName", "Vui lòng nhập họ tên");
  if (c.body.phone && !PHONE.test(String(c.body.phone).trim())) throw invalid("phone", "Số điện thoại không hợp lệ");
  u.fullName = String(c.body.fullName).trim();
  u.phone = blank(c.body.phone);
  const hotelId = c.body.hotelId ? Number(c.body.hotelId) : u.hotelId;
  if (role && (role !== u.role || (role === "HOTEL_STAFF" && hotelId !== u.hotelId))) {
    if (role === "HOTEL_STAFF" && !byId(c.db.hotels, hotelId)) throw bad("Nhân viên phải thuộc một khách sạn hợp lệ");
    audit(c.db, c.now, me.id, "CHANGE_ROLE", "user", u.id, `${u.role} → ${role}`);
    u.role = role;
    u.hotelId = role === "HOTEL_STAFF" ? hotelId : undefined;
    c.db.tokens.filter((t) => t.userId === u.id).forEach((t) => (t.revoked = true));
  }
  return userDto(c.db, u);
}, { message: "Đã lưu tài khoản" });
on("PUT", "/admin/users/:id/active", (c) => {
  requireUser(c, ADMIN);
  return setActive(c, must(byId(c.db.users, c.params.id), "tài khoản"), !!c.body.active);
});
on("GET", "/admin/bookings", (c) => {
  requireUser(c, ADMIN);
  const status = blank(c.query.get("status")) as BookingStatus | undefined;
  const hotelId = Number(c.query.get("hotelId")) || undefined;
  const kw = blank(c.query.get("keyword"))?.toLowerCase();
  const list = c.db.bookings.filter((b) => {
    if (status && b.status !== status) return false;
    if (hotelId && b.hotelId !== hotelId) return false;
    if (kw) {
      const hn = byId(c.db.hotels, b.hotelId)!.name.toLowerCase();
      if (![b.bookingCode.toLowerCase(), b.guestName.toLowerCase(), b.guestEmail.toLowerCase(), hn].some((s) => s.includes(kw))) return false;
    }
    return true;
  }).sort((a, b) => b.bookedAt - a.bookedAt);
  return page(list, c.query, (b) => bookingDto(c.db, b, c, "STAFF", false));
});
on("GET", "/admin/bookings/:id", (c) => (requireUser(c, ADMIN), bookingDto(c.db, must(byId(c.db.bookings, c.params.id), "đơn đặt phòng"), c, "STAFF")));
on("GET", "/admin/payments", (c) => {
  requireUser(c, ADMIN);
  const status = blank(c.query.get("status")) as PaymentStatus | undefined;
  const list = c.db.payments.filter((p) => !status || p.status === status).sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);
  return page(list, c.query, (p) => paymentDto(c.db, p, "STAFF"));
});
on("POST", "/admin/payments/:id/refund", (c) => {
  const me = requireUser(c, ADMIN);
  const p = must(byId(c.db.payments, c.params.id), "thanh toán");
  const b = bookingOfPayment(c.db, p);
  if (p.status !== "PAID") throw new HttpError(409, "INVALID_TRANSITION", "Chỉ hoàn được giao dịch đã thanh toán");
  const why = blank(c.body?.reason) ?? "Quản trị viên hoàn tiền";
  if (b.status === "CONFIRMED") {
    Object.assign(b, { status: "CANCELLED", cancelledAt: c.now, cancelReason: why });
    releaseNights(c.db, b, b.checkIn);
  }
  Object.assign(p, { status: "REFUNDED", refundAmount: p.amount, note: why });
  notifyGuest(c.db, c.now, b, `Hoàn tiền đơn ${b.bookingCode}`, `Đã hoàn ${vnd(p.amount)}. ${why}`);
  audit(c.db, c.now, me.id, "REFUND", "payment", p.id, why);
  return paymentDto(c.db, p, "STAFF");
}, { message: "Đã hoàn tiền" });
on("GET", "/admin/payouts", (c) => {
  requireUser(c, ADMIN);
  const status = blank(c.query.get("status")) as PayoutStatus | undefined;
  return page(c.db.payouts.filter((p) => !status || p.status === status).sort((a, b) => b.createdAt - a.createdAt), c.query, (p) => payoutDto(c.db, p));
});
on("POST", "/admin/payouts/:id/paid", (c) => {
  const me = requireUser(c, ADMIN);
  const p = must(byId(c.db.payouts, c.params.id), "khoản trả khách sạn");
  assertTransition("Khoản trả khách sạn", p.status, "PAID");
  Object.assign(p, { status: "PAID", paidAt: c.now });
  const h = byId(c.db.hotels, p.hotelId)!;
  const code = byId(c.db.bookings, p.bookingId)!.bookingCode;
  notify(c.db, c.now, h.ownerId, p.bookingId, `Đã chuyển tiền đơn ${code}`, `Nền tảng đã chuyển ${vnd(p.amount)} cho ${h.name}.`);
  audit(c.db, c.now, me.id, "PAYOUT_PAID", "payout", p.id, code);
  return payoutDto(c.db, p);
}, { message: "Đã đánh dấu đã chuyển tiền" });
on("GET", "/admin/audit-logs", (c) => {
  requireUser(c, ADMIN);
  return page([...c.db.audit].sort((a, b) => b.createdAt - a.createdAt || b.id - a.id), c.query, (a) => ({
    id: a.id, userEmail: a.userId ? byId(c.db.users, a.userId)?.email : undefined, action: a.action, entityType: a.entityType,
    entityId: a.entityId, result: a.result, detail: a.detail, createdAt: iso(a.createdAt),
  }), 30);
});

// ---- 5.6 Thông báo
on("GET", "/notifications", (c) => {
  const me = requireUser(c);
  const list = c.db.notifications.filter((n) => n.userId === me.id).sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);
  return page(list, c.query, (n) => ({
    id: n.id, title: n.title, content: n.content, bookingCode: n.bookingId ? byId(c.db.bookings, n.bookingId)?.bookingCode : null, read: n.read,
    createdAt: iso(n.createdAt),
  }), 20);
});
on("GET", "/notifications/unread-count", (c) => {
  const me = requireUser(c);
  return { count: c.db.notifications.filter((n) => n.userId === me.id && !n.read).length };
});
on("PUT", "/notifications/read-all", (c) => {
  const me = requireUser(c);
  c.db.notifications.filter((n) => n.userId === me.id).forEach((n) => (n.read = true));
  return null;
});
on("PUT", "/notifications/:id/read", (c) => {
  const me = requireUser(c);
  const n = c.db.notifications.find((x) => x.id === Number(c.params.id) && x.userId === me.id);
  if (!n) throw notFound("thông báo");
  n.read = true;
  return null;
});

// ---- Công cụ demo
on("GET", "/demo/clock", ({ now, db }) => ({ now: iso(now), offsetMinutes: db.offsetMinutes }));
on("POST", "/demo/clock", (c) => {
  const me = requireUser(c, ADMIN);
  const offset = Number(c.body.offsetMinutes);
  if (!(offset >= 0 && offset <= 60 * 24 * 60)) throw rule("Chỉ dời tới tối đa 60 ngày về phía trước");
  c.db.offsetMinutes = offset;
  const now = Date.now() + offset * 60_000;
  audit(c.db, now, me.id, "TIME_TRAVEL", "system", undefined, `offset=${offset} phút`);
  runExpiry(c.db, now);
  return { now: iso(now), offsetMinutes: offset };
});
on("POST", "/demo/expire-now", (c) => (requireUser(c, ADMIN), { expired: runExpiry(c.db, c.now) }));

// ------------------------------------------------------------------ bộ chặn fetch

const respond = (status: number, payload: object) => new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
const envelope = (status: number, code: string, message: string, data: unknown, errors: unknown = null) => ({
  success: status < 400, status, code, message, requestId: crypto.randomUUID?.() ?? String(Math.random()), timestamp: new Date().toISOString(), data, errors,
});

async function handle(url: URL, init: RequestInit, base: string): Promise<Response> {
  const path = url.pathname.slice(new URL(base).pathname.length) || "/";
  const method = (init.method ?? "GET").toUpperCase() as Method;
  const db = store.load();
  const now = Date.now() + db.offsetMinutes * 60_000;
  await new Promise((r) => setTimeout(r, method === "GET" ? 90 : 220));
  try {
    runExpiry(db, now);
    const me = userFromAuth(db, new Headers(init.headers).get("Authorization"));
    for (const r of routes) {
      if (r.method !== method) continue;
      const m = r.re.exec(path);
      if (!m) continue;
      const params: Record<string, string> = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      const body = typeof init.body === "string" && init.body ? JSON.parse(init.body) : {};
      const data = r.handler({ db, now, today: vnToday(now), me, query: url.searchParams, body: body ?? {}, params });
      store.save(db);
      const status = r.status ?? 200;
      return respond(status, envelope(status, "SUCCESS", r.message ?? "OK", data ?? null));
    }
    throw new HttpError(404, "NOT_FOUND", `Không có API ${method} ${path} trong bản demo`);
  } catch (e) {
    store.save(db);
    if (e instanceof HttpError) return respond(e.status, envelope(e.status, e.code, e.message, null, e.errors));
    console.error("[demo-api]", e);
    return respond(500, envelope(500, "INTERNAL_ERROR", "Máy chủ demo gặp lỗi không lường trước", null));
  }
}

export function installMockApi(base: string) {
  const realFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!href.startsWith(base)) return realFetch(input, init);
    return handle(new URL(href), init, base);
  };
  window.addEventListener("storage", (e) => {
    if (e.key === store.DB_KEY) store.invalidate();
  });
}

