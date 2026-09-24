"use client";

import Link from "next/link";
import { Banknote, BedDouble, Hotel, Percent, RotateCcw, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { Table, Td, Th } from "@/components/ui/Table";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { BookingStatusBadge } from "@/features/booking/components/BookingStatusBadge";
import { useApiQuery } from "@/lib/api/hooks";
import { formatDateTime, formatNumber, formatStayRange, formatVnd } from "@/lib/utils/format";
import { BOOKING_STATUS, BOOKING_STATUSES } from "@/lib/utils/labels";
import { adminService } from "../services/adminService";
import { DemoTools } from "./DemoTools";

function Stat({ icon: Icon, label, value, sub, href }: { icon: LucideIcon; label: string; value: string; sub?: string; href?: string }) {
  const body = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-ink-soft">{label}</span>
        <span className="block font-heading text-2xl font-bold text-ink-strong">{value}</span>
        {sub && <span className="block text-xs text-ink-soft">{sub}</span>}
      </span>
    </>
  );
  const cls = "flex items-start gap-3 rounded-xl border border-line bg-card p-4 shadow-card sm:p-5";
  return href ? (
    <Link href={href} className={`${cls} transition-colors duration-200 hover:border-brand`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Dashboard() {
  const q = useApiQuery("dashboard", adminService.dashboard);
  const d = q.data;
  const occ = d?.occupancyTonight;
  const occPct = occ && occ.total > 0 ? Math.round((occ.booked / occ.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader title="Tổng quan" description="Số liệu vận hành toàn nền tảng." />
      <div className="mb-6">
        <DemoTools />
      </div>
      {q.loading && !d ? (
        <Spinner />
      ) : q.error || !d ? (
        <ErrorState message={q.error?.message} />
      ) : (
        <>
          <section aria-label="Chỉ số chính" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Stat
              icon={Hotel}
              label="Khách sạn"
              value={formatNumber(d.hotels.total)}
              sub={`${d.hotels.active} đang hoạt động · ${d.hotels.pending} chờ duyệt`}
              href={d.hotels.pending > 0 ? "/admin/hotels?status=PENDING_APPROVAL" : "/admin/hotels"}
            />
            <Stat icon={BedDouble} label="Công suất phòng đêm nay" value={`${occPct}%`} sub={occ ? `${occ.booked}/${occ.total} phòng đã bán` : undefined} />
            <Stat icon={Users} label="Người dùng" value={formatNumber(d.users.total)} href="/admin/users" />
            <Stat icon={Banknote} label="Doanh thu đã thu (gồm phí)" value={formatVnd(d.revenue.gross)} href="/admin/payments" />
            <Stat icon={Percent} label="Phí nền tảng" value={formatVnd(d.revenue.platformFee)} />
            <Stat icon={RotateCcw} label="Đã hoàn tiền" value={formatVnd(d.revenue.refunded)} />
          </section>

          <section aria-labelledby="bk-status" className="mt-6">
            <h2 id="bk-status" className="mb-3 text-lg font-bold">
              Đơn theo trạng thái
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {BOOKING_STATUSES.map((s) => (
                <li key={s} className="rounded-xl border border-line bg-white p-3">
                  <BookingStatusBadge status={s} />
                  <p className="mt-2 font-heading text-2xl font-bold" aria-label={`${BOOKING_STATUS[s].label}: ${d.bookings[s] ?? 0} đơn`}>
                    {formatNumber(d.bookings[s] ?? 0)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="recent" className="mt-8">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 id="recent" className="text-lg font-bold">
                Đơn gần đây
              </h2>
              <Link href="/admin/bookings" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline">
                Xem tất cả đơn
              </Link>
            </div>
            {(d.recentBookings ?? []).length === 0 ? (
              <p className="text-ink-soft">Chưa có đơn nào.</p>
            ) : (
              <Table caption="Đơn đặt phòng gần đây">
                <thead>
                  <tr>
                    <Th>Mã đơn</Th>
                    <Th>Khách</Th>
                    <Th>Khách sạn</Th>
                    <Th>Lưu trú</Th>
                    <Th>Tổng tiền</Th>
                    <Th>Trạng thái</Th>
                    <Th>Đặt lúc</Th>
                  </tr>
                </thead>
                <tbody>
                  {d.recentBookings.map((b) => (
                    <tr key={b.id}>
                      <Td className="font-mono text-xs font-semibold">{b.bookingCode}</Td>
                      <Td>{b.guestName}</Td>
                      <Td>{b.hotelName}</Td>
                      <Td className="whitespace-nowrap">{formatStayRange(b.checkIn, b.checkOut)}</Td>
                      <Td>{formatVnd(b.totalAmount)}</Td>
                      <Td>
                        <BookingStatusBadge status={b.status} />
                      </Td>
                      <Td className="text-xs">{formatDateTime(b.bookedAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
