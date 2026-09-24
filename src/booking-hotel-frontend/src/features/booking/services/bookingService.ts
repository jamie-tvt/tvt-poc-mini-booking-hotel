import { api } from "@/lib/api/client";
import type { PageResponse } from "@/types/api";
import type { BookingDto, BookingStatus, PaymentDto } from "@/types/domain";

export interface CreateBookingPayload {
  roomTypeId: number;
  checkIn: string;
  checkOut: string;
  roomsCount: number;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  note?: string;
}

const enc = encodeURIComponent;

/**
 * Đặt phòng phía khách (hợp đồng §5.3). Thao tác trên 1 đơn dùng mã đơn + access key,
 * không cần đăng nhập (auth: false) — đơn của khách vãng lai và khách có tài khoản dùng chung một luồng.
 */
export const bookingService = {
  /** Có token thì backend gắn đơn vào tài khoản; token hỏng không chặn khách đặt phòng. */
  create: (payload: CreateBookingPayload) => api.post<BookingDto>("/bookings", payload, { auth: "optional" }),
  getByCode: (code: string, key: string) => api.get<BookingDto>(`/bookings/code/${enc(code)}`, { key }, { auth: false }),
  lookup: (bookingCode: string, email: string) => api.post<BookingDto>("/bookings/lookup", { bookingCode, email }, { auth: false }),
  cancel: (code: string, key: string, reason?: string) =>
    api.post<BookingDto>(`/bookings/code/${enc(code)}/cancel`, { reason: reason || undefined }, { auth: false, query: { key } }),
  startPayment: (code: string, key: string) =>
    api.post<PaymentDto>(`/bookings/code/${enc(code)}/payment`, {}, { auth: false, query: { key } }),
  mine: (status: BookingStatus | undefined, page: number, size = 10) =>
    api.get<PageResponse<BookingDto>>("/users/me/bookings", { status, page, size }),
};

export const paymentService = {
  get: (id: number | string, key: string) => api.get<PaymentDto>(`/payments/${enc(String(id))}`, { key }, { auth: false }),
  completeMock: (id: number | string, key: string, result: "SUCCESS" | "FAILED") =>
    api.post<unknown>(`/payments/mock/${enc(String(id))}/complete`, { result }, { auth: false, query: { key } }),
};

/** Đường dẫn trang chi tiết đơn cho khách (mã + key). */
export function bookingHref(code: string, key: string | null | undefined, extra?: Record<string, string>): string {
  const qs = new URLSearchParams({ ...(key ? { key } : {}), ...extra }).toString();
  return `/booking/${enc(code)}${qs ? `?${qs}` : ""}`;
}
