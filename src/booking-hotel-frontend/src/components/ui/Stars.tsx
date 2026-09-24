import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatRating } from "@/lib/utils/format";

/** Hiển thị sao (chỉ đọc) kèm nhãn đọc được bằng trình đọc màn hình. */
export function Stars({ value, count, className, size = "sm" }: { value?: number | null; count?: number; className?: string; size?: "sm" | "md" }) {
  const rounded = Math.round(value ?? 0);
  const iconCls = size === "md" ? "size-5" : "size-4";
  if (!value && !count) {
    return <span className={cn("text-sm text-ink-soft", className)}>Chưa có đánh giá</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="sr-only">
        Điểm {formatRating(value)} trên 5{count !== undefined ? `, ${count} đánh giá` : ""}
      </span>
      <span className="flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={cn(iconCls, i <= rounded ? "fill-amber-400 text-amber-500" : "text-slate-300")} />
        ))}
      </span>
      <span aria-hidden="true" className="text-sm font-semibold text-ink">
        {formatRating(value)}
      </span>
      {count !== undefined && (
        <span aria-hidden="true" className="text-sm text-ink-soft">
          ({count})
        </span>
      )}
    </span>
  );
}
