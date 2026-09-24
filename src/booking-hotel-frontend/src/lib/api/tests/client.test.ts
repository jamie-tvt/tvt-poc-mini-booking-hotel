import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession, SessionStore } from "@/lib/auth/session";
import type { UserDto } from "@/types/domain";
import { createApiClient, SESSION_EXPIRED_MESSAGE } from "../client";
import { ApiError } from "../errors";

const BASE = "http://api.test/api/v1";

const user: UserDto = {
  id: 1,
  fullName: "Nguyễn Văn Hào",
  email: "customer@example.com",
  role: "CUSTOMER",
  active: true,
  createdAt: "2026-09-01T00:00:00Z",
};

function envelope(status: number, code: string, data: unknown, message = "OK", errors: unknown = null) {
  return new Response(
    JSON.stringify({ success: status < 400, status, code, message, requestId: "req-1", timestamp: "2026-09-23T00:00:00Z", data, errors }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

function memoryStore(initial: AuthSession | null): SessionStore & { current: AuthSession | null } {
  const store = {
    current: initial,
    get: () => store.current,
    set: (s: AuthSession) => {
      store.current = s;
    },
    clear: () => {
      store.current = null;
    },
  };
  return store;
}

function authHeader(init: RequestInit | undefined): string | undefined {
  return (init?.headers as Record<string, string> | undefined)?.Authorization;
}

describe("api client", () => {
  let store: ReturnType<typeof memoryStore>;
  let onAuthFailure: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = memoryStore({ accessToken: "access-1", refreshToken: "refresh-1", user });
    onAuthFailure = vi.fn();
  });

  it("bóc ApiResponse.data, gắn Bearer token và query string", async () => {
    const fetchImpl = vi.fn(async () => envelope(200, "SUCCESS", { content: [{ id: 1 }], page: 0 }));
    const api = createApiClient({ baseUrl: BASE, fetchImpl: fetchImpl as unknown as typeof fetch, session: store, onAuthFailure });

    const data = await api.get<{ content: { id: number }[] }>("/hotels/search", { city: "Cần Thơ", stars: "", page: 0 });

    expect(data.content[0]?.id).toBe(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${BASE}/hotels/search?city=C%E1%BA%A7n+Th%C6%A1&page=0`);
    expect(authHeader(init)).toBe("Bearer access-1");
  });

  it("gửi body JSON và không gắn token khi auth=false", async () => {
    const fetchImpl = vi.fn(async () => envelope(201, "SUCCESS", { id: 9 }));
    const api = createApiClient({ baseUrl: BASE, fetchImpl: fetchImpl as unknown as typeof fetch, session: store, onAuthFailure });

    await api.post("/auth/register", { email: "a@b.vn" }, { auth: false });

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ email: "a@b.vn" }));
    expect(authHeader(init)).toBeUndefined();
  });

  it("ném ApiError có code, message tiếng Việt và lỗi theo field", async () => {
    const fetchImpl = vi.fn(async () =>
      envelope(400, "VALIDATION_FAILED", null, "Dữ liệu không hợp lệ", [
        { field: "email", message: "Email đã được sử dụng" },
        { field: "password", message: "Mật khẩu tối thiểu 8 ký tự" },
      ]),
    );
    const api = createApiClient({ baseUrl: BASE, fetchImpl: fetchImpl as unknown as typeof fetch, session: store, onAuthFailure });

    const err = await api.post("/auth/register", {}).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    const e = err as ApiError;
    expect(e.status).toBe(400);
    expect(e.code).toBe("VALIDATION_FAILED");
    expect(e.message).toBe("Dữ liệu không hợp lệ");
    expect(e.fieldErrors).toEqual({ email: "Email đã được sử dụng", password: "Mật khẩu tối thiểu 8 ký tự" });
  });

  it("ném 409 ROOM_UNAVAILABLE nguyên mã lỗi và message", async () => {
    const fetchImpl = vi.fn(async () => envelope(409, "ROOM_UNAVAILABLE", null, "Loại phòng đã hết phòng trong khoảng ngày này"));
    const api = createApiClient({ baseUrl: BASE, fetchImpl: fetchImpl as unknown as typeof fetch, session: store, onAuthFailure });

    await expect(api.post("/bookings", { roomTypeId: 1 })).rejects.toMatchObject({
      status: 409,
      code: "ROOM_UNAVAILABLE",
      message: "Loại phòng đã hết phòng trong khoảng ngày này",
    });
  });

  it('auth "optional": refresh hỏng thì xoá phiên và gọi lại KHÔNG token, không chuyển /login', async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/auth/refresh")) return envelope(401, "INVALID_REFRESH_TOKEN", null, "Refresh token không hợp lệ");
      return authHeader(init) ? envelope(401, "TOKEN_EXPIRED", null, "Hết hạn") : envelope(201, "SUCCESS", { bookingCode: "HB-7K3F9Q" });
    });
    const api = createApiClient({ baseUrl: BASE, fetchImpl: fetchImpl as unknown as typeof fetch, session: store, onAuthFailure });

    const data = await api.post<{ bookingCode: string }>("/bookings", { roomTypeId: 1 }, { auth: "optional" });

    expect(data.bookingCode).toBe("HB-7K3F9Q");
    expect(store.current).toBeNull();
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it('auth "optional" khi chưa đăng nhập: gọi thẳng không token', async () => {
    store.clear();
    const fetchImpl = vi.fn(async () => envelope(201, "SUCCESS", { id: 1 }));
    const api = createApiClient({ baseUrl: BASE, fetchImpl: fetchImpl as unknown as typeof fetch, session: store, onAuthFailure });

    await api.post("/bookings", {}, { auth: "optional" });

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(authHeader(init)).toBeUndefined();
  });

  it("lỗi mạng thành ApiError NETWORK_ERROR", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const api = createApiClient({ baseUrl: BASE, fetchImpl: fetchImpl as unknown as typeof fetch, session: store, onAuthFailure });

    await expect(api.get("/cities")).rejects.toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });

  it("401 TOKEN_EXPIRED → refresh token rồi gọi lại với token mới", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/auth/refresh")) {
        expect(JSON.parse(String(init?.body))).toEqual({ refreshToken: "refresh-1" });
        return envelope(200, "SUCCESS", { accessToken: "access-2", refreshToken: "refresh-2", expiresIn: 900, user });
      }
      return authHeader(init) === "Bearer access-2"
        ? envelope(200, "SUCCESS", { count: 3 })
        : envelope(401, "TOKEN_EXPIRED", null, "Phiên đăng nhập đã hết hạn");
    });
    const api = createApiClient({ baseUrl: BASE, fetchImpl: fetchImpl as unknown as typeof fetch, session: store, onAuthFailure });

    const data = await api.get<{ count: number }>("/notifications/unread-count");

    expect(data.count).toBe(3);
    expect(fetchImpl).toHaveBeenCalledTimes(3); // gọi gốc → refresh → gọi lại
    expect(store.current?.accessToken).toBe("access-2");
    expect(store.current?.refreshToken).toBe("refresh-2");
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it("nhiều request 401 cùng lúc chỉ refresh MỘT lần (khoá chống gọi song song)", async () => {
    let refreshCalls = 0;
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/auth/refresh")) {
        refreshCalls++;
        await new Promise((r) => setTimeout(r, 10));
        return envelope(200, "SUCCESS", { accessToken: "access-2", refreshToken: "refresh-2", expiresIn: 900, user });
      }
      return authHeader(init) === "Bearer access-2" ? envelope(200, "SUCCESS", url) : envelope(401, "TOKEN_EXPIRED", null, "Hết hạn");
    });
    const api = createApiClient({ baseUrl: BASE, fetchImpl: fetchImpl as unknown as typeof fetch, session: store, onAuthFailure });

    const results = await Promise.all([api.get("/a"), api.get("/b"), api.get("/c")]);

    expect(refreshCalls).toBe(1);
    expect(results).toEqual([`${BASE}/a`, `${BASE}/b`, `${BASE}/c`]);
  });

  it("chỉ thử refresh một lần: request gọi lại vẫn 401 thì ném lỗi, không lặp vô hạn", async () => {
    let refreshCalls = 0;
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith("/auth/refresh")) {
        refreshCalls++;
        return envelope(200, "SUCCESS", { accessToken: `access-${refreshCalls + 1}`, refreshToken: "r", expiresIn: 900, user });
      }
      return envelope(401, "TOKEN_EXPIRED", null, "Hết hạn");
    });
    const api = createApiClient({ baseUrl: BASE, fetchImpl: fetchImpl as unknown as typeof fetch, session: store, onAuthFailure });

    await expect(api.get("/users/me")).rejects.toMatchObject({ status: 401 });
    expect(refreshCalls).toBe(1);
  });

  it("refresh thất bại → xoá phiên, gọi onAuthFailure (chuyển /login) và ném SESSION_EXPIRED", async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      url.endsWith("/auth/refresh")
        ? envelope(401, "INVALID_REFRESH_TOKEN", null, "Refresh token không hợp lệ")
        : envelope(401, "TOKEN_EXPIRED", null, "Hết hạn"),
    );
    const api = createApiClient({ baseUrl: BASE, fetchImpl: fetchImpl as unknown as typeof fetch, session: store, onAuthFailure });

    await expect(api.get("/users/me")).rejects.toMatchObject({ code: "SESSION_EXPIRED", message: SESSION_EXPIRED_MESSAGE });
    expect(store.current).toBeNull();
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });

  it("401 INVALID_CREDENTIALS khi đăng nhập không kích hoạt refresh", async () => {
    store.clear();
    const fetchImpl = vi.fn(async () => envelope(401, "INVALID_CREDENTIALS", null, "Email hoặc mật khẩu không đúng"));
    const api = createApiClient({ baseUrl: BASE, fetchImpl: fetchImpl as unknown as typeof fetch, session: store, onAuthFailure });

    await expect(api.post("/auth/login", {}, { auth: false })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
      message: "Email hoặc mật khẩu không đúng",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it("403 ACCESS_DENIED không refresh, giữ phiên", async () => {
    const fetchImpl = vi.fn(async () => envelope(403, "ACCESS_DENIED", null, "Bạn không có quyền"));
    const api = createApiClient({ baseUrl: BASE, fetchImpl: fetchImpl as unknown as typeof fetch, session: store, onAuthFailure });

    await expect(api.get("/admin/users")).rejects.toMatchObject({ status: 403, code: "ACCESS_DENIED" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(store.current).not.toBeNull();
  });

  it("response không phải JSON (VD proxy 502) vẫn ra ApiError thân thiện", async () => {
    const fetchImpl = vi.fn(async () => new Response("<html>Bad gateway</html>", { status: 502 }));
    const api = createApiClient({ baseUrl: BASE, fetchImpl: fetchImpl as unknown as typeof fetch, session: store, onAuthFailure });

    await expect(api.get("/cities")).rejects.toMatchObject({ status: 502, code: "INTERNAL_ERROR" });
  });
});
