"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarSearch } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StayPicker, type StayValue } from "@/features/search/components/StayPicker";
import { toQueryString } from "@/lib/utils/query";
import { todayVn, validateStay, type StayErrors } from "@/lib/utils/stay";

/** Form chọn ngày ngay trên trang chi tiết → tải lại trang với giá/tồn phòng theo ngày. */
export function HotelStayForm({ hotelId, initial }: { hotelId: number; initial: StayValue }) {
  const router = useRouter();
  const [stay, setStay] = useState<StayValue>(initial);
  const [errors, setErrors] = useState<StayErrors>({});
  const today = todayVn();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateStay(stay, today, true);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    router.push(
      `/hotels/${hotelId}${toQueryString({ checkIn: stay.checkIn, checkOut: stay.checkOut, guests: stay.guests, rooms: stay.rooms })}#rooms`,
    );
  }

  return (
    <form id="stay-form" onSubmit={onSubmit} noValidate aria-label="Chọn ngày lưu trú" className="scroll-mt-24 flex flex-col gap-3">
      <StayPicker idPrefix="detail" value={stay} onChange={setStay} errors={errors} today={today} layout="aside" />
      <Button type="submit" variant="primary">
        <CalendarSearch className="size-4" aria-hidden="true" /> Xem phòng trống
      </Button>
    </form>
  );
}
