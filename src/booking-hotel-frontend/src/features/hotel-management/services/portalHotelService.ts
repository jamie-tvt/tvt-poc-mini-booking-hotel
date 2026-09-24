import { api } from "@/lib/api/client";
import type {
  CancellationPolicy,
  FacilityCategoryDto,
  PortalHotelDto,
  RoomDto,
  RoomTypeDto,
  UserDto,
} from "@/types/domain";

export interface HotelPayload {
  name: string;
  city: string;
  address: string;
  description: string;
  starRating: number;
  phone?: string;
  checkInTime: string;
  checkOutTime: string;
  coverImageUrl?: string;
}

export interface RoomTypePayload {
  name: string;
  description: string;
  capacity: number;
  bedInfo: string;
  areaM2: number;
  basePrice: number;
  cancellationPolicy: CancellationPolicy;
  freeCancelDays?: number;
  imageUrl?: string;
  facilityIds: number[];
}

export interface StaffPayload {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}

/** Hotel Portal — quản lý khách sạn (hợp đồng §5.4; owner chỉ thấy khách sạn của mình). */
export const portalHotelService = {
  hotels: () => api.get<PortalHotelDto[]>("/portal/hotels"),
  /** ≠ hợp đồng (backend bổ sung): hồ sơ đầy đủ để sửa — mô tả, giờ nhận/trả, điện thoại. */
  hotel: (id: number) => api.get<PortalHotelDto>(`/portal/hotels/${id}`),
  createHotel: (p: HotelPayload) => api.post<PortalHotelDto>("/portal/hotels", p),
  updateHotel: (id: number, p: HotelPayload) => api.put<PortalHotelDto>(`/portal/hotels/${id}`, p),

  roomTypes: (hotelId: number) => api.get<RoomTypeDto[]>(`/portal/hotels/${hotelId}/room-types`),
  createRoomType: (hotelId: number, p: RoomTypePayload) => api.post<RoomTypeDto>(`/portal/hotels/${hotelId}/room-types`, p),
  updateRoomType: (id: number, p: RoomTypePayload) => api.put<RoomTypeDto>(`/portal/room-types/${id}`, p),
  deleteRoomType: (id: number) => api.del<unknown>(`/portal/room-types/${id}`),

  rooms: (roomTypeId: number) => api.get<RoomDto[]>(`/portal/room-types/${roomTypeId}/rooms`),
  createRoom: (roomTypeId: number, roomNumber: string) => api.post<RoomDto>(`/portal/room-types/${roomTypeId}/rooms`, { roomNumber }),
  updateRoom: (id: number, p: { roomNumber: string; active: boolean }) => api.put<RoomDto>(`/portal/rooms/${id}`, p),

  setPrices: (roomTypeId: number, p: { from: string; to: string; price: number }) =>
    api.put<unknown>(`/portal/room-types/${roomTypeId}/prices`, p),

  staff: (hotelId: number) => api.get<UserDto[]>(`/portal/hotels/${hotelId}/staff`),
  createStaff: (hotelId: number, p: StaffPayload) => api.post<UserDto>(`/portal/hotels/${hotelId}/staff`, p),
  setStaffActive: (id: number, active: boolean) => api.put<UserDto>(`/portal/staff/${id}/active`, { active }),

  facilityCategories: () => api.get<FacilityCategoryDto[]>("/facility-categories", undefined, { auth: false }),
};
