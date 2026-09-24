"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextAreaField } from "@/components/ui/Field";
import { useMutation } from "@/lib/api/hooks";
import { cn } from "@/lib/utils/cn";
import { zodFieldErrors } from "@/lib/utils/validation";
import { reviewService } from "../services/reviewService";
import { reviewSchema } from "../validators/reviewSchema";

export function ReviewForm({ bookingCode, accessKey, onDone }: { bookingCode: string; accessKey: string; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation(reviewService.create);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = reviewSchema.safeParse({ rating, content });
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    const res = await m.run({ bookingCode, key: accessKey, ...parsed.data });
    if (res) onDone();
  }

  const fe = { ...m.fieldErrors, ...errors };
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <fieldset>
        <legend className="text-sm font-medium text-ink">
          Chấm điểm kỳ nghỉ <span className="text-danger" aria-hidden="true">*</span>
        </legend>
        <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Số sao">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer rounded-md p-1 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink">
              <input
                type="radio"
                name="rating"
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                className="sr-only"
                aria-label={`${n} sao`}
              />
              <Star
                className={cn("size-8 transition-colors duration-150", n <= rating ? "fill-amber-400 text-amber-500" : "text-slate-300 hover:text-amber-400")}
                aria-hidden="true"
              />
            </label>
          ))}
        </div>
        {fe.rating && (
          <p role="alert" className="mt-1 text-sm text-danger">
            {fe.rating}
          </p>
        )}
      </fieldset>
      <TextAreaField
        id="review-content"
        label="Cảm nhận của bạn"
        hint="Tối thiểu 10 ký tự"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        error={fe.content}
        maxLength={2000}
        required
      />
      {m.error && !m.error.errors.length && <Alert tone="error">{m.error.message}</Alert>}
      <Button type="submit" loading={m.pending} className="self-start">
        Gửi đánh giá
      </Button>
    </form>
  );
}
