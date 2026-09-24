"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";

/** Nội dung dùng chung cho các file error.tsx. */
export function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-20 text-center">
      <TriangleAlert className="size-12 text-cta" aria-hidden="true" />
      <h1 className="text-2xl font-bold">Đã có lỗi xảy ra</h1>
      <p className="text-ink-soft">Trang chưa hiển thị được. Bạn thử tải lại, nếu vẫn lỗi hãy quay lại sau ít phút.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>Thử lại</Button>
        <LinkButton href="/" variant="secondary">
          Về trang chủ
        </LinkButton>
      </div>
    </div>
  );
}
