"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Users } from "lucide-react";
import { TextField } from "@/components/ui/Field";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { MAX_GUESTS, MAX_ROOMS } from "@/lib/config/env";
import { cn } from "@/lib/utils/cn";
import { addDays, isValidYmd, nightsBetween, type StayErrors, type StayInput } from "@/lib/utils/stay";

export type StayValue = StayInput;

export { stayFromParams } from "@/lib/utils/stay";

/**
 * Bộ chọn ngày nhận – trả phòng và số khách/phòng (controlled).
 * Đổi ngày nhận mà ngày trả không còn hợp lệ → tự dời ngày trả sang hôm sau.
 */
export function StayPicker({
  value,
  onChange,
  errors = {},
  today,
  idPrefix = "stay",
  layout = "grid",
  className,
}: {
  value: StayValue;
  onChange: (next: StayValue) => void;
  errors?: StayErrors;
  today: string;
  idPrefix?: string;
  /** grid: 2 cột; inline: 3 cột trên màn rộng (hero); stacked: 1 cột (cột lọc); aside: 2 cột, về 1 cột khi nằm trong cột hẹp ≥ lg */
  layout?: "grid" | "inline" | "stacked" | "aside";
  className?: string;
}) {
  const nights = nightsBetween(value.checkIn, value.checkOut);

  function setCheckIn(checkIn: string) {
    let checkOut = value.checkOut;
    if (isValidYmd(checkIn) && (!isValidYmd(checkOut) || checkOut <= checkIn)) checkOut = addDays(checkIn, 1);
    onChange({ ...value, checkIn, checkOut });
  }

  return (
    <div
      className={cn(
        "grid gap-3",
        layout !== "stacked" && "sm:grid-cols-2",
        layout === "inline" && "lg:grid-cols-3",
        layout === "aside" && "lg:grid-cols-1",
        className,
      )}
    >
      <TextField
        id={`${idPrefix}-checkin`}
        type="date"
        label="Ngày nhận phòng"
        min={today}
        value={value.checkIn}
        onChange={(e) => setCheckIn(e.target.value)}
        error={errors.checkIn}
      />
      <TextField
        id={`${idPrefix}-checkout`}
        type="date"
        label="Ngày trả phòng"
        min={isValidYmd(value.checkIn) ? addDays(value.checkIn, 1) : addDays(today, 1)}
        value={value.checkOut}
        onChange={(e) => onChange({ ...value, checkOut: e.target.value })}
        error={errors.checkOut}
        hint={nights > 0 ? `${nights} đêm` : undefined}
      />
      <GuestRoomPicker
        idPrefix={idPrefix}
        guests={value.guests}
        rooms={value.rooms}
        onChange={(guests, rooms) => onChange({ ...value, guests, rooms })}
        error={errors.guests ?? errors.rooms}
        className={cn(layout !== "stacked" && "sm:col-span-2", (layout === "inline" || layout === "aside") && "lg:col-span-1")}
      />
    </div>
  );
}

/** Nút tóm tắt "2 khách · 1 phòng" mở bảng chỉnh số khách/phòng (disclosure, Esc/bấm ngoài để đóng). */
export function GuestRoomPicker({
  idPrefix,
  guests,
  rooms,
  onChange,
  error,
  className,
}: {
  idPrefix: string;
  guests: number;
  rooms: number;
  onChange: (guests: number, rooms: number) => void;
  error?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const labelId = `${idPrefix}-guests-label`;
  const summary = `${guests} khách · ${rooms} phòng`;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative flex flex-col gap-1.5", className)}>
      <span id={labelId} className="text-sm font-medium text-ink">
        Khách và phòng
      </span>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Khách và phòng: ${summary}`}
        aria-describedby={error ? `${idPrefix}-guests-error` : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 text-left text-base text-ink transition-colors duration-200 hover:border-brand",
          error ? "border-danger" : "border-line-strong",
        )}
      >
        <span className="flex min-w-0 items-center gap-2 whitespace-nowrap">
          <Users className="size-4 shrink-0 text-brand" aria-hidden="true" />
          {summary}
        </span>
        <ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180")} aria-hidden="true" />
      </button>
      {error && (
        <p id={`${idPrefix}-guests-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {open && (
        <div
          id={panelId}
          role="group"
          aria-labelledby={labelId}
          className="absolute left-0 right-0 top-full z-30 mt-2 flex flex-col gap-4 rounded-xl border border-line bg-white p-4 shadow-pop sm:min-w-80"
        >
          <QuantityStepper
            id={`${idPrefix}-guests`}
            label="Số khách"
            description={`Tối đa ${MAX_GUESTS} khách`}
            value={guests}
            min={1}
            max={MAX_GUESTS}
            onChange={(g) => onChange(g, Math.min(rooms, g))}
          />
          <QuantityStepper
            id={`${idPrefix}-rooms`}
            label="Số phòng"
            description={`Tối đa ${MAX_ROOMS} phòng mỗi đơn`}
            value={rooms}
            min={1}
            max={MAX_ROOMS}
            onChange={(r) => onChange(Math.max(guests, r), r)}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="min-h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-hover"
          >
            Xong
          </button>
        </div>
      )}
    </div>
  );
}
