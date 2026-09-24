import type { ApiResponse, Query } from "@/types/api";
import { toQueryString } from "@/lib/utils/query";
import { ApiError, NETWORK_ERROR_MESSAGE } from "./errors";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface RequestOptions {
  method?: HttpMethod;
  query?: Query;
  body?: unknown;
  headers?: Record<string, string>;
  /**
   * true (mặc định): gắn access token, refresh khi hết hạn, refresh hỏng → về /login.
   * "optional": gắn token nếu có (VD đặt phòng khách vãng lai); refresh hỏng → xoá phiên và gọi lại KHÔNG token.
   * false: không gắn token (login/register, API công khai theo mã đơn).
   */
  auth?: boolean | "optional";
  signal?: AbortSignal;
  cache?: RequestCache;
}

export interface RawRequestConfig {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  accessToken?: string | null;
}

function isApiResponse(v: unknown): v is ApiResponse<unknown> {
  return typeof v === "object" && v !== null && "success" in v && "code" in v;
}

/**
 * Gọi 1 endpoint, bóc `ApiResponse.data`. Mọi lỗi (HTTP, mạng, JSON hỏng) đều thành ApiError.
 * Không tự refresh token — việc đó do api client phía trình duyệt đảm nhận.
 */
export async function rawRequest<T>(path: string, options: RequestOptions, config: RawRequestConfig): Promise<T> {
  const url = `${config.baseUrl.replace(/\/$/, "")}${path}${toQueryString(options.query)}`;
  const headers: Record<string, string> = { Accept: "application/json", ...options.headers };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (config.accessToken) headers.Authorization = `Bearer ${config.accessToken}`;

  const doFetch = config.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await doFetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
      cache: options.cache,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(0, "NETWORK_ERROR", NETWORK_ERROR_MESSAGE);
  }

  if (res.status === 204) return null as T;

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (isApiResponse(payload)) {
    if (!res.ok || payload.success === false) {
      throw new ApiError(
        payload.status || res.status,
        payload.code || "HTTP_ERROR",
        payload.message || defaultMessage(res.status),
        payload.errors,
        payload.requestId,
      );
    }
    return (payload.data ?? null) as T;
  }

  if (!res.ok) throw new ApiError(res.status, httpCode(res.status), defaultMessage(res.status));
  // Response 2xx nhưng không theo ApiResponse — trả nguyên văn.
  return (payload ?? null) as T;
}

function httpCode(status: number): string {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "ACCESS_DENIED";
  if (status === 404) return "NOT_FOUND";
  return status >= 500 ? "INTERNAL_ERROR" : "HTTP_ERROR";
}

function defaultMessage(status: number): string {
  if (status === 401) return "Bạn cần đăng nhập để tiếp tục.";
  if (status === 403) return "Bạn không có quyền thực hiện thao tác này.";
  if (status === 404) return "Không tìm thấy dữ liệu yêu cầu.";
  if (status >= 500) return "Máy chủ đang gặp sự cố, vui lòng thử lại sau.";
  return "Yêu cầu không hợp lệ.";
}
