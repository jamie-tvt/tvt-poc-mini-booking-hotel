"use client";

import Link from "next/link";
import { useState } from "react";
import { BedDouble, CalendarDays, Luggage, MapPin } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { ButtonPagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { BookingStatusBadge } from "@/features/booking/components/BookingStatusBadge";
import { bookingHref, bookingService } from "@/features/booking/services/bookingService";
import { useApiQuery } from "@/lib/api/hooks";
import { formatNights, formatStayRange, formatVnd } from "@/lib/utils/format";
import type { BookingDto, BookingStatus } from "@/types/domain";

type TabKey = "ALL" | BookingStatus;
const TABS: { key: TabKey; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING", label: "Chờ thanh toán" },
  { key: "CONFIRMED", label: "Sắp tới" },
  { key: "CHECKED_IN", label: "Đang ở" },
  { key: "CHECKED_OUT", label: "Đã ở" },
  { key: "CANCELLED", label: "Đã huỷ" },
];

export function MyBookings() {
  const [tab, setTab] = useState<TabKey>("ALL");
  const [page, setPage] = useState(0);
  const q = useApiQuery(`my-bookings-${tab}-${page}`, () => bookingService.mine(tab === "ALL" ? undefined : tab, page));

  return (
    <div>
      <PageHeader
        title="Đơn của tôi"
        description="Các đơn đặt bằng tài khoản này. Đơn đặt khi chưa đăng nhập tra cứu bằng mã đơn + email."
        actions={
          <LinkButton href="/lookup" variant="secondary">
            Tra cứu đơn khác
          </LinkButton>
        }
      />
      <Tabs
        label="Lọc theo trạng thái"
        items={TABS}
        value={tab}
        idPrefix="my-bk"
        onChange={(k) => {
          setTab(k);
          setPage(0);
        }}
      />
      <div role="tabpanel" id="my-bk-panel" aria-labelledby={`my-bk-tab-${tab}`} className="pt-4">
        {q.loading ? (
          <Spinner />
        ) : q.error ? (
          <ErrorState message={q.error.message} />
        ) : !q.data || q.data.content.length === 0 ? (
          <EmptyState
            icon={Luggage}
            title="Chưa có đơn nào"
            description="Tìm một nơi nghỉ ưng ý ở miền Tây và đặt phòng chỉ trong vài phút."
            action={<LinkButton href="/hotels">Tìm khách sạn</LinkButton>}
          />
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {q.data.content.map((b) => (
                <li key={b.id}>
                  <MyBookingCard booking={b} />
                </li>
              ))}
            </ul>
            <ButtonPagination page={q.data.page} totalPages={q.data.totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

function MyBookingCard({ booking: b }: { booking: BookingDto }) {
  const href = bookingHref(b.bookingCode, b.accessKey);
  return (
    <article className="relative flex flex-col gap-3 rounded-xl border border-line bg-white p-4 shadow-card transition-shadow duration-200 hover:shadow-pop sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-ink">{b.bookingCode}</span>
          <BookingStatusBadge status={b.status} />
        </div>
        <h2 className="mt-1 text-lg font-bold">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] hover:text-brand">
            {b.hotelName}
          </Link>
        </h2>
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4 text-brand" aria-hidden="true" /> {b.hotelCity}
          </span>
          <span className="flex items-center gap-1.5">
            <BedDouble className="size-4 text-brand" aria-hidden="true" /> {b.roomTypeName} × {b.roomsCount}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-4 text-brand" aria-hidden="true" /> {formatStayRange(b.checkIn, b.checkOut)} ·{" "}
            {formatNights(b.nights)}
          </span>
        </p>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
        <span className="font-heading text-xl font-bold text-cta">{formatVnd(b.totalAmount)}</span>
        {b.canReview && <span className="text-sm font-semibold text-brand">Chờ bạn đánh giá</span>}
        {b.canPay && <span className="text-sm font-semibold text-cta-ink">Cần thanh toán</span>}
      </div>
    </article>
  );
}
