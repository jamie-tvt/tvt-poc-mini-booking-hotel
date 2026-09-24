"use client";

import Link from "next/link";
import { Table, Td, Th } from "@/components/ui/Table";
import { BookingStatusBadge } from "@/features/booking/components/BookingStatusBadge";
import { formatNights, formatStayRange } from "@/lib/utils/format";
import type { BookingDto } from "@/types/domain";
import { BookingActions } from "./BookingActions";

/** Bảng đơn cho lễ tân (cuộn ngang trong khung riêng trên mobile). */
export function StayTable({
  caption,
  bookings,
  today,
  onChanged,
  emptyText,
}: {
  caption: string;
  bookings: BookingDto[];
  today: string;
  onChanged: (b: BookingDto, message: string) => void;
  emptyText: string;
}) {
  if (bookings.length === 0) return <p className="rounded-xl border border-dashed border-line-strong bg-white p-6 text-center text-ink-soft">{emptyText}</p>;
  return (
    <Table caption={caption}>
      <thead>
        <tr>
          <Th>Mã đơn</Th>
          <Th>Khách</Th>
          <Th>Loại phòng</Th>
          <Th>Lưu trú</Th>
          <Th>Phòng</Th>
          <Th>Trạng thái</Th>
          <Th className="text-right">Thao tác</Th>
        </tr>
      </thead>
      <tbody>
        {bookings.map((b) => (
          <tr key={b.id}>
            <Td className="font-mono text-xs font-semibold">
              <Link href={`/portal/bookings/${b.id}`} className="text-brand hover:underline">
                {b.bookingCode}
              </Link>
            </Td>
            <Td>
              <span className="font-medium">{b.guestName}</span>
              <span className="block text-xs text-ink-soft">
                {b.guestPhone} · {b.guests} khách
              </span>
            </Td>
            <Td>
              {b.roomTypeName} × {b.roomsCount}
            </Td>
            <Td className="whitespace-nowrap">
              {formatStayRange(b.checkIn, b.checkOut)}
              <span className="block text-xs text-ink-soft">{formatNights(b.nights)}</span>
            </Td>
            <Td>{b.roomNumber ?? "—"}</Td>
            <Td>
              <BookingStatusBadge status={b.status} />
            </Td>
            <Td className="text-right">
              <BookingActions booking={b} today={today} onChanged={onChanged} />
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
