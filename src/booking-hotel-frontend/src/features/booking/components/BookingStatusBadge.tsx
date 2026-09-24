import { Badge } from "@/components/ui/Badge";
import { BOOKING_STATUS, HOTEL_STATUS, PAYMENT_STATUS, PAYOUT_STATUS } from "@/lib/utils/labels";
import type { BookingStatus, HotelStatus, PaymentStatus, PayoutStatus } from "@/types/domain";

/** Badge trạng thái đơn: màu + chữ (không chỉ dựa vào màu). */
export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const meta = BOOKING_STATUS[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const meta = PAYMENT_STATUS[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function HotelStatusBadge({ status }: { status: HotelStatus }) {
  const meta = HOTEL_STATUS[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  const meta = PAYOUT_STATUS[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
