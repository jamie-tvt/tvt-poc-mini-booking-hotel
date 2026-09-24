import type { Query } from "@/types/api";

/** Tạo query string, bỏ qua giá trị rỗng / null / undefined. */
export function toQueryString(query: Query | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

/** Lấy 1 giá trị string từ searchParams của Next (string | string[] | undefined). */
export function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value === "" ? undefined : value;
}

/** Parse số nguyên không âm, sai thì trả fallback. */
export function toInt(value: string | undefined | null, fallback: number): number {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}

/** Chỉ cho phép chuyển hướng nội bộ (chống open redirect ở ?next=). */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** Chuẩn hoá API trả mảng hoặc PageResponse thành mảng. */
export function asList<T>(data: T[] | { content: T[] } | null | undefined): T[] {
  if (!data) return [];
  return Array.isArray(data) ? data : (data.content ?? []);
}
