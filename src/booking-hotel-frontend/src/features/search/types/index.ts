/** Tham số tìm kiếm đồng bộ với URL /hotels?... (hợp đồng §5.2 GET /hotels/search). */
export const STAY_KEYS = ["city", "checkIn", "checkOut", "guests", "rooms"] as const;
export const FILTER_KEYS = ["minPrice", "maxPrice", "stars", "facilityIds", "sort"] as const;
export const SEARCH_KEYS = [...STAY_KEYS, ...FILTER_KEYS] as const;

export type SearchKey = (typeof SEARCH_KEYS)[number];
export type HotelSearchParams = Partial<Record<SearchKey, string>>;

/** Lấy tham số tìm kiếm từ searchParams của Next. */
export function pickSearchParams(
  sp: Record<string, string | string[] | undefined>,
  keys: readonly SearchKey[] = SEARCH_KEYS,
): HotelSearchParams {
  const out: HotelSearchParams = {};
  for (const k of keys) {
    const raw = sp[k];
    const v = Array.isArray(raw) ? raw[0] : raw;
    if (v !== undefined && v !== "") out[k] = v;
  }
  return out;
}

/** Chỉ giữ tham số lưu trú (ngày, khách, phòng) để truyền sang trang chi tiết / checkout. */
export function stayOnly(p: HotelSearchParams): HotelSearchParams {
  return { checkIn: p.checkIn, checkOut: p.checkOut, guests: p.guests, rooms: p.rooms };
}
