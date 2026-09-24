"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { SelectField, TextField } from "@/components/ui/Field";
import { ButtonPagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { BookingStatusBadge } from "@/features/booking/components/BookingStatusBadge";
import { usePortalHotel } from "@/features/hotel-management/context/PortalHotelContext";
import { useApiQuery } from "@/lib/api/hooks";
import { formatDateTime, formatNights, formatStayRange, formatVnd } from "@/lib/utils/format";
import { BOOKING_STATUS, BOOKING_STATUSES } from "@/lib/utils/labels";
import type { BookingStatus } from "@/types/domain";
import { opsService } from "../services/opsService";
import { BookingActions } from "./BookingActions";
import { useBusinessToday } from "./useBusinessToday";

export function PortalBookingList() {
  const { hotel, hotelId } = usePortalHotel();
  const today = useBusinessToday();
  const [status, setStatus] = useState<BookingStatus | "">("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const q = useApiQuery(
    `portal-bookings-${hotelId}-${status}-${date}-${page}`,
    () => opsService.bookings({ hotelId: hotelId ?? undefined, status: status || undefined, date: date || undefined, page }),
    hotelId !== null,
  );

  return (
    <div>
      <PageHeader title="Đơn đặt phòng" description={hotel?.name} />
      <div className="mb-4 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
        <SelectField
          id="pb-status"
          label="Trạng thái"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as BookingStatus | "");
            setPage(0);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          {BOOKING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {BOOKING_STATUS[s].label}
            </option>
          ))}
        </SelectField>
        <TextField
          id="pb-date"
          type="date"
          label="Ngày nhận hoặc trả phòng"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setPage(0);
          }}
        />
      </div>
      {notice && (
        <Alert tone="success" className="mb-4">
          {notice}
        </Alert>
      )}
      {q.loading ? (
        <Spinner />
      ) : q.error ? (
        <ErrorState message={q.error.message} />
      ) : !q.data || q.data.content.length === 0 ? (
        <EmptyState title="Không có đơn phù hợp" description="Thử bỏ bớt bộ lọc trạng thái hoặc ngày." />
      ) : (
        <>
          <Table caption="Danh sách đơn đặt phòng">
            <thead>
              <tr>
                <Th>Mã đơn</Th>
                <Th>Khách</Th>
                <Th>Loại phòng</Th>
                <Th>Lưu trú</Th>
                <Th>Tổng tiền</Th>
                <Th>Trạng thái</Th>
                <Th>Đặt lúc</Th>
                <Th className="text-right">Thao tác</Th>
              </tr>
            </thead>
            <tbody>
              {q.data.content.map((b) => (
                <tr key={b.id}>
                  <Td className="font-mono text-xs font-semibold">
                    <Link href={`/portal/bookings/${b.id}`} className="text-brand hover:underline">
                      {b.bookingCode}
                    </Link>
                  </Td>
                  <Td>
                    {b.guestName}
                    <span className="block text-xs text-ink-soft">{b.guestPhone}</span>
                  </Td>
                  <Td>
                    {b.roomTypeName} × {b.roomsCount}
                  </Td>
                  <Td className="whitespace-nowrap">
                    {formatStayRange(b.checkIn, b.checkOut)}
                    <span className="block text-xs text-ink-soft">{formatNights(b.nights)}</span>
                  </Td>
                  <Td>{formatVnd(b.totalAmount)}</Td>
                  <Td>
                    <BookingStatusBadge status={b.status} />
                  </Td>
                  <Td className="text-xs">{formatDateTime(b.bookedAt)}</Td>
                  <Td className="text-right">
                    <BookingActions
                      booking={b}
                      today={today}
                      onChanged={(_, msg) => {
                        setNotice(msg);
                        void q.reload();
                      }}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <ButtonPagination page={q.data.page} totalPages={q.data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
