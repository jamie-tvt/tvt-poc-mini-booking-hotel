"use client";

import Link from "next/link";
import { useState } from "react";
import { BedDouble, CalendarClock, DoorClosed, DoorOpen, Hotel } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { LinkButton } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { HotelStatusBadge } from "@/features/booking/components/BookingStatusBadge";
import { usePortalHotel } from "@/features/hotel-management/context/PortalHotelContext";
import { useAuth } from "@/lib/auth/AuthProvider";
import { formatStayDateWithWeekday } from "@/lib/utils/format";
import { StayTable } from "./StayTable";
import { useBusinessToday } from "./useBusinessToday";
import { useFrontDeskData } from "./useFrontDeskData";

function Stat({ icon: Icon, label, value, href }: { icon: LucideIcon; label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-line bg-white p-4 shadow-card transition-colors duration-200 hover:border-brand sm:p-5"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-sm text-ink-soft">{label}</span>
        <span className="font-heading text-3xl font-bold text-ink-strong">{value}</span>
      </span>
    </Link>
  );
}

/** Tổng quan hôm nay: khách đến, khách đi, đang ở. */
export function PortalOverview() {
  const { user } = useAuth();
  const { hotel, hotelId, hotels, loading: hotelsLoading, error: hotelsError } = usePortalHotel();
  const today = useBusinessToday();
  const q = useFrontDeskData(hotelId, today, today);
  const [notice, setNotice] = useState<string | null>(null);

  if (hotelsLoading && hotels.length === 0) return <Spinner />;
  if (hotelsError) return <ErrorState message={hotelsError.message} />;
  if (!hotel) {
    return (
      <EmptyState
        icon={Hotel}
        title="Bạn chưa có khách sạn nào"
        description={user?.role === "HOTEL_OWNER" ? "Đăng ký khách sạn đầu tiên để bắt đầu nhận đặt phòng." : "Tài khoản chưa được gán khách sạn."}
        action={user?.role === "HOTEL_OWNER" ? <LinkButton href="/portal/hotels/new">Đăng ký khách sạn mới</LinkButton> : undefined}
      />
    );
  }

  const onChanged = (_: unknown, message: string) => {
    setNotice(message);
    void q.reload();
  };

  return (
    <div>
      <PageHeader
        title="Tổng quan hôm nay"
        description={`${hotel.name} · ${formatStayDateWithWeekday(today)}`}
        actions={
          <LinkButton href="/portal/front-desk" variant="secondary">
            <CalendarClock className="size-4" aria-hidden="true" /> Mở màn lễ tân
          </LinkButton>
        }
      />
      {hotel.status !== "ACTIVE" && (
        <Alert tone="warning" className="mb-4" title="Khách sạn chưa hiển thị với khách">
          Trạng thái hiện tại: <HotelStatusBadge status={hotel.status} />. Chỉ khách sạn đang hoạt động mới nhận đặt phòng.
        </Alert>
      )}
      {notice && (
        <Alert tone="success" className="mb-4">
          {notice}
        </Alert>
      )}
      {q.loading && !q.data ? (
        <Spinner />
      ) : q.error || !q.data ? (
        <ErrorState message={q.error?.message} />
      ) : (
        <>
          <section aria-label="Số liệu hôm nay" className="grid gap-4 sm:grid-cols-3">
            <Stat icon={DoorOpen} label="Khách đến hôm nay" value={q.data.arrivals.length} href="/portal/front-desk?tab=arrivals" />
            <Stat icon={DoorClosed} label="Khách đi hôm nay" value={q.data.departures.length} href="/portal/front-desk?tab=departures" />
            <Stat icon={BedDouble} label="Đang lưu trú" value={q.data.inHouse.length} href="/portal/front-desk?tab=in-house" />
          </section>
          {q.data.overdue.length > 0 && (
            <Alert tone="warning" className="mt-4" title={`${q.data.overdue.length} đơn quá ngày nhận phòng chưa đến`}>
              Kiểm tra và đánh dấu Không đến tại{" "}
              <Link href="/portal/front-desk?tab=overdue" className="font-semibold underline">
                màn lễ tân
              </Link>
              .
            </Alert>
          )}
          <section aria-labelledby="ov-arr" className="mt-8">
            <h2 id="ov-arr" className="mb-3 text-lg font-bold">
              Khách đến hôm nay
            </h2>
            <StayTable caption="Khách đến hôm nay" bookings={q.data.arrivals} today={today} onChanged={onChanged} emptyText="Hôm nay không có khách đến." />
          </section>
          <section aria-labelledby="ov-dep" className="mt-8">
            <h2 id="ov-dep" className="mb-3 text-lg font-bold">
              Khách đi hôm nay
            </h2>
            <StayTable caption="Khách đi hôm nay" bookings={q.data.departures} today={today} onChanged={onChanged} emptyText="Hôm nay không có khách trả phòng." />
          </section>
          <section aria-labelledby="ov-in" className="mt-8">
            <h2 id="ov-in" className="mb-3 text-lg font-bold">
              Đang lưu trú
            </h2>
            <StayTable caption="Khách đang lưu trú" bookings={q.data.inHouse} today={today} onChanged={onChanged} emptyText="Chưa có khách đang ở." />
          </section>
        </>
      )}
    </div>
  );
}
