"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowUpDown, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { FacilityIcon } from "@/components/shared/FacilityIcon";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { cn } from "@/lib/utils/cn";
import { formatDayMonth, formatVnd } from "@/lib/utils/format";
import { HOTEL_SORT_OPTIONS } from "@/lib/utils/labels";
import { toQueryString } from "@/lib/utils/query";
import { todayVn, validateStay, type StayErrors } from "@/lib/utils/stay";
import type { FacilityCategoryDto } from "@/types/domain";
import type { HotelSearchParams } from "../types";
import { FilterSheet } from "./FilterSheet";
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

export interface FilterChip {
  key: string;
  label: string;
  /** Tham số URL sau khi bỏ điều kiện này */
  next: HotelSearchParams;
}

/** Các điều kiện lọc đang bật (theo URL, không tính sắp xếp) → chip có nút ✕ trên mobile; số chip = n của "Bộ lọc (n)". */
export function activeFilterChips(p: HotelSearchParams, categories: FacilityCategoryDto[]): FilterChip[] {
  const chips: FilterChip[] = [];
  const without = (...keys: (keyof HotelSearchParams)[]): HotelSearchParams => {
    const next = { ...p };
    for (const k of keys) delete next[k];
    return next;
  };
  if (p.city) chips.push({ key: "city", label: p.city, next: without("city") });
  const guests = p.guests ?? "2";
  const rooms = p.rooms ?? "1";
  if (p.checkIn || p.checkOut) {
    chips.push({
      key: "stay",
      label: `${formatDayMonth(p.checkIn)} – ${formatDayMonth(p.checkOut)} · ${guests} khách`,
      next: without("checkIn", "checkOut", "guests", "rooms"),
    });
  } else if (guests !== "2" || rooms !== "1") {
    chips.push({ key: "guests", label: `${guests} khách · ${rooms} phòng`, next: without("guests", "rooms") });
  }
  const min = p.minPrice ? Number(p.minPrice) : NaN;
  const max = p.maxPrice ? Number(p.maxPrice) : NaN;
  if (Number.isFinite(min) || Number.isFinite(max)) {
    const label =
      Number.isFinite(min) && Number.isFinite(max)
        ? `${formatVnd(min)} – ${formatVnd(max)}`
        : Number.isFinite(min)
          ? `Từ ${formatVnd(min)}`
          : `Đến ${formatVnd(max)}`;
    chips.push({ key: "price", label, next: without("minPrice", "maxPrice") });
  }
  const stars = csvInts(p.stars).filter((n) => n <= 5);
  for (const s of stars) {
    const rest = stars.filter((x) => x !== s);
    chips.push({ key: `star-${s}`, label: `${s} sao`, next: { ...p, stars: rest.length ? rest.join(",") : undefined } });
  }
  const names = new Map(categories.flatMap((c) => c.facilities.map((f) => [f.id, f.name] as const)));
  const facIds = csvInts(p.facilityIds);
  for (const id of facIds) {
    const rest = facIds.filter((x) => x !== id);
    chips.push({
      key: `fac-${id}`,
      label: names.get(id) ?? `Tiện nghi #${id}`,
      next: { ...p, facilityIds: rest.length ? rest.join(",") : undefined },
    });
  }
  return chips;
}

