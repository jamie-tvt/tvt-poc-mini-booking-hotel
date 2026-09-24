import type { BookingStatus, HotelStatus, PaymentProvider, PaymentStatus, PayoutStatus, Role } from "@/types/domain";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export const ROLE_LABEL: Record<Role, string> = {
  CUSTOMER: "Khách hàng",
  HOTEL_OWNER: "Chủ khách sạn",
  HOTEL_STAFF: "Nhân viên khách sạn",
  ADMIN: "Quản trị viên",
};

export const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Chờ thanh toán", tone: "warning" },
  CONFIRMED: { label: "Đã xác nhận", tone: "info" },
  CHECKED_IN: { label: "Đang lưu trú", tone: "success" },
  CHECKED_OUT: { label: "Đã trả phòng", tone: "neutral" },
  CANCELLED: { label: "Đã huỷ", tone: "danger" },
  EXPIRED: { label: "Hết hạn giữ phòng", tone: "neutral" },
  NO_SHOW: { label: "Không đến", tone: "danger" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Chờ thanh toán", tone: "warning" },
  PAID: { label: "Đã thanh toán", tone: "success" },
  FAILED: { label: "Thất bại", tone: "danger" },
  REFUNDED: { label: "Đã hoàn tiền", tone: "info" },
  CANCELLED: { label: "Đã huỷ", tone: "neutral" },
};

export const HOTEL_STATUS: Record<HotelStatus, { label: string; tone: Tone }> = {
  PENDING_APPROVAL: { label: "Chờ duyệt", tone: "warning" },
  ACTIVE: { label: "Đang hoạt động", tone: "success" },
  REJECTED: { label: "Bị từ chối", tone: "danger" },
  SUSPENDED: { label: "Tạm ngưng", tone: "neutral" },
};

export const PAYOUT_STATUS: Record<PayoutStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Chờ chi trả", tone: "warning" },
  PAID: { label: "Đã chi trả", tone: "success" },
};

export const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  MOCK: "Cổng giả lập",
  STRIPE: "Stripe",
  MANUAL: "Thủ công",
};

export const ROLES: Role[] = ["CUSTOMER", "HOTEL_OWNER", "HOTEL_STAFF", "ADMIN"];
export const BOOKING_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "EXPIRED", "NO_SHOW"];
export const PAYMENT_STATUSES: PaymentStatus[] = ["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"];
export const HOTEL_STATUSES: HotelStatus[] = ["PENDING_APPROVAL", "ACTIVE", "REJECTED", "SUSPENDED"];
export const PAYOUT_STATUSES: PayoutStatus[] = ["PENDING", "PAID"];

export const HOTEL_SORT_OPTIONS = [
  { value: "price,asc", label: "Giá thấp đến cao" },
  { value: "price,desc", label: "Giá cao đến thấp" },
  { value: "rating", label: "Đánh giá cao nhất" },
  { value: "stars", label: "Hạng sao cao nhất" },
] as const;
