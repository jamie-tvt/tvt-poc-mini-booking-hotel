"use client";

import { useApiQuery } from "@/lib/api/hooks";
import type { BookingDto } from "@/types/domain";
import { opsService } from "../services/opsService";

export interface FrontDeskData {
  arrivals: BookingDto[];
  departures: BookingDto[];
  inHouse: BookingDto[];
  overdue: BookingDto[];
}

/**
 * Dữ liệu lễ tân cho 1 khách sạn & 1 ngày:
 * - GET /portal/bookings?date=D (ngày nhận HOẶC trả = D) → tách khách đến / khách đi;
 * - GET ?status=CHECKED_IN → đang ở; GET ?status=CONFIRMED lọc nhận phòng < hôm nay → quá hạn chưa đến.
 */
export function useFrontDeskData(hotelId: number | null, date: string, today: string) {
  return useApiQuery<FrontDeskData>(
    `frontdesk-${hotelId}-${date}-${today}`,
    async () => {
      const id = hotelId ?? undefined;
      const [byDate, inHouse, confirmed] = await Promise.all([
        opsService.bookings({ hotelId: id, date, size: 100 }),
        opsService.bookings({ hotelId: id, status: "CHECKED_IN", size: 100 }),
        opsService.bookings({ hotelId: id, status: "CONFIRMED", size: 100 }),
      ]);
      const hidden = new Set(["CANCELLED", "EXPIRED"]);
      return {
        arrivals: byDate.content.filter((b) => b.checkIn === date && !hidden.has(b.status)),
        departures: byDate.content.filter((b) => b.checkOut === date && (b.status === "CHECKED_IN" || b.status === "CHECKED_OUT")),
        inHouse: inHouse.content,
        overdue: confirmed.content.filter((b) => b.checkIn < today),
      };
    },
    hotelId !== null,
  );
}
