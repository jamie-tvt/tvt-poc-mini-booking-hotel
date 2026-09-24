import type { AuthTokens } from "@/types/domain";
import { PUBLIC_API_URL } from "@/lib/config/env";
import { browserSessionStore, sessionFromTokens, type SessionStore } from "@/lib/auth/session";
import { ApiError } from "./errors";
import { rawRequest, type RequestOptions } from "./http";

/** Mã lỗi 401 cho phép thử refresh token. */
const REFRESHABLE_CODES = new Set(["TOKEN_EXPIRED", "UNAUTHORIZED"]);

export const SESSION_EXPIRED_MESSAGE = "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.";

export interface ApiClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  session?: SessionStore;
  /** Gọi khi refresh thất bại (mặc định: chuyển về /login?next=...). */
  onAuthFailure?: () => void;
}

export type ApiClient = ReturnType<typeof createApiClient>;

export function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  if (pathname.startsWith("/login")) return;
  window.location.assign(`/login?next=${encodeURIComponent(pathname + search)}`);
}

/**
 * API client cho trình duyệt:
 * - gắn Bearer token từ phiên đăng nhập;
 * - nhận 401 TOKEN_EXPIRED → refresh MỘT lần (khoá chống gọi refresh song song) rồi gọi lại;
 * - refresh hỏng → xoá phiên và chuyển tới trang đăng nhập
 *   (trừ `auth: "optional"`: gọi lại không token để khách vãng lai không bị gián đoạn).
 */
export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? PUBLIC_API_URL;
  const session = options.session ?? browserSessionStore;
  const onAuthFailure = options.onAuthFailure ?? redirectToLogin;
  let refreshInFlight: Promise<string | null> | null = null;

  function refreshAccessToken(): Promise<string | null> {
    if (refreshInFlight) return refreshInFlight;
    const current = session.get();
    if (!current?.refreshToken) return Promise.resolve(null);

    refreshInFlight = rawRequest<AuthTokens>(
      "/auth/refresh",
      { method: "POST", body: { refreshToken: current.refreshToken } },
      { baseUrl, fetchImpl: options.fetchImpl },
    )
      .then((tokens) => {
        session.set(sessionFromTokens(tokens));
        return tokens.accessToken;
      })
      .catch((e: unknown) => {
        // Lỗi mạng: giữ phiên, báo lỗi mạng cho lời gọi gốc.
        if (e instanceof ApiError && e.status === 0) throw e;
        return null;
      })
      .finally(() => {
        refreshInFlight = null;
      });
    return refreshInFlight;
  }

  async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const useAuth = opts.auth !== false;
    const token = useAuth ? (session.get()?.accessToken ?? null) : null;
    try {
      return await rawRequest<T>(path, opts, { baseUrl, fetchImpl: options.fetchImpl, accessToken: token });
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 401 || !token || !REFRESHABLE_CODES.has(e.code)) throw e;

      // Lời gọi khác đã refresh xong trong lúc chờ → dùng luôn token mới.
      const latest = session.get()?.accessToken;
      const newToken = latest && latest !== token ? latest : await refreshAccessToken();
      if (!newToken) {
        session.clear();
        if (opts.auth === "optional") {
          return rawRequest<T>(path, opts, { baseUrl, fetchImpl: options.fetchImpl, accessToken: null });
        }
        onAuthFailure();
        throw new ApiError(401, "SESSION_EXPIRED", SESSION_EXPIRED_MESSAGE);
      }
      return rawRequest<T>(path, opts, { baseUrl, fetchImpl: options.fetchImpl, accessToken: newToken });
    }
  }

  return {
    request,
    get: <T>(path: string, query?: RequestOptions["query"], opts?: Omit<RequestOptions, "method" | "query">) =>
      request<T>(path, { ...opts, method: "GET", query }),
    post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
      request<T>(path, { ...opts, method: "POST", body: body ?? {} }),
    put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
      request<T>(path, { ...opts, method: "PUT", body: body ?? {} }),
    del: <T>(path: string, opts?: Omit<RequestOptions, "method">) => request<T>(path, { ...opts, method: "DELETE" }),
  };
}

/** Instance dùng chung trong các Client Component. */
export const api = createApiClient();
