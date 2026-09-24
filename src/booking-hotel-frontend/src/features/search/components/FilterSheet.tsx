"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Bottom sheet cho bộ lọc trên mobile (F6): role="dialog" aria-modal, Esc / nút đóng / bấm nền để đóng,
 * giữ focus trong sheet, khoá cuộn trang, đóng thì trả focus về nút đã mở.
 * Render qua portal vào <body> để không bị cha có backdrop-filter/isolate giới hạn vị trí và lớp.
 */
export function FilterSheet({
  title,
  onClose,
  returnFocus,
  children,
}: {
  title: string;
  onClose: () => void;
  /** Nút đã mở sheet — nhận lại focus khi đóng (Safari không focus nút khi bấm nên không dựa vào activeElement). */
  returnFocus?: HTMLElement | null;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const opener = returnFocus ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("[data-sheet-close]")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Đang mở bảng chọn khách/phòng bên trong → Esc chỉ đóng bảng đó
        if (panelRef.current?.querySelector('[aria-expanded="true"]')) return;
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-ink/35 backdrop-blur-[3px] animate-[fade-in_150ms_ease-out]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[88dvh] flex-col rounded-t-[20px] bg-white text-ink shadow-modal animate-[sheet-up_200ms_ease-out]"
      >
        <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong/40" />
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-1 pt-1.5">
          <h2 id={titleId} className="text-xl font-bold">
            {title}
          </h2>
          <button
            type="button"
            data-sheet-close
            onClick={onClose}
            aria-label="Đóng bộ lọc"
            className="-mr-2 inline-flex size-11 items-center justify-center rounded-full text-ink-soft transition-colors duration-200 hover:bg-brand-soft hover:text-ink"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
