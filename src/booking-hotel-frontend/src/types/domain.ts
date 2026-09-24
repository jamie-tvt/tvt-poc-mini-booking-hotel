/** DTO theo docs/technical/api-contracts.md §4. Ngày lưu trú là "YYYY-MM-DD", thời điểm là ISO-8601 UTC, tiền là số nguyên VND. */

export type Role = "CUSTOMER" | "HOTEL_OWNER" | "HOTEL_STAFF" | "ADMIN";
export type HotelStatus = "PENDING_APPROVAL" | "ACTIVE" | "REJECTED" | "SUSPENDED";
export type BookingStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED" | "EXPIRED" | "NO_SHOW";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";
export type PaymentProvider = "MOCK" | "STRIPE" | "MANUAL";
export type CancellationPolicy = "FREE_BEFORE_DATE" | "NON_REFUNDABLE";
export type ReviewStatus = "VISIBLE" | "HIDDEN";
export type PayoutStatus = "PENDING" | "PAID";

export interface UserDto {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  role: Role;
  hotelId?: number;
  hotelName?: string;
  active: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserDto;
}

export interface FacilityDto {
  id: number;
  name: string;
  /** tên icon lucide dạng kebab-case, VD "wifi" */
  icon: string;
  categoryId: number;
  categoryName: string;
}

export interface FacilityCategoryDto {
  id: number;
  name: string;
  facilities: FacilityDto[];
}

export interface HotelSummaryDto {
  id: number;
  name: string;
  city: string;
  address: string;
  starRating: number;
  coverImageUrl?: string | null;
  status: HotelStatus;
  /** giá niêm yết/đêm thấp nhất (đã gồm phí nền tảng) còn trống cho khoảng ngày tìm */
  fromPrice?: number | null;
  ratingAverage?: number | null;
  ratingCount: number;
  availableRoomTypes: number;
  ownerName?: string;
  /** Portal/Admin: lý do từ chối (không có trong hợp đồng, hiển thị nếu backend trả) */
  rejectReason?: string | null;
}

export interface NightlyPrice {
  date: string;
  listingPrice: number;
  /** không có trong hợp đồng — dùng nếu backend trả để tách phí chính xác */
  basePrice?: number;
}

export interface RoomTypeDto {
  id: number;
  hotelId: number;
  name: string;
  description: string;
  capacity: number;
  bedInfo: string;
  areaM2: number;
  basePrice: number;
  /** giá niêm yết đêm đầu (đã gồm phí) */
  listingPrice: number;
  /** số phòng đang hoạt động */
  totalRooms: number;
  cancellationPolicy: CancellationPolicy;
  freeCancelDays?: number | null;
  imageUrl?: string | null;
  facilities: FacilityDto[];
  /** chỉ khi truyền checkIn/checkOut */
  availableRooms?: number | null;
  nightlyPrices?: NightlyPrice[] | null;
  stayTotal?: number | null;
}

export interface HotelDetailDto extends HotelSummaryDto {
  description: string;
  checkInTime: string;
  checkOutTime: string;
  phone?: string | null;
  images: string[];
  roomTypes: RoomTypeDto[];
  facilities: FacilityDto[];
}

/** Portal: hồ sơ khách sạn (GET /portal/hotels có thể trả thêm trường hồ sơ). */
export type PortalHotelDto = HotelSummaryDto &
  Partial<Pick<HotelDetailDto, "description" | "checkInTime" | "checkOutTime" | "phone">>;

export interface RoomDto {
  id: number;
  roomTypeId: number;
  roomTypeName: string;
  roomNumber: string;
  active: boolean;
  occupied: boolean;
}

export interface RefundPreview {
  percent: number;
  amount: number;
}

export interface PaymentDto {
  id: number;
  bookingCode: string;
  amount: number;
  refundAmount?: number | null;
  status: PaymentStatus;
  provider: PaymentProvider;
  transactionCode?: string | null;
  createdAt: string;
  paidAt?: string | null;
  checkoutUrl?: string | null;
  guestName: string;
}

export interface InvoiceDto {
  id: number;
  invoiceCode: string;
  amount: number;
  baseAmount: number;
  feeAmount: number;
  createdAt: string;
  payments: PaymentDto[];
}

export interface BookingDto {
  id: number;
  bookingCode: string;
  accessKey?: string | null;
  status: BookingStatus;
  hotelId: number;
  hotelName: string;
  hotelCity: string;
  /** không có trong hợp đồng — backend trả thêm để hiện ảnh */
  hotelCoverImageUrl?: string | null;
  roomTypeId: number;
  roomTypeName: string;
  roomNumber?: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  roomsCount: number;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  note?: string | null;
  baseAmount: number;
  feeAmount: number;
  totalAmount: number;
  bookedAt: string;
  expiresAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  cancellationPolicy: CancellationPolicy;
  freeCancelDays?: number | null;
  paymentStatus?: PaymentStatus | null;
  invoice?: InvoiceDto | null;
  canPay: boolean;
  canCancel: boolean;
  canReview: boolean;
  refundPreview?: RefundPreview | null;
}

export interface ReviewDto {
  id: number;
  hotelId: number;
  bookingCode: string;
  guestName: string;
  rating: number;
  content: string;
  status: ReviewStatus;
  createdAt: string;
}

export interface PayoutDto {
  id: number;
  hotelId: number;
  hotelName: string;
  bookingCode: string;
  amount: number;
  status: PayoutStatus;
  createdAt: string;
  paidAt?: string | null;
}

export interface NotificationDto {
  id: number;
  title: string;
  content: string;
  bookingCode?: string | null;
  read: boolean;
  createdAt: string;
}

export interface SettingDto {
  key: string;
  value: string;
  description?: string;
}

export interface AuditLogDto {
  id: number;
  userEmail?: string;
  action: string;
  entityType?: string;
  entityId?: string | number;
  result?: string;
  detail?: string;
  createdAt: string;
}

export interface DashboardDto {
  hotels: { total: number; active: number; pending: number };
  bookings: Partial<Record<BookingStatus, number>>;
  revenue: { gross: number; platformFee: number; refunded: number };
  occupancyTonight: { booked: number; total: number };
  users: { total: number };
  recentBookings: BookingDto[];
}

export interface DemoClockDto {
  now: string;
  offsetMinutes: number;
}
