import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Hạng sao khách sạn (1–5) — khác điểm đánh giá của khách. */
export function HotelClass({ stars, className }: { stars: number; className?: string }) {
  const n = Math.max(0, Math.min(5, Math.round(stars)));
  return (
    <span className={cn("inline-flex items-center", className)}>
      <span className="sr-only">Khách sạn {n} sao</span>
      <span className="flex gap-0.5" aria-hidden="true">
        {Array.from({ length: n }, (_, i) => (
          <Star key={i} className="size-3.5 fill-gold text-gold" />
        ))}
      </span>
    </span>
  );
}

/** Điểm đánh giá trung bình của khách: "4,6" + nhãn + số lượt. */
export function ReviewScore({ value, count, className }: { value?: number | null; count?: number; className?: string }) {
  if (!value || !count) return <span className={cn("text-sm text-ink-soft", className)}>Chưa có đánh giá</span>;
  const label = value >= 4.5 ? "Tuyệt vời" : value >= 4 ? "Rất tốt" : value >= 3.5 ? "Tốt" : "Hài lòng";
  const score = (Math.round(value * 10) / 10).toFixed(1).replace(".", ",");
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="rounded-md bg-brand px-1.5 py-0.5 text-sm font-bold text-white" aria-hidden="true">
        {score}
      </span>
      <span className="text-sm">
        <span className="font-semibold text-ink-strong">{label}</span>{" "}
        <span className="text-ink-soft">({count} đánh giá)</span>
        <span className="sr-only">, điểm {score} trên 5</span>
      </span>
    </span>
  );
}
