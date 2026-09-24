import Link from "next/link";
import { BedDouble, CircleCheck, Maximize, Users } from "lucide-react";
import { HotelImage } from "@/components/shared/HotelImage";
import { roomImageFor } from "@/lib/utils/images";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { formatNumber, formatVnd } from "@/lib/utils/format";
import { toQueryString } from "@/lib/utils/query";
import { cancellationLabel, nightsBetween, priceBreakdown } from "@/lib/utils/stay";
import type { RoomTypeDto } from "@/types/domain";
import { FacilityChips } from "./FacilityGroups";

export interface StaySelection {
  checkIn?: string;
  checkOut?: string;
  guests: number;
  rooms: number;
}

export function checkoutHref(hotelId: number, roomTypeId: number, s: StaySelection): string {
  return `/checkout${toQueryString({ hotelId, roomTypeId, checkIn: s.checkIn, checkOut: s.checkOut, guests: s.guests, rooms: s.rooms })}`;
}

/** Thẻ loại phòng: thông tin, chính sách huỷ, tồn phòng, giá/đêm + tổng khoảng ngày, nút đặt. */
export function RoomTypeCard({ room, stay, today }: { room: RoomTypeDto; stay: StaySelection; today: string }) {
  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const hasDates = nights > 0;
  const available = room.availableRooms;
  const soldOut = hasDates && available !== undefined && available !== null && available <= 0;
  const notEnoughRooms = hasDates && !soldOut && available != null && available < stay.rooms;
  const overCapacity = room.capacity * stay.rooms < stay.guests;
  const price = priceBreakdown(room.nightlyPrices, stay.rooms, room.basePrice, room.stayTotal);
  const canBook = hasDates && !soldOut && !notEnoughRooms && !overCapacity;
  const cancel = cancellationLabel(room.cancellationPolicy, room.freeCancelDays, hasDates ? stay.checkIn : null, today);
  const free = room.cancellationPolicy === "FREE_BEFORE_DATE" && !cancel.startsWith("Đã qua");

  return (
    <article className="grid overflow-hidden rounded-xl border border-line bg-white shadow-card md:grid-cols-[240px_1fr]" aria-labelledby={`rt-${room.id}`}>
      <HotelImage src={roomImageFor(room.name, room.imageUrl)} alt="" fallback="/images/rooms/standard.svg" className="h-full md:aspect-auto" />
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_220px]">
        <div className="flex min-w-0 flex-col gap-2">
          <h3 id={`rt-${room.id}`} className="text-xl font-bold">
            {room.name}
          </h3>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
            <li className="flex items-center gap-1.5">
              <Users className="size-4 text-brand" aria-hidden="true" /> Tối đa {room.capacity} khách/phòng
            </li>
            <li className="flex items-center gap-1.5">
              <BedDouble className="size-4 text-brand" aria-hidden="true" /> {room.bedInfo}
            </li>
            <li className="flex items-center gap-1.5">
              <Maximize className="size-4 text-brand" aria-hidden="true" /> {formatNumber(room.areaM2)} m²
            </li>
          </ul>
          {room.description && <p className="text-sm text-ink">{room.description}</p>}
          <FacilityChips facilities={room.facilities} />
          <p className={cn("flex items-center gap-1.5 text-sm font-semibold", free ? "text-green-800" : "text-danger")}>
            <CircleCheck className="size-4" aria-hidden="true" /> {cancel}
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-line pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          {hasDates && available != null && (
            <p className={cn("text-sm font-semibold", soldOut ? "text-danger" : available <= 3 ? "text-cta-ink" : "text-green-800")}>
              {soldOut ? "Hết phòng trong khoảng ngày này" : `Còn ${available} phòng`}
            </p>
          )}
          <p>
            <span className="font-heading text-2xl font-bold text-cta">{formatVnd(room.listingPrice)}</span>
            <span className="text-sm text-ink-soft"> /đêm</span>
          </p>
          <p className="text-xs text-ink-soft">Đã gồm phí nền tảng</p>
          {hasDates && price.total > 0 && (
            <p className="text-sm text-ink">
              Tổng {nights} đêm × {stay.rooms} phòng: <strong className="text-ink-strong">{formatVnd(price.total)}</strong>
            </p>
          )}
          {overCapacity && (
            <p className="text-sm text-danger">
              {stay.rooms} phòng chỉ chứa tối đa {room.capacity * stay.rooms} khách — tăng số phòng hoặc chọn loại phòng khác.
            </p>
          )}
          {notEnoughRooms && <p className="text-sm text-danger">Chỉ còn {available} phòng, bạn cần {stay.rooms} phòng.</p>}
          {canBook ? (
            <Link
              href={checkoutHref(room.hotelId, room.id, stay)}
              className={buttonClasses("cta", "md", "mt-auto")}
              aria-label={`Đặt phòng này: ${room.name}`}
            >
              Đặt phòng này
            </Link>
          ) : !hasDates ? (
            <a href="#stay-form" className={buttonClasses("secondary", "md", "mt-auto")}>
              Chọn ngày để đặt
            </a>
          ) : (
            <span className={buttonClasses("secondary", "md", "mt-auto opacity-60")} aria-disabled="true">
              Không đặt được
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
