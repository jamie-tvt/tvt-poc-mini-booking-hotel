"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/Field";
import { toQueryString } from "@/lib/utils/query";
import { todayVn, validateStay, type StayErrors } from "@/lib/utils/stay";
import { StayPicker, type StayValue } from "./StayPicker";

/** Ô tìm ở trang chủ: thành phố + ngày nhận/trả + khách/phòng → /hotels?... */
export function HeroSearch({ cities }: { cities: string[] }) {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [stay, setStay] = useState<StayValue>({ checkIn: "", checkOut: "", guests: 2, rooms: 1 });
  const [errors, setErrors] = useState<StayErrors>({});
  const today = todayVn();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Không chọn ngày vẫn tìm được (xem danh sách), nhưng đã chọn thì phải hợp lệ.
    const errs = validateStay(stay, today, false);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    router.push(
      `/hotels${toQueryString({
        city,
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        guests: stay.guests,
        rooms: stay.rooms,
      })}`,
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      role="search"
      aria-label="Tìm khách sạn"
      className="glass grid gap-3 rounded-2xl p-4 text-ink shadow-modal sm:p-5 xl:grid-cols-[minmax(11rem,1fr)_minmax(0,3.4fr)_auto] xl:items-start"
    >
      <SelectField id="hero-city" label="Điểm đến" value={city} onChange={(e) => setCity(e.target.value)}>
        <option value="">Tất cả thành phố</option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </SelectField>
      <StayPicker idPrefix="hero" value={stay} onChange={setStay} errors={errors} today={today} layout="inline" />
      <Button type="submit" variant="cta" size="lg" className="xl:mt-7">
        <Search className="size-5" aria-hidden="true" /> Tìm phòng
      </Button>
    </form>
  );
}