/**
 * Bộ lọc kết quả — mọi điều kiện đồng bộ lên URL (về trang 0 khi đổi lọc).
 * ≥ lg: cột lọc bên trái như cũ. < lg (F6): ô tóm tắt + "Bộ lọc (n)" + "Sắp xếp" + chip điều kiện; bấm mở bottom sheet chứa đủ các ô lọc.
 */
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const today = todayVn();
  const chips = activeFilterChips(initial, categories);
  const urlStay = stayFromParams(initial);

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

  /** Kiểm tra rồi áp dụng; lỗi thì hiện cạnh ô tương ứng và trả false. */
  function apply(): boolean {
    const errs = validateStay(stay, today, false);
    setErrors(errs);
    const badPrice = f.minPrice !== "" && f.maxPrice !== "" && Number(f.minPrice) > Number(f.maxPrice);
    setPriceError(badPrice ? "Giá tối thiểu không được lớn hơn giá tối đa." : null);
    if (Object.keys(errs).length || badPrice) return false;
    push(f, stay);
    return true;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    apply();
  }

  function toggleFacility(id: number) {
    setF((prev) => ({
      ...prev,
      facilityIds: prev.facilityIds.includes(id) ? prev.facilityIds.filter((x) => x !== id) : [...prev.facilityIds, id],
    }));
  }

  function clearFields() {
    setF((prev) => ({ ...toFilterState({}), sort: prev.sort }));
    setStay(stayFromParams({}));
    setErrors({});
    setPriceError(null);
  }

  function openSheet(e: React.MouseEvent<HTMLElement>) {
    opener.current = e.currentTarget;
    setSheetOpen(true);
  }

  /** Đóng sheet không áp dụng → bỏ các thay đổi chưa áp dụng, quay về điều kiện đang có trên URL. */
  function closeSheet() {
    setSheetOpen(false);
    setF(toFilterState(initial));
    setStay(stayFromParams(initial));
    setErrors({});
    setPriceError(null);
  }

  function changeSort(sort: string) {
    const next = { ...f, sort };
    setF(next);
    if (!Object.keys(validateStay(stay, today, false)).length) push(next, stay);
  }

  /** Các ô lọc dùng chung cho cột lọc (prefix "f") và bottom sheet ("fs") — id khác nhau để nhãn không trỏ nhầm ô bị ẩn. */
  const fields = (p: string) => (
    <>
      <div className="flex flex-col gap-3">
        <SelectField id={`${p}-city`} label="Thành phố" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}>
          <option value="">Tất cả thành phố</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>
        <StayPicker idPrefix={p} value={stay} onChange={setStay} errors={errors} today={today} layout="stacked" />
      </div>

      <fieldset className="flex flex-col gap-3 border-t border-line pt-4">
        <legend className="sr-only">Giá và hạng sao</legend>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            id={`${p}-min`}
            type="number"
            inputMode="numeric"
            min={0}
            step={100000}
            label="Giá từ (₫/đêm)"
            value={f.minPrice}
            onChange={(e) => setF({ ...f, minPrice: e.target.value })}
          />
          <TextField
            id={`${p}-max`}
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
              const id = `${p}-star-${star}`;
              const checked = f.stars.includes(star);
              return (
                <label
                  key={star}
                  htmlFor={id}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand lg:min-h-9 ${
                    checked ? "border-brand bg-brand text-white" : "border-line-strong bg-white text-ink hover:bg-brand-soft"
                  }`}
                >
                  <input
                    id={id}
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() =>
                      setF((prev) => ({ ...prev, stars: checked ? prev.stars.filter((x) => x !== star) : [...prev.stars, star] }))
                    }
                  />
                  {star} sao
                </label>
              );
            })}
          </div>
        </fieldset>
      </fieldset>

      {categories.length > 0 && (
        <div className="flex flex-col gap-4 border-t border-line pt-4">
          {categories
            .filter((c) => c.facilities.length > 0)
            .map((c) => (
              <fieldset key={c.id}>
                <legend className="text-sm font-semibold text-ink-strong">{c.name}</legend>
                <ul className="mt-2 grid grid-cols-2 gap-1 lg:flex lg:flex-col">
                  {c.facilities.map((fac) => {
                    const id = `${p}-fac-${fac.id}`;
                    return (
                      <li key={fac.id}>
                        <label
                          htmlFor={id}
                          className="flex min-h-11 items-center gap-2 rounded-md px-1 text-sm text-ink hover:bg-brand-soft lg:min-h-9"
                        >
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
    </>
  );

  const summary = [
    initial.city || "Tất cả thành phố",
    urlStay.checkIn && urlStay.checkOut ? `${formatDayMonth(urlStay.checkIn)} – ${formatDayMonth(urlStay.checkOut)}` : "Chọn ngày",
    `${urlStay.guests} khách`,
  ].join(" · ");

  return (
    <>
      {/* ≥ lg: cột lọc bên trái (giữ bố cục cũ, thêm nền kính) */}
      <form onSubmit={onSubmit} noValidate aria-label="Bộ lọc khách sạn" className="glass hidden flex-col gap-5 p-4 lg:flex">
        {fields("f")}
        <SelectField id="f-sort" label="Sắp xếp" value={f.sort} onChange={(e) => changeSort(e.target.value)}>
          <option value="">Phù hợp nhất</option>
          {HOTEL_SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>
        <div className="flex gap-2 border-t border-line pt-4">
          <Button type="submit" className="flex-1">
            <Search className="size-4" aria-hidden="true" /> Tìm và lọc
          </Button>
          <Button
            type="button"
            variant="ghost"
            aria-label="Xoá bộ lọc"
            onClick={() => {
              clearFields();
              setF(toFilterState({}));
              router.push("/hotels");
            }}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </form>

      {/* < lg: thanh lọc gọn, kết quả hiện ngay màn hình đầu */}
      <div className="flex flex-col gap-2.5 lg:hidden">
        <button
          type="button"
          onClick={openSheet}
          aria-label={`Sửa điểm đến, ngày và số khách: ${summary}`}
          className="flex min-h-12 w-full items-center gap-2.5 rounded-xl border border-line-strong/60 bg-white/85 px-3.5 text-left text-sm text-ink shadow-card transition-colors duration-200 hover:border-brand"
        >
          <Search className="size-4 shrink-0 text-brand" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate font-medium">{summary}</span>
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openSheet}
            aria-haspopup="dialog"
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors duration-200",
              chips.length
                ? "border-brand bg-brand text-white hover:bg-brand-hover"
                : "border-line-strong/60 bg-white/85 text-ink hover:border-brand",
            )}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" /> Bộ lọc{chips.length ? ` (${chips.length})` : ""}
          </button>
          <label htmlFor="fm-sort" className="sr-only">
            Sắp xếp
          </label>
          <div className="relative min-w-0 flex-1">
            <ArrowUpDown className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-brand" aria-hidden="true" />
            <select
              id="fm-sort"
              value={initial.sort ?? ""}
              onChange={(e) => {
                const next = { ...toFilterState(initial), sort: e.target.value };
                if (!Object.keys(validateStay(urlStay, today, false)).length) push(next, urlStay);
              }}
              className="min-h-11 w-full min-w-0 truncate rounded-full border border-line-strong/60 bg-white/85 pl-9 pr-8 text-sm font-medium text-ink transition-colors duration-200 hover:border-brand"
            >
              <option value="">Phù hợp nhất</option>
              {HOTEL_SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {chips.length > 0 && (
          <ul aria-label="Điều kiện lọc đang bật" className="flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => router.push(`/hotels${toQueryString(c.next)}`)}
                  aria-label={`Bỏ lọc ${c.label}`}
                  className="inline-flex min-h-9 items-center gap-1 rounded-full border border-brand/25 bg-white/85 py-1 pl-3 pr-2 text-[13px] font-medium text-ink transition-colors duration-200 hover:border-brand hover:bg-brand-soft"
                >
                  {c.label}
                  <X className="size-3.5 text-ink-soft" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {sheetOpen && (
        <FilterSheet title="Bộ lọc" onClose={closeSheet} returnFocus={opener.current}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (apply()) setSheetOpen(false);
            }}
            noValidate
            aria-label="Bộ lọc khách sạn"
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-4 pb-4 pt-2">{fields("fs")}</div>
            <div className="flex shrink-0 items-center gap-3 border-t border-line bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <Button type="button" variant="ghost" onClick={clearFields} className="shrink-0 underline-offset-2 hover:underline">
                Xoá tất cả
              </Button>
              <Button type="submit" variant="cta" size="lg" className="flex-1">
                Áp dụng
              </Button>
            </div>
          </form>
        </FilterSheet>
      )}
    </>
  );
}
