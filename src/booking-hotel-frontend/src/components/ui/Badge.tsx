import { cn } from "@/lib/utils/cn";
import type { Tone } from "@/lib/utils/labels";

/** Màu nền/chữ đều đạt ≥ 4.5:1. Badge luôn có chữ, không chỉ dựa vào màu. */
const TONES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-300",
  info: "bg-blue-100 text-blue-900 ring-blue-300",
  success: "bg-green-100 text-green-800 ring-green-300",
  warning: "bg-amber-100 text-amber-900 ring-amber-300",
  danger: "bg-red-100 text-red-800 ring-red-300",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
