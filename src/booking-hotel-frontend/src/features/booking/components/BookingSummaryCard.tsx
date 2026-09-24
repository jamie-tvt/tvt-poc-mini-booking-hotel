import Link from "next/link";
import { BedDouble, CalendarDays, DoorOpen, MapPin, UserRound, Users } from "lucide-react";
import { HotelImage } from "@/components/shared/HotelImage";
import { Card } from "@/components/ui/Card";
import { formatDateTime, formatNights, formatStayDateWithWeekday, formatVnd } from "@/lib/utils/format";
import type { BookingDto } from "@/types/domain";
import { PaymentStatusBadge } from "./BookingStatusBadge";

/** Thông tin lưu trú + tiền của một đơn (dùng ở trang khách và Portal). */
export function BookingSummaryCard({ booking, hotelLink = true }: { booking: BookingDto; hotelLink?: boolean }) {
  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row">
      {booking.hotelCoverImageUrl && (
        <div className="overflow-hidden rounded-lg sm:w-44 sm:shrink-0">
          <HotelImage src={booking.hotelCoverImageUrl} alt="" />
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-1.5">
        {hotelLink ? (
          <Link href={`/hotels/${booking.hotelId}`} className="font-heading text-xl font-bold text-ink-strong hover:text-brand hover:underline">
            {booking.hotelName}
          </Link>
        ) : (
          <p className="font-heading text-xl font-bold text-ink-strong">{booking.hotelName}</p>
        )}
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <MapPin className="size-4 text-brand" aria-hidden="true" /> {booking.hotelCity}
        </p>
        <p className="flex items-center gap-2 text-sm text-ink">
          <BedDouble className="size-4 text-brand" aria-hidden="true" /> {booking.roomTypeName} × {booking.roomsCount} phòng
          {booking.roomNumber && <span className="font-semibold"> · Phòng {booking.roomNumber}</span>}
        </p>
      </div>
      </div>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-line pt-4 text-sm">
        <dt className="flex items-center gap-2 text-ink-soft">
          <CalendarDays className="size-4" aria-hidden="true" /> Nhận phòng
        </dt>
        <dd className="text-right">{formatStayDateWithWeekday(booking.checkIn)}</dd>
        <dt className="flex items-center gap-2 text-ink-soft">
          <CalendarDays className="size-4" aria-hidden="true" /> Trả phòng
        </dt>
        <dd className="text-right">{formatStayDateWithWeekday(booking.checkOut)}</dd>
        <dt className="flex items-center gap-2 text-ink-soft">
          <Users className="size-4" aria-hidden="true" /> Lưu trú
        </dt>
        <dd className="text-right">
          {formatNights(booking.nights)} · {booking.guests} khách
        </dd>
        <dt className="flex items-center gap-2 text-ink-soft">
          <UserRound className="size-4" aria-hidden="true" /> Người đặt
        </dt>
        <dd className="min-w-0 break-words text-right">
          {booking.guestName}
          <span className="block text-xs text-ink-soft">
            {booking.guestEmail} · {booking.guestPhone}
          </span>
        </dd>
        {booking.note && (
          <>
            <dt className="text-ink-soft">Ghi chú</dt>
            <dd className="text-right">{booking.note}</dd>
          </>
        )}
        {booking.checkedInAt && (
          <>
            <dt className="flex items-center gap-2 text-ink-soft">
              <DoorOpen className="size-4" aria-hidden="true" /> Đã nhận phòng
            </dt>
            <dd className="text-right">{formatDateTime(booking.checkedInAt)}</dd>
          </>
        )}
        {booking.checkedOutAt && (
          <>
            <dt className="text-ink-soft">Đã trả phòng</dt>
            <dd className="text-right">{formatDateTime(booking.checkedOutAt)}</dd>
          </>
        )}
        <div className="col-span-2 my-1 h-px bg-line" aria-hidden="true" />
        <dt className="text-ink-soft">Tiền phòng</dt>
        <dd className="text-right">{formatVnd(booking.baseAmount)}</dd>
        <dt className="text-ink-soft">Phí nền tảng</dt>
        <dd className="text-right">{formatVnd(booking.feeAmount)}</dd>
        <dt className="font-semibold text-ink-strong">Tổng tiền</dt>
        <dd className="text-right font-heading text-xl font-bold text-cta">{formatVnd(booking.totalAmount)}</dd>
        <dt className="text-ink-soft">Đặt lúc</dt>
        <dd className="text-right">{formatDateTime(booking.bookedAt)}</dd>
        {booking.paymentStatus && (
          <>
            <dt className="text-ink-soft">Thanh toán</dt>
            <dd className="text-right">
              <PaymentStatusBadge status={booking.paymentStatus} />
            </dd>
          </>
        )}
      </dl>
    </Card>
  );
}
