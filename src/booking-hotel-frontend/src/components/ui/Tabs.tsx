"use client";

import { useId, useRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface TabItem<K extends string> {
  key: K;
  label: string;
  count?: number;
}

/** Tab bấm được bằng chuột và phím mũi tên (WAI-ARIA tabs). */
export function Tabs<K extends string>({
  items,
  value,
  onChange,
  label,
  idPrefix,
}: {
  items: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  label: string;
  idPrefix?: string;
}) {
  const autoId = useId();
  const prefix = idPrefix ?? autoId;
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % items.length;
    if (e.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = items.length - 1;
    if (next >= 0) {
      e.preventDefault();
      const item = items[next];
      if (item) onChange(item.key);
      refs.current[next]?.focus();
    }
  }

  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 border-b border-line">
      {items.map((item, i) => {
        const selected = item.key === value;
        return (
          <button
            key={item.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`${prefix}-tab-${item.key}`}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={`${prefix}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "-mb-px min-h-11 border-b-2 px-3 text-sm font-semibold transition-colors duration-200",
              selected ? "border-brand text-brand" : "border-transparent text-ink-soft hover:text-ink",
            )}
          >
            {item.label}
            {item.count !== undefined && <span className="ml-1.5 text-xs">({item.count})</span>}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ idPrefix, activeKey, children }: { idPrefix: string; activeKey: string; children: React.ReactNode }) {
  return (
    <div role="tabpanel" id={`${idPrefix}-panel`} aria-labelledby={`${idPrefix}-tab-${activeKey}`} tabIndex={0} className="pt-4 focus-visible:outline-offset-4">
      {children}
    </div>
  );
}
