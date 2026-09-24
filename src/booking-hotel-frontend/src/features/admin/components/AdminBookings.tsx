"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { ButtonPagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { BookingStatusBadge, PaymentStatusBadge } from "@/features/booking/components/BookingStatusBadge";
import { useApiQuery } from "@/lib/api/hooks";
import { formatDateTime, formatNights, formatStayRange, formatVnd } from "@/lib/utils/format";
import { BOOKING_STATUS, BOOKING_STATUSES } from "@/lib/utils/labels";
import type { BookingStatus } from "@/types/domain";
import { adminService } from "../services/adminService";

export function AdminBookings() {
  const [status, setStatus] = useState<BookingStatus | "">("");
  const [kwInput, setKwInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const q = useApiQuery(`admin-bookings-${status}-${keyword}-${page}`, () =>
    adminService.bookings({ status: status || undefined, keyword: keyword || undefined, page }),
  );

  return (
    <div>
      <PageHeader title="Đơn đặt phòng" description="Toàn bộ đơn trên nền tảng, gồm đơn khách vãng lai." />
      <form
        className="mb-4 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setKeyword(kwInput.trim());
          setPage(0);
        }}
      >
        <TextField id="ab-kw" label="Tìm đơn" placeholder="Mã đơn, tên hoặc email khách" value={kwInput} onChange={(e) => setKwInput(e.target.value)} />
        <SelectField
          id="ab-status"
          label="Trạng thái"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as BookingStatus | "");
            setPage(0);
          }}
        >
          <option value="">Tất cả</option>
          {BOOKING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {BOOKING_STATUS[s].label}
            </option>
          ))}
        </SelectField>
        <Button type="submit">
          <Search className="size-4" aria-hidden="true" /> Tìm kiếm
        </Button>
      </form>
      {q.loading ? (
        <Spinner />
      ) : q.error ? (
        <ErrorState message={q.error.message} />
      ) : !q.data || q.data.content.length === 0 ? (
        <EmptyState title="Không có đơn phù hợp" />
      ) : (
        <>
          <Table caption="Danh sách đơn đặt phòng">
            <thead>
              <tr>
                <Th>Mã đơn</Th>
                <Th>Khách</Th>
                <Th>Khách sạn · loại phòng</Th>
                <Th>Lưu trú</Th>
                <Th>Tiền phòng / phí</Th>
                <Th>Tổng</Th>
                <Th>Trạng thái</Th>
                <Th>Thanh toán</Th>
                <Th>Đặt lúc</Th>
              </tr>
            </thead>
            <tbody>
              {q.data.content.map((b) => (
                <tr key={b.id}>
                  <Td className="font-mono text-xs font-semibold">{b.bookingCode}</Td>
                  <Td>
                    {b.guestName}
                    <span className="block break-all text-xs text-ink-soft">{b.guestEmail}</span>
                  </Td>
                  <Td>
                    {b.hotelName}
                    <span className="block text-xs text-ink-soft">
                      {b.roomTypeName} × {b.roomsCount}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap">
                    {formatStayRange(b.checkIn, b.checkOut)}
                    <span className="block text-xs text-ink-soft">{formatNights(b.nights)}</span>
                  </Td>
                  <Td className="whitespace-nowrap text-xs">
                    {formatVnd(b.baseAmount)}
                    <span className="block text-ink-soft">+ {formatVnd(b.feeAmount)}</span>
                  </Td>
                  <Td className="font-semibold">{formatVnd(b.totalAmount)}</Td>
                  <Td>
                    <BookingStatusBadge status={b.status} />
                  </Td>
                  <Td>{b.paymentStatus ? <PaymentStatusBadge status={b.paymentStatus} /> : "—"}</Td>
                  <Td className="text-xs">{formatDateTime(b.bookedAt)}</Td>
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
