"use client";

import { Minus, Plus } from "lucide-react";

interface Props {
  id: string;
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

/** Bộ tăng/giảm số vé — không cho vượt [min, max]. */
export function QuantityStepper({ id, label, description, value, min, max, onChange }: Props) {
  const clamp = (n: number) => Math.min(Math.max(n, min), Math.max(min, max));
  const btn =
    "inline-flex size-11 items-center justify-center rounded-lg border border-line-strong bg-white text-ink transition-colors duration-200 hover:bg-brand-soft disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <label htmlFor={id} className="font-semibold text-ink">
          {label}
        </label>
        {description && (
          <p id={`${id}-desc`} className="text-sm text-ink-soft">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={btn}
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= min}
          aria-label={`Giảm ${label.toLowerCase()}`}
          aria-controls={id}
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          aria-describedby={description ? `${id}-desc` : undefined}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10);
            onChange(clamp(Number.isNaN(n) ? min : n));
          }}
          className="h-11 w-16 rounded-lg border border-line-strong bg-white text-center text-lg font-semibold text-ink [appearance:textfield] focus:border-brand focus:outline-none focus-visible:outline-2 focus-visible:outline-brand [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          className={btn}
          onClick={() => onChange(clamp(value + 1))}
          disabled={value >= max}
          aria-label={`Tăng ${label.toLowerCase()}`}
          aria-controls={id}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
