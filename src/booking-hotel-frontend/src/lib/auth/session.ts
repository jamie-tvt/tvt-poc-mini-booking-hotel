import { AUTH_STORAGE_KEY } from "@/lib/config/env";
import type { AuthTokens, UserDto } from "@/types/domain";

/** Dữ liệu phiên lưu ở localStorage key `hb.auth`. */
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

export interface SessionStore {
  get(): AuthSession | null;
  set(session: AuthSession): void;
  clear(): void;
}

const CHANGE_EVENT = "hb:auth-changed";
let cachedRaw: string | null | undefined;
let cachedSession: AuthSession | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(AUTH_STORAGE_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): AuthSession | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<AuthSession>;
    if (typeof v.accessToken === "string" && typeof v.refreshToken === "string" && v.user) return v as AuthSession;
  } catch {
    /* dữ liệu hỏng → coi như chưa đăng nhập */
  }
  return null;
}

/** Store mặc định dùng localStorage, có cache để useSyncExternalStore trả cùng object. */
export const browserSessionStore: SessionStore = {
  get() {
    if (typeof window === "undefined") return null;
    const raw = readRaw();
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedSession = parse(raw);
    }
    return cachedSession;
  },
  set(session) {
    try {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } catch {
      /* private mode: bỏ qua */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  },
  clear() {
    try {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      /* bỏ qua */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  },
};

export function sessionFromTokens(tokens: AuthTokens): AuthSession {
  return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user: tokens.user };
}

/** Đăng ký nghe thay đổi phiên (cùng tab + tab khác). */
export function subscribeSession(callback: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === AUTH_STORAGE_KEY) callback();
  };
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}
