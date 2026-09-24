"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { AuthTokens, UserDto } from "@/types/domain";
import { api } from "@/lib/api/client";
import { browserSessionStore, sessionFromTokens, subscribeSession, type AuthSession } from "./session";

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: AuthStatus;
  user: UserDto | null;
  session: AuthSession | null;
  login: (email: string, password: string) => Promise<UserDto>;
  logout: () => Promise<void>;
  updateUser: (user: UserDto) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const getServerSnapshot = () => null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const session = useSyncExternalStore(subscribeSession, browserSessionStore.get, getServerSnapshot);
  // Tránh lệch hydrate: lần render đầu luôn là "loading".
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await api.post<AuthTokens>("/auth/login", { email, password }, { auth: false });
    browserSessionStore.set(sessionFromTokens(tokens));
    return tokens.user;
  }, []);

  const logout = useCallback(async () => {
    const current = browserSessionStore.get();
    browserSessionStore.clear();
    if (current?.refreshToken) {
      try {
        await api.post<null>("/auth/logout", { refreshToken: current.refreshToken }, { auth: false });
      } catch {
        /* phiên phía máy chủ sẽ tự hết hạn */
      }
    }
  }, []);

  const updateUser = useCallback((user: UserDto) => {
    const current = browserSessionStore.get();
    if (current) browserSessionStore.set({ ...current, user });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: !mounted ? "loading" : session ? "authenticated" : "anonymous",
      user: mounted ? (session?.user ?? null) : null,
      session: mounted ? session : null,
      login,
      logout,
      updateUser,
    }),
    [mounted, session, login, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải nằm trong <AuthProvider>");
  return ctx;
}
