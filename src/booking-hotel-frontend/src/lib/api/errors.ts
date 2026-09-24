import type { ApiFieldError } from "@/types/api";

export const NETWORK_ERROR_MESSAGE =
  "Không kết nối được máy chủ. Vui lòng kiểm tra kết nối hoặc thử lại sau ít phút.";

/** Lỗi thống nhất cho mọi lời gọi API — luôn có `code` và `message` tiếng Việt từ backend. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly errors: ApiFieldError[];
  readonly requestId?: string;

  constructor(status: number, code: string, message: string, errors?: ApiFieldError[] | null, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.errors = errors ?? [];
    this.requestId = requestId;
  }

  /** { field: message } để hiển thị dưới từng ô nhập. */
  get fieldErrors(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const e of this.errors) if (e.field && !map[e.field]) map[e.field] = e.message;
    return map;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

/** Thông điệp hiển thị được cho mọi loại lỗi. */
export function errorMessage(e: unknown, fallback = "Đã có lỗi xảy ra, vui lòng thử lại."): string {
  if (e instanceof ApiError) return e.message || fallback;
  return fallback;
}
