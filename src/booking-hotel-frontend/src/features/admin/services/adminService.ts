import { api } from "@/lib/api/client";
import type { PageResponse } from "@/types/api";
import type {
  AuditLogDto,
  BookingDto,
  BookingStatus,
  DashboardDto,
  DemoClockDto,
  FacilityCategoryDto,
  FacilityDto,
  HotelStatus,
  HotelSummaryDto,
  PaymentDto,
  PaymentStatus,
  Role,
  SettingDto,
  UserDto,
} from "@/types/domain";

/** GET /admin/settings có thể trả mảng {key,value} hoặc object {key: value} — chuẩn hoá về mảng. */
export function normalizeSettings(data: SettingDto[] | Record<string, string | number> | null | undefined): SettingDto[] {
  if (!data) return [];
  if (Array.isArray(data)) return data.map((s) => ({ ...s, value: String(s.value) }));
  return Object.entries(data).map(([key, value]) => ({ key, value: String(value) }));
}

/** Admin Panel (hợp đồng §5.5). */
export const adminService = {
  dashboard: () => api.get<DashboardDto>("/admin/dashboard"),

  hotels: (q: { status?: HotelStatus; page: number; size?: number }) =>
    api.get<PageResponse<HotelSummaryDto>>("/admin/hotels", { ...q, size: q.size ?? 12 }),
  approveHotel: (id: number) => api.post<HotelSummaryDto>(`/admin/hotels/${id}/approve`),
  rejectHotel: (id: number, reason: string) => api.post<HotelSummaryDto>(`/admin/hotels/${id}/reject`, { reason }),
  suspendHotel: (id: number) => api.post<HotelSummaryDto>(`/admin/hotels/${id}/suspend`),
  activateHotel: (id: number) => api.post<HotelSummaryDto>(`/admin/hotels/${id}/activate`),

  facilityCategories: () => api.get<FacilityCategoryDto[]>("/admin/facility-categories"),
  createCategory: (name: string) => api.post<FacilityCategoryDto>("/admin/facility-categories", { name }),
  updateCategory: (id: number, name: string) => api.put<FacilityCategoryDto>(`/admin/facility-categories/${id}`, { name }),
  deleteCategory: (id: number) => api.del<unknown>(`/admin/facility-categories/${id}`),
  createFacility: (p: { name: string; icon: string; categoryId: number }) => api.post<FacilityDto>("/admin/facilities", p),
  updateFacility: (id: number, p: { name: string; icon: string; categoryId: number }) => api.put<FacilityDto>(`/admin/facilities/${id}`, p),
  deleteFacility: (id: number) => api.del<unknown>(`/admin/facilities/${id}`),

  settings: () => api.get<SettingDto[] | Record<string, string | number>>("/admin/settings").then(normalizeSettings),
  saveSettings: (items: { key: string; value: string }[]) => api.put<unknown>("/admin/settings", { items }),

  users: (q: { keyword?: string; role?: Role; page: number; size?: number }) =>
    api.get<PageResponse<UserDto>>("/admin/users", { ...q, size: q.size ?? 10 }),
  createUser: (p: { fullName: string; email: string; password: string; phone?: string; role: Role }) => api.post<UserDto>("/admin/users", p),
  updateUser: (id: number, p: { fullName: string; phone?: string; role: Role }) => api.put<UserDto>(`/admin/users/${id}`, p),
  setActive: (id: number, active: boolean) => api.put<UserDto>(`/admin/users/${id}/active`, { active }),

  bookings: (q: { status?: BookingStatus; keyword?: string; page: number; size?: number }) =>
    api.get<PageResponse<BookingDto>>("/admin/bookings", { ...q, size: q.size ?? 15 }),
  payments: (q: { status?: PaymentStatus; page: number; size?: number }) =>
    api.get<PageResponse<PaymentDto>>("/admin/payments", { ...q, size: q.size ?? 15 }),
  refundPayment: (id: number) => api.post<PaymentDto>(`/admin/payments/${id}/refund`),

  auditLogs: (page: number, size = 20) => api.get<AuditLogDto[] | PageResponse<AuditLogDto>>("/admin/audit-logs", { page, size }),

  clock: () => api.get<DemoClockDto>("/demo/clock", undefined, { auth: false }),
  setClock: (offsetMinutes: number) => api.post<DemoClockDto>("/demo/clock", { offsetMinutes }),
  expireNow: () => api.post<unknown>("/demo/expire-now"),
};
