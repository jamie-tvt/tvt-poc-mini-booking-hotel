import { CloudOff } from "lucide-react";

/** Trạng thái lỗi thân thiện (VD backend chưa chạy). Có thể dùng trong Server Component. */
export function ErrorState({
  title = "Chưa tải được dữ liệu",
  message,
  action,
}: {
  title?: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-white px-6 py-12 text-center">
      <CloudOff className="size-10 text-danger" aria-hidden="true" />
      <p className="text-lg font-semibold text-ink">{title}</p>
      <p className="max-w-md text-sm text-ink-soft">
        {message ?? "Không kết nối được máy chủ. Vui lòng thử lại sau ít phút."}
      </p>
      {action}
    </div>
  );
}
