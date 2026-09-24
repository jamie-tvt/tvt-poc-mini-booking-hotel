/**
 * Định dạng tiền / ngày giờ kiểu Việt Nam.
 * Múi giờ cố định Asia/Ho_Chi_Minh để server (UTC trong Docker) và trình duyệt hiển thị giống nhau.
 */
export const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";
const VN_OFFSET_MINUTES = 7 * 60; // Việt Nam không có giờ mùa hè
const NBSP = " ";

/** 1650000 → "1.650.000 ₫" (khoảng trắng không ngắt dòng trước ₫). */
export function formatVnd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  return `${formatNumber(amount)}${NBSP}₫`;
}

/** 1650000 → "1.650.000" */
export function formatNumber(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  const digits = Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return sign + digits;
}

type Parts = { day: string; month: string; year: string; hour: string; minute: string; weekday: string };

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: VN_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

const WEEKDAYS_VI: Record<string, string> = {
  Mon: "Thứ Hai",
  Tue: "Thứ Ba",
  Wed: "Thứ Tư",
  Thu: "Thứ Năm",
  Fri: "Thứ Sáu",
  Sat: "Thứ Bảy",
  Sun: "Chủ Nhật",
};

function toDate(input: string | Date | number): Date | null {
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function vnParts(date: Date): Parts {
  const out: Record<string, string> = {};
  for (const p of partsFormatter.formatToParts(date)) out[p.type] = p.value;
  return {
    day: out.day ?? "",
    month: out.month ?? "",
    year: out.year ?? "",
    hour: out.hour ?? "",
    minute: out.minute ?? "",
    weekday: out.weekday ?? "",
  };
}

/** "2026-10-05T07:00:00Z" → "05/10/2026" */
export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = toDate(input);
  if (!d) return "—";
  const p = vnParts(d);
  return `${p.day}/${p.month}/${p.year}`;
}

/** "2026-10-05T07:00:00Z" → "14:00" */
export function formatTime(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = toDate(input);
  if (!d) return "—";
  const p = vnParts(d);
  return `${p.hour}:${p.minute}`;
}

/** "2026-10-05T07:00:00Z" → "14:00 05/10/2026" */
export function formatDateTime(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = toDate(input);
  if (!d) return "—";
  const p = vnParts(d);
  return `${p.hour}:${p.minute} ${p.day}/${p.month}/${p.year}`;
}

/** "Thứ Hai, 05/10/2026" */
export function formatDateWithWeekday(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = toDate(input);
  if (!d) return "—";
  const p = vnParts(d);
  return `${WEEKDAYS_VI[p.weekday] ?? p.weekday}, ${p.day}/${p.month}/${p.year}`;
}

/** Khoảng ngày đi – về: "05/10/2026 – 07/10/2026" */
export function formatDateRange(start: string | null | undefined, end: string | null | undefined): string {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/** Mili-giây còn lại → "mm:ss" hoặc "h:mm:ss" (không âm). */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** ISO UTC → giá trị cho <input type="datetime-local"> theo giờ Việt Nam ("2026-10-05T14:00"). */
export function toVnDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = toDate(iso);
  if (!d) return "";
  const shifted = new Date(d.getTime() + VN_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 16);
}

/** Giá trị <input type="datetime-local"> (giờ Việt Nam) → ISO UTC ("2026-10-05T07:00:00Z"). */
export function fromVnDateTimeInput(value: string): string {
  if (!value) return "";
  const d = new Date(`${value.length === 16 ? `${value}:00` : value}+07:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().replace(".000Z", "Z");
}

/** Hôm nay theo giờ Việt Nam dạng "YYYY-MM-DD" (giá trị cho <input type="date">). */
export function todayVnDateInput(now: Date = new Date()): string {
  return toVnDateTimeInput(now.toISOString()).slice(0, 10);
}

/** 4.666 → "4,7" */
export function formatRating(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return (Math.round(value * 10) / 10).toFixed(1).replace(".", ",");
}

// ---------------------------------------------------------------------------
// Ngày lưu trú (LocalDate "YYYY-MM-DD", không có giờ) — đọc thẳng chuỗi, không qua múi giờ.
// ---------------------------------------------------------------------------

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

function ymdParts(ymd: string | null | undefined): [string, string, string] | null {
  if (!ymd) return null;
  const m = YMD.exec(ymd.slice(0, 10));
  return m ? [m[1]!, m[2]!, m[3]!] : null;
}

/** "2026-10-05" → "05/10/2026" */
export function formatStayDate(ymd: string | null | undefined): string {
  const p = ymdParts(ymd);
  return p ? `${p[2]}/${p[1]}/${p[0]}` : "—";
}

/** "2026-10-05" → "05/10" */
export function formatDayMonth(ymd: string | null | undefined): string {
  const p = ymdParts(ymd);
  return p ? `${p[2]}/${p[1]}` : "—";
}

/** "2026-10-05" → "Thứ Hai, 05/10/2026" */
export function formatStayDateWithWeekday(ymd: string | null | undefined): string {
  const p = ymdParts(ymd);
  if (!p) return "—";
  const day = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]))).getUTCDay();
  const names = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  return `${names[day]}, ${p[2]}/${p[1]}/${p[0]}`;
}

/** Khoảng lưu trú: "05/10/2026 – 07/10/2026" */
export function formatStayRange(checkIn: string | null | undefined, checkOut: string | null | undefined): string {
  return `${formatStayDate(checkIn)} – ${formatStayDate(checkOut)}`;
}

/** 2 → "2 đêm" */
export function formatNights(nights: number | null | undefined): string {
  if (!nights || !Number.isFinite(nights) || nights <= 0) return "—";
  return `${nights} đêm`;
}
