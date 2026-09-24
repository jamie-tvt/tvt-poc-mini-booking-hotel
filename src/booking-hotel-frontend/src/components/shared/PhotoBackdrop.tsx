import { cn } from "@/lib/utils/cn";
import { unsplashVariant } from "@/lib/utils/images";

/**
 * Nền mờ lấy màu từ chính ảnh (F6): bản ảnh nhỏ w=64 phóng to + blur, phủ lớp màu nền để chữ đủ tương phản.
 * Không dùng hook → dùng được trong Server Component. Cha cần `relative isolate`, nội dung đặt `relative` (hoặc z-index).
 * - tone "page": gradient màu nền trang 55% → 82% → 100% (đầu trang danh sách/chi tiết)
 * - tone "card": phủ trắng 80% (thẻ khách sạn, thẻ tóm tắt đơn)
 * prefers-reduced-transparency → ẩn ảnh, chỉ còn nền đặc (globals.css, .photo-backdrop).
 */
export function PhotoBackdrop({ src, className, tone = "page" }: { src?: string | null; className?: string; tone?: "page" | "card" }) {
  if (!src) return null;
  return (
    <div
      aria-hidden="true"
      data-tone={tone}
      className={cn("photo-backdrop pointer-events-none absolute inset-0 z-0 overflow-hidden", className)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={unsplashVariant(src, 64, 40)}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-[-10%] h-[120%] w-[120%] max-w-none scale-110 object-cover blur-[48px] saturate-[1.4]"
      />
      <div className={cn("absolute inset-0", tone === "page" ? "bg-linear-to-b from-bg/55 via-bg/82 via-55% to-bg" : "bg-white/80")} />
    </div>
  );
}
