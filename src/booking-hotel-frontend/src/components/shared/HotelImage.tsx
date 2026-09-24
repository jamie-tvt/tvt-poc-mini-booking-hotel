"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

import { PLACEHOLDER_IMAGE, unsplashSrcSet, unsplashVariant } from "@/lib/utils/images";

/**
 * Ảnh khách sạn/loại phòng, có ảnh dự phòng (SVG local) khi URL hỏng hoặc mất mạng.
 * Dùng <img> vì URL có thể do chủ khách sạn nhập tay. Ảnh Unsplash: lấy bản rộng `width` (thẻ 800, chi tiết 1200)
 * hoặc srcSet theo `srcSetWidths` + `sizes`.
 */
export function HotelImage({
  src,
  alt,
  className,
  priority,
  fallback = PLACEHOLDER_IMAGE,
  width = 800,
  srcSetWidths,
  sizes,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  fallback?: string;
  width?: number;
  srcSetWidths?: number[];
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  const broken = !src || failed;
  const url = broken ? fallback : unsplashVariant(src, width);
  const srcSet = broken || !srcSetWidths ? undefined : unsplashSrcSet(src, srcSetWidths);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={800}
      height={500}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("aspect-[16/10] w-full bg-brand-soft object-cover", className)}
    />
  );
}
