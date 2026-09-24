import type { Query } from "@/types/api";
import { getInternalApiUrl } from "@/lib/config/env";
import { rawRequest } from "./http";

/**
 * GET từ Server Component (trang công khai). Luôn `no-store` để dữ liệu chỗ trống luôn mới.
 * Ném ApiError nếu backend lỗi/không chạy — trang tự hiển thị trạng thái lỗi thân thiện.
 */
export function serverGet<T>(path: string, query?: Query): Promise<T> {
  return rawRequest<T>(path, { method: "GET", query, cache: "no-store" }, { baseUrl: getInternalApiUrl() });
}
