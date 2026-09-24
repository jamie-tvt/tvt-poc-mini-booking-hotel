"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { BookingStatusBadge } from "@/features/booking/components/BookingStatusBadge";
import { BookingSummaryCard } from "@/features/booking/components/BookingSummaryCard";
import { InvoiceCard } from "@/features/booking/components/InvoiceCard";
import { useApiQuery } from "@/lib/api/hooks";
import { formatDateTime } from "@/lib/utils/format";
import { cancellationLabel } from "@/lib/utils/stay";
import { opsService } from "../services/opsService";
import { BookingActions } from "./BookingActions";
import { useBusinessToday } from "./useBusinessToday";

export function PortalBookingDetail({ id }: { id: string }) {
  const q = useApiQuery(`portal-booking-${id}`, () => opsService.booking(id));
  const today = useBusinessToday();
  const [notice, setNotice] = useState<string | null>(null);
  const b = q.data;

  if (q.loading && !b) return <Spinner />;
  if (q.error || !b) return <ErrorState title={q.error?.status === 404 ? "Không tìm thấy đơn" : undefined} message={q.error?.message} />;

  return (
    <div>
      <Link href="/portal/bookings" className="inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-medium text-brand hover:underline">
        <ChevronLeft className="size-4" aria-hidden="true" /> Danh sách đơn
      </Link>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Đơn <span className="font-mono">{b.bookingCode}</span>
        </h1>
        <BookingStatusBadge status={b.status} />
      </div>
      {notice && (
        <Alert tone="success" className="mt-4">
          {notice}
        </Alert>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <BookingSummaryCard booking={b} hotelLink={false} />
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">Lễ tân</h2>
            <BookingActions
              booking={b}
              today={today}
              size="md"
              onChanged={(nb, msg) => {
                q.setData(nb);
                setNotice(msg);
                void q.reload();
              }}
            />
            <p className="text-sm text-ink-soft">Chính sách huỷ: {cancellationLabel(b.cancellationPolicy, b.freeCancelDays, b.checkIn)}.</p>
            {b.cancelledAt && (
              <p className="text-sm text-ink-soft">
                Huỷ lúc {formatDateTime(b.cancelledAt)}
                {b.cancelReason ? ` — ${b.cancelReason}` : ""}
              </p>
            )}
          </Card>
          {b.invoice && <InvoiceCard invoice={b.invoice} />}
        </div>
      </div>
    </div>
  );
}
