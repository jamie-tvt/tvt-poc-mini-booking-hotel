"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { NOTIFICATION_POLL_MS } from "@/lib/config/env";
import { NOTIFICATIONS_CHANGED_EVENT, notificationService } from "../services/notificationService";

/** Chuông thông báo: poll số chưa đọc mỗi 30 giây khi đang đăng nhập và tab đang hiển thị. */
export function NotificationBell() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (document.visibilityState === "hidden") return;
    try {
      const res = await notificationService.unreadCount();
      setCount(res?.count ?? 0);
    } catch {
      /* giữ số cũ khi lỗi mạng */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(refresh, NOTIFICATION_POLL_MS);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refresh]);

  const label = count > 0 ? `Thông báo, ${count} chưa đọc` : "Thông báo";
  return (
    <Link
      href="/notifications"
      aria-label={label}
      className="relative inline-flex size-11 items-center justify-center rounded-lg text-ink transition-colors duration-200 hover:bg-brand-soft"
    >
      <Bell className="size-5" aria-hidden="true" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-1 top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-cta px-1 text-[11px] font-bold leading-5 text-white"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
