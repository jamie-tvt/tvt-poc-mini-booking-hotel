"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

import { PLACEHOLDER_IMAGE } from "@/lib/utils/images";

/** Ảnh khách sạn/loại phòng, có ảnh dự phòng khi URL hỏng. Dùng <img> vì URL có thể do chủ khách sạn nhập tay. */
export function HotelImage({
  src,
  alt,
  className,
  priority,
  fallback = PLACEHOLDER_IMAGE,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  fallback?: string;
}) {
  const [failed, setFailed] = useState(false);
  const url = !src || failed ? fallback : src;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
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
