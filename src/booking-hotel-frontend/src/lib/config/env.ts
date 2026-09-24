const DEFAULT_API_URL = "http://localhost:8180/api/v1";

/** URL API cho trình duyệt — Next nhúng giá trị lúc build. */
export const PUBLIC_API_URL: string = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;

/** URL API cho code chạy trên server (Server Components). Trong Docker: http://backend:8080/api/v1 */
export function getInternalApiUrl(): string {
  return process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}

/** Chọn base URL phù hợp với môi trường chạy hiện tại. */
export function getApiBaseUrl(): string {
  return typeof window === "undefined" ? getInternalApiUrl() : PUBLIC_API_URL;
}

export const APP_NAME = "Mekong Stay";
export const AUTH_STORAGE_KEY = "hb.auth";
/** Khách sạn đang chọn ở Hotel Portal (owner có nhiều khách sạn). */
export const PORTAL_HOTEL_KEY = "hb.portal.hotelId";
export const NOTIFICATION_POLL_MS = 30_000;
export const DEFAULT_PAGE_SIZE = 12;
/** Giới hạn nghiệp vụ theo hợp đồng API §5.2–5.3. */
export const MAX_NIGHTS = 30;
export const MAX_ROOMS = 5;
export const MAX_GUESTS = 20;
