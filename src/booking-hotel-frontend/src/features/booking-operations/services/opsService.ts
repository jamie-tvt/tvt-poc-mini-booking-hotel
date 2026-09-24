import { api } from "@/lib/api/client";
import type { PageResponse } from "@/types/api";
import type { BookingDto, BookingStatus, RoomDto } from "@/types/domain";

export interface PortalBookingQuery {
  hotelId?: number;
  status?: BookingStatus;
  /** ngày nhận HOẶC trả phòng */
  date?: string;
  page?: number;
  size?: number;
}

/** Vận hành đơn tại khách sạn: lễ tân nhận/trả phòng, không đến (hợp đồng §5.4). */
export const opsService = {
  bookings: (q: PortalBookingQuery) =>
    api.get<PageResponse<BookingDto>>("/portal/bookings", { ...q, page: q.page ?? 0, size: q.size ?? 20 }),
  booking: (id: number | string) => api.get<BookingDto>(`/portal/bookings/${id}`),
  /** Hợp đồng: {roomId}; đơn nhiều phòng gửi thêm roomIds (backend yêu cầu gán đủ số phòng của đơn). */
  checkIn: (id: number, roomIds: number[]) =>
    api.post<BookingDto>(`/portal/bookings/${id}/check-in`, { roomId: roomIds[0], roomIds }),
  checkOut: (id: number) => api.post<BookingDto>(`/portal/bookings/${id}/check-out`),
  noShow: (id: number) => api.post<BookingDto>(`/portal/bookings/${id}/no-show`),
  /** Phòng của loại phòng để chọn khi nhận phòng. */
  rooms: (roomTypeId: number) => api.get<RoomDto[]>(`/portal/room-types/${roomTypeId}/rooms`),
};
