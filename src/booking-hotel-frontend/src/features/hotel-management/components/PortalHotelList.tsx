"use client";

import Link from "next/link";
import { Hotel, MapPin, Plus } from "lucide-react";
import { HotelImage } from "@/components/shared/HotelImage";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { LinkButton } from "@/components/ui/Button";
import { HotelClass } from "@/components/ui/HotelClass";
import { Spinner } from "@/components/ui/Spinner";
import { HotelStatusBadge } from "@/features/booking/components/BookingStatusBadge";
import { usePortalHotel } from "../context/PortalHotelContext";

export function PortalHotelList({ created }: { created?: boolean }) {
  const { hotels, loading, error } = usePortalHotel();
  return (
    <div>
      <PageHeader
        title="Khách sạn của tôi"
        description="Khách sạn mới cần quản trị viên duyệt trước khi hiển thị với khách."
        actions={
          <LinkButton href="/portal/hotels/new" variant="cta">
            <Plus className="size-4" aria-hidden="true" /> Đăng ký khách sạn mới
          </LinkButton>
        }
      />
      {created && (
        <Alert tone="success" className="mb-4" title="Đã gửi đăng ký khách sạn">
          Khách sạn đang ở trạng thái Chờ duyệt. Bạn có thể thêm loại phòng và số phòng trong lúc chờ.
        </Alert>
      )}
      {loading && hotels.length === 0 ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error.message} />
      ) : hotels.length === 0 ? (
        <EmptyState icon={Hotel} title="Chưa có khách sạn" description="Đăng ký khách sạn đầu tiên để bắt đầu nhận đặt phòng." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {hotels.map((h) => (
            <li key={h.id}>
              <article className="relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white shadow-card transition-shadow duration-200 hover:shadow-pop">
                <HotelImage src={h.coverImageUrl} alt="" />
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <HotelClass stars={h.starRating} />
                    <HotelStatusBadge status={h.status} />
                  </div>
                  <h2 className="text-lg font-bold">
                    <Link href={`/portal/hotels/${h.id}`} className="after:absolute after:inset-0 after:content-[''] hover:text-brand">
                      {h.name}
                    </Link>
                  </h2>
                  <p className="flex items-start gap-1.5 text-sm text-ink-soft">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" /> {h.address}, {h.city}
                  </p>
                  {h.status === "REJECTED" && (
                    <p className="text-sm text-danger">
                      Bị từ chối{h.rejectReason ? `: ${h.rejectReason}` : ""}. Sửa hồ sơ để gửi duyệt lại.
                    </p>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
