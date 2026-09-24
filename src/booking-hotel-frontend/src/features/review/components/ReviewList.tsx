import { MessageSquareQuote } from "lucide-react";
import { Stars } from "@/components/ui/Stars";
import { formatDate } from "@/lib/utils/format";
import type { ReviewDto } from "@/types/domain";

export function ReviewList({ reviews }: { reviews: ReviewDto[] }) {
  if (reviews.length === 0) {
    return (
      <p className="flex items-center gap-2 text-ink-soft">
        <MessageSquareQuote className="size-5" aria-hidden="true" /> Chưa có đánh giá nào. Hãy là người đầu tiên sau kỳ nghỉ!
      </p>
    );
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-xl border border-line bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-ink-strong">{r.guestName}</p>
            <Stars value={r.rating} />
          </div>
          <p className="mt-2 whitespace-pre-line text-sm text-ink">{r.content}</p>
          <p className="mt-2 text-xs text-ink-soft">{formatDate(r.createdAt)}</p>
        </li>
      ))}
    </ul>
  );
}
