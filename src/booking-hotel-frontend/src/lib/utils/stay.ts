import { MAX_GUESTS, MAX_NIGHTS, MAX_ROOMS } from "@/lib/config/env";
import type { CancellationPolicy, NightlyPrice } from "@/types/domain";
import { formatDayMonth, todayVnDateInput } from "./format";

/**
 * Tính toán ngày lưu trú (LocalDate "YYYY-MM-DD"). Mọi phép cộng/trừ ngày làm theo UTC
 * trên chuỗi ngày nên không bị lệch múi giờ hay giờ mùa hè.
 */

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function isValidYmd(value: string | null | undefined): value is string {
  if (!value || !YMD.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function toUtcMs(ymd: string): number {
  return Date.parse(`${ymd}T00:00:00Z`);
}

/** Số đêm giữa ngày nhận và ngày trả (0 nếu không hợp lệ hoặc trả ≤ nhận). */
export function nightsBetween(checkIn: string | null | undefined, checkOut: string | null | undefined): number {
  if (!isValidYmd(checkIn) || !isValidYmd(checkOut)) return 0;
  const diff = Math.round((toUtcMs(checkOut) - toUtcMs(checkIn)) / 86_400_000);
  return diff > 0 ? diff : 0;
}

/** "2026-10-05" + 2 → "2026-10-07" */
export function addDays(ymd: string, days: number): string {
  if (!isValidYmd(ymd)) return ymd;
  return new Date(toUtcMs(ymd) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Hôm nay (giờ Việt Nam), có thể lệch theo đồng hồ nghiệp vụ của server (skewMs). */
export function todayVn(skewMs = 0): string {
  return todayVnDateInput(new Date(Date.now() + skewMs));
}

/** Danh sách các đêm [checkIn, checkOut). */
export function stayNights(checkIn: string, checkOut: string): string[] {
  const n = nightsBetween(checkIn, checkOut);
  return Array.from({ length: n }, (_, i) => addDays(checkIn, i));
}

export interface StayInput {
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}

export type StayErrors = Partial<Record<keyof StayInput, string>>;

/** Chuẩn hoá giá trị số khách/phòng từ URL. */
export function stayFromParams(p: { checkIn?: string; checkOut?: string; guests?: string; rooms?: string }): StayInput {
  const guests = Number.parseInt(p.guests ?? "", 10);
  const rooms = Number.parseInt(p.rooms ?? "", 10);
  return {
    checkIn: p.checkIn ?? "",
    checkOut: p.checkOut ?? "",
    guests: Number.isInteger(guests) && guests > 0 ? guests : 2,
    rooms: Number.isInteger(rooms) && rooms > 0 ? rooms : 1,
  };
}


/**
 * Kiểm tra khoảng lưu trú theo hợp đồng §5.2: trả > nhận, nhận không ở quá khứ, tối đa 30 đêm,
 * 1–5 phòng, số khách ≥ số phòng. `requireDates=false` cho phép bỏ trống cả hai ngày (tìm không theo ngày).
 */
export function validateStay(input: StayInput, today: string, requireDates = true): StayErrors {
  const errors: StayErrors = {};
  const hasIn = !!input.checkIn;
  const hasOut = !!input.checkOut;

  if (requireDates || hasIn || hasOut) {
    if (!hasIn) errors.checkIn = "Vui lòng chọn ngày nhận phòng.";
    else if (!isValidYmd(input.checkIn)) errors.checkIn = "Ngày nhận phòng không hợp lệ.";
    else if (input.checkIn < today) errors.checkIn = "Ngày nhận phòng không được ở quá khứ.";

    if (!hasOut) errors.checkOut = "Vui lòng chọn ngày trả phòng.";
    else if (!isValidYmd(input.checkOut)) errors.checkOut = "Ngày trả phòng không hợp lệ.";
    else if (isValidYmd(input.checkIn) && input.checkOut <= input.checkIn)
      errors.checkOut = "Ngày trả phòng phải sau ngày nhận phòng.";
    else if (nightsBetween(input.checkIn, input.checkOut) > MAX_NIGHTS)
      errors.checkOut = `Mỗi lần đặt tối đa ${MAX_NIGHTS} đêm.`;
  }

  if (!Number.isInteger(input.rooms) || input.rooms < 1 || input.rooms > MAX_ROOMS)
    errors.rooms = `Số phòng từ 1 đến ${MAX_ROOMS}.`;
  if (!Number.isInteger(input.guests) || input.guests < 1) errors.guests = "Cần ít nhất 1 khách.";
  else if (input.guests > MAX_GUESTS) errors.guests = `Tối đa ${MAX_GUESTS} khách mỗi lần đặt.`;
  else if (!errors.rooms && input.guests < input.rooms) errors.guests = "Số khách phải lớn hơn hoặc bằng số phòng.";

  return errors;
}

/**
 * Ngày đầu tiên KHÔNG còn miễn phí huỷ. Hợp đồng: huỷ trước ngày nhận ≥ N ngày → hoàn 100%,
 * tức hạn cuối là (checkIn − N); "Miễn phí huỷ trước DD/MM" hiển thị ngày (checkIn − N + 1).
 */
export function freeCancelBefore(checkIn: string, freeCancelDays: number): string {
  return addDays(checkIn, -freeCancelDays + 1);
}

/** Nhãn chính sách huỷ hiển thị cho khách. */
export function cancellationLabel(
  policy: CancellationPolicy,
  freeCancelDays: number | null | undefined,
  checkIn?: string | null,
  today?: string,
): string {
  if (policy === "NON_REFUNDABLE") return "Không hoàn tiền";
  const days = freeCancelDays ?? 0;
  if (!checkIn || !isValidYmd(checkIn)) {
    return days > 0 ? `Miễn phí huỷ trước ngày nhận phòng ${days} ngày` : "Miễn phí huỷ trước ngày nhận phòng";
  }
  const before = freeCancelBefore(checkIn, days);
  if (today && before <= today) return "Đã qua hạn huỷ miễn phí — huỷ không hoàn tiền";
  return `Miễn phí huỷ trước ${formatDayMonth(before)}`;
}

export interface PriceBreakdown {
  nights: { date: string; listingPrice: number }[];
  /** tổng niêm yết (đã gồm phí) cho tất cả phòng */
  total: number;
  /** phần khách sạn & phí nền tảng — null nếu không suy ra chắc chắn */
  base: number | null;
  fee: number | null;
}

/**
 * Tóm tắt giá trước khi đặt: tổng = Σ giá niêm yết các đêm × số phòng (BR-PR-01).
 * Phần phí nền tảng = niêm yết − giá cơ bản của từng đêm; chỉ tách khi suy ra chắc chắn, nếu không hiển thị
 * "đã gồm phí" và số tách chính xác nằm ở hoá đơn sau khi giữ phòng.
 */
export function priceBreakdown(
  nightly: NightlyPrice[] | null | undefined,
  rooms: number,
  basePrice: number,
  fallbackTotal?: number | null,
): PriceBreakdown {
  const list = (nightly ?? []).map((n) => ({ date: n.date, listingPrice: n.listingPrice, base: n.basePrice ?? basePrice }));
  if (list.length === 0) {
    return { nights: [], total: fallbackTotal ?? 0, base: null, fee: null };
  }
  const r = Math.max(1, rooms);
  const total = list.reduce((s, n) => s + n.listingPrice, 0) * r;
  // Chưa có basePrice từng đêm (hợp đồng chỉ có listingPrice) → giả định không có giá riêng theo ngày:
  // chỉ tách khi mọi đêm cùng giá và giá niêm yết nằm trong [giá cơ bản, giá cơ bản × 1,5 + 1.000] (phí tối đa 50%).
  const hasNightBase = (nightly ?? []).every((n) => n.basePrice !== undefined);
  const uniform = list.every((n) => n.listingPrice === list[0]!.listingPrice);
  const splittable =
    (hasNightBase || uniform) && list.every((n) => n.base > 0 && n.base <= n.listingPrice && n.listingPrice <= n.base * 1.5 + 1000);
  const base = splittable ? list.reduce((s, n) => s + n.base, 0) * r : null;
  return {
    nights: list.map(({ date, listingPrice }) => ({ date, listingPrice })),
    total,
    base,
    fee: base === null ? null : total - base,
  };
}
