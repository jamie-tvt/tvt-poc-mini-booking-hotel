"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { FacilityIcon } from "@/components/shared/FacilityIcon";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { HOTEL_SORT_OPTIONS } from "@/lib/utils/labels";
import { toQueryString } from "@/lib/utils/query";
import { todayVn, validateStay, type StayErrors } from "@/lib/utils/stay";
import type { FacilityCategoryDto } from "@/types/domain";
import type { HotelSearchParams } from "../types";
import { StayPicker, stayFromParams, type StayValue } from "./StayPicker";

interface FilterState {
  city: string;
  minPrice: string;
  maxPrice: string;
  stars: number[];
  facilityIds: number[];
  sort: string;
}

function csvInts(v: string | undefined): number[] {
  return (v ?? "")
    .split(",")
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isInteger(n) && n > 0);
}

function toFilterState(p: HotelSearchParams): FilterState {
  return {
    city: p.city ?? "",
    minPrice: p.minPrice ?? "",
    maxPrice: p.maxPrice ?? "",
    stars: csvInts(p.stars).filter((n) => n <= 5),
    facilityIds: csvInts(p.facilityIds),
    sort: p.sort ?? "",
  };
}

/** Bộ lọc kết quả — mọi điều kiện đồng bộ lên URL (về trang 0 khi đổi lọc). */
export function SearchFilters({
  initial,
  cities,
  categories,
}: {
  initial: HotelSearchParams;
  cities: string[];
  categories: FacilityCategoryDto[];
}) {
  const router = useRouter();
  const [f, setF] = useState<FilterState>(() => toFilterState(initial));
  const [stay, setStay] = useState<StayValue>(() => stayFromParams(initial));
  const [errors, setErrors] = useState<StayErrors>({});
  const [priceError, setPriceError] = useState<string | null>(null);
  const today = todayVn();

  function push(next: FilterState, nextStay: StayValue) {
    router.push(
      `/hotels${toQueryString({
        city: next.city,
        checkIn: nextStay.checkIn,
        checkOut: nextStay.checkOut,
        guests: nextStay.guests,
        rooms: nextStay.rooms,
        minPrice: next.minPrice,
        maxPrice: next.maxPrice,
        stars: [...next.stars].sort().join(","),
        facilityIds: next.facilityIds.join(","),
        sort: next.sort,
      })}`,
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateStay(stay, today, false);
    setErrors(errs);
    const badPrice = f.minPrice !== "" && f.maxPrice !== "" && Number(f.minPrice) > Number(f.maxPrice);
    setPriceError(badPrice ? "Giá tối thiểu không được lớn hơn giá tối đa." : null);
    if (Object.keys(errs).length || badPrice) return;
    push(f, stay);
  }

  function toggleFacility(id: number) {
    setF((prev) => ({
      ...prev,
      facilityIds: prev.facilityIds.includes(id) ? prev.facilityIds.filter((x) => x !== id) : [...prev.facilityIds, id],
    }));
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Bộ lọc khách sạn" className="flex flex-col gap-5 rounded-xl border border-line bg-white p-4 shadow-card">
      <div className="flex flex-col gap-3">
        <SelectField id="f-city" label="Thành phố" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}>
          <option value="">Tất cả thành phố</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>
        <StayPicker idPrefix="f" value={stay} onChange={setStay} errors={errors} today={today} layout="stacked" />
      </div>

      <fieldset className="flex flex-col gap-3 border-t border-line pt-4">
        <legend className="sr-only">Giá và hạng sao</legend>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            id="f-min"
            type="number"
            inputMode="numeric"
            min={0}
            step={100000}
            label="Giá từ (₫/đêm)"
            value={f.minPrice}
            onChange={(e) => setF({ ...f, minPrice: e.target.value })}
          />
          <TextField
            id="f-max"
            type="number"
            inputMode="numeric"
            min={0}
            step={100000}
            label="Giá đến (₫/đêm)"
            value={f.maxPrice}
            onChange={(e) => setF({ ...f, maxPrice: e.target.value })}
          />
        </div>
        {priceError && (
          <p role="alert" className="text-sm text-danger">
            {priceError}
          </p>
        )}
        <fieldset>
          <legend className="text-sm font-medium text-ink">Hạng sao</legend>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const id = `f-star-${star}`;
              const checked = f.stars.includes(star);
              return (
                <label
                  key={star}
                  htmlFor={id}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${
                    checked ? "border-brand bg-brand text-white" : "border-line-strong bg-white text-ink hover:bg-brand-soft"
                  }`}
                >
                  <input
                    id={id}
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => setF((prev) => ({ ...prev, stars: checked ? prev.stars.filter((x) => x !== star) : [...prev.stars, star] }))}
                  />
                  {star} sao
                </label>
              );
            })}
          </div>
        </fieldset>
        <SelectField
          id="f-sort"
          label="Sắp xếp"
          value={f.sort}
          onChange={(e) => {
            const next = { ...f, sort: e.target.value };
            setF(next);
            if (!Object.keys(validateStay(stay, today, false)).length) push(next, stay);
          }}
        >
          <option value="">Phù hợp nhất</option>
          {HOTEL_SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>
      </fieldset>

      {categories.length > 0 && (
        <div className="flex flex-col gap-4 border-t border-line pt-4">
          {categories
            .filter((c) => c.facilities.length > 0)
            .map((c) => (
              <fieldset key={c.id}>
                <legend className="text-sm font-semibold text-ink-strong">{c.name}</legend>
                <ul className="mt-2 flex flex-col gap-1">
                  {c.facilities.map((fac) => {
                    const id = `f-fac-${fac.id}`;
                    return (
                      <li key={fac.id}>
                        <label htmlFor={id} className="flex min-h-9 items-center gap-2 rounded-md px-1 text-sm text-ink hover:bg-brand-soft">
                          <input
                            id={id}
                            type="checkbox"
                            className="size-4 accent-brand"
                            checked={f.facilityIds.includes(fac.id)}
                            onChange={() => toggleFacility(fac.id)}
                          />
                          <FacilityIcon name={fac.icon} className="text-brand" />
                          {fac.name}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            ))}
        </div>
      )}

      <div className="flex gap-2 border-t border-line pt-4">
        <Button type="submit" className="flex-1">
          <Search className="size-4" aria-hidden="true" /> Tìm và lọc
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label="Xoá bộ lọc"
          onClick={() => {
            setF(toFilterState({}));
            setStay(stayFromParams({}));
            setErrors({});
            setPriceError(null);
            router.push("/hotels");
          }}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}
