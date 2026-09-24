import Link from "next/link";
import { BedDouble, MapPin } from "lucide-react";
import { HotelImage } from "@/components/shared/HotelImage";
import { HotelClass, ReviewScore } from "@/components/ui/HotelClass";
import { cn } from "@/lib/utils/cn";
import { formatVnd } from "@/lib/utils/format";
import { toQueryString } from "@/lib/utils/query";
import type { HotelSummaryDto } from "@/types/domain";
import type { HotelSearchParams } from "../types";

export function hotelHref(id: number, stay: HotelSearchParams = {}): string {
  return `/hotels/${id}${toQueryString({ checkIn: stay.checkIn, checkOut: stay.checkOut, guests: stay.guests, rooms: stay.rooms })}`;
}

export function HotelCard({ hotel, stay, priority }: { hotel: HotelSummaryDto; stay?: HotelSearchParams; priority?: boolean }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-card shadow-card transition-shadow duration-200 hover:shadow-pop focus-within:shadow-pop">
      <HotelImage src={hotel.coverImageUrl} alt="" priority={priority} />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <HotelClass stars={hotel.starRating} />
        <h3 className="text-lg font-bold leading-snug">
          <Link
            href={hotelHref(hotel.id, stay)}
            className="rounded-sm text-ink-strong after:absolute after:inset-0 after:content-[''] group-hover:text-brand"
          >
            {hotel.name}
          </Link>
        </h3>
        <p className="flex items-start gap-1.5 text-sm text-ink-soft">
          <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
          <span>
            <span className="font-medium text-ink">{hotel.city}</span>
            {hotel.address ? ` · ${hotel.address}` : ""}
          </span>
        </p>
        {hotel.availableRoomTypes > 0 && (
          <p className="flex items-center gap-1.5 text-sm text-ink-soft">
            <BedDouble className="size-4 shrink-0 text-brand" aria-hidden="true" />
            {hotel.availableRoomTypes} loại phòng còn trống
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 border-t border-line pt-3">
          <ReviewScore value={hotel.ratingAverage} count={hotel.ratingCount} />
          {hotel.fromPrice ? (
            <p className="text-right">
              <span className="block text-xs text-ink-soft">từ</span>
              <span className="font-heading text-xl font-bold text-cta">{formatVnd(hotel.fromPrice)}</span>
              <span className="block text-xs text-ink-soft">/đêm (đã gồm phí)</span>
            </p>
          ) : (
            <p className="text-sm text-ink-soft">Chọn ngày để xem giá</p>
          )}
        </div>
      </div>
    </article>
  );
}

export function HotelGrid({ hotels, stay, wide }: { hotels: HotelSummaryDto[]; stay?: HotelSearchParams; wide?: boolean }) {
  return (
    <ul className={cn("grid grid-cols-1 gap-5 sm:grid-cols-2", wide && "lg:grid-cols-3")}>
      {hotels.map((h, i) => (
        <li key={h.id}>
          <HotelCard hotel={h} stay={stay} priority={i < 3} />
        </li>
      ))}
    </ul>
  );
}
