import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const itemCls =
  "inline-flex min-h-10 min-w-10 items-center justify-center gap-1 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink transition-colors duration-200 hover:bg-brand-soft";

function pageWindow(page: number, totalPages: number): number[] {
  const start = Math.max(0, Math.min(page - 2, totalPages - 5));
  const end = Math.min(totalPages, start + 5);
  return Array.from({ length: end - start }, (_, i) => start + i);
}

/** Phân trang bằng link (dùng ở Server Component). `page` 0-based. */
export function LinkPagination({
  page,
  totalPages,
  hrefFor,
  label = "Phân trang",
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  label?: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label={label} className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {page > 0 ? (
        <Link href={hrefFor(page - 1)} className={itemCls} aria-label="Trang trước">
          <ChevronLeft className="size-4" aria-hidden="true" /> <span className="hidden sm:inline">Trước</span>
        </Link>
      ) : null}
      {pageWindow(page, totalPages).map((p) => (
        <Link
          key={p}
          href={hrefFor(p)}
          aria-current={p === page ? "page" : undefined}
          aria-label={`Trang ${p + 1}`}
          className={cn(itemCls, p === page && "border-brand bg-brand text-white hover:bg-brand-hover")}
        >
          {p + 1}
        </Link>
      ))}
      {page < totalPages - 1 ? (
        <Link href={hrefFor(page + 1)} className={itemCls} aria-label="Trang sau">
          <span className="hidden sm:inline">Sau</span> <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </nav>
  );
}

/** Phân trang bằng nút (dùng ở Client Component). */
export function ButtonPagination({
  page,
  totalPages,
  onChange,
  label = "Phân trang",
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  label?: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label={label} className="mt-6 flex flex-wrap items-center justify-center gap-2">
      <button type="button" className={itemCls} onClick={() => onChange(page - 1)} disabled={page <= 0} aria-label="Trang trước">
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      {pageWindow(page, totalPages).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-current={p === page ? "page" : undefined}
          aria-label={`Trang ${p + 1}`}
          className={cn(itemCls, p === page && "border-brand bg-brand text-white hover:bg-brand-hover")}
        >
          {p + 1}
        </button>
      ))}
      <button
        type="button"
        className={itemCls}
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages - 1}
        aria-label="Trang sau"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
