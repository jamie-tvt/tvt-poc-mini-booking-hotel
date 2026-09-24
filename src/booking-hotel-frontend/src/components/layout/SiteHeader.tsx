"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Hotel, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { APP_NAME } from "@/lib/config/env";
import { headerNav, isActivePath } from "@/lib/config/navigation";
import { cn } from "@/lib/utils/cn";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { buttonClasses } from "@/components/ui/Button";
import { UserMenu } from "./UserMenu";

export function SiteHeader() {
  const { status, user } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = headerNav(user?.role ?? null);

  useEffect(() => setMobileOpen(false), [pathname]);

  const loginHref = pathname && pathname !== "/login" && pathname !== "/register" ? `/login?next=${encodeURIComponent(pathname)}` : "/login";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-brand focus:px-3 focus:py-2 focus:text-white"
      >
        Bỏ qua điều hướng
      </a>
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 rounded-md font-heading text-xl font-bold text-ink-strong">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand text-white">
            <Hotel className="size-5" aria-hidden="true" />
          </span>
          {APP_NAME}
        </Link>

        <nav aria-label="Điều hướng chính" className="ml-6 hidden md:block">
          <ul className="flex items-center gap-1">
            {nav.map((item) => {
              const active = isActivePath(pathname ?? "", item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                      active ? "bg-brand-soft text-brand" : "text-ink hover:bg-brand-soft",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {status === "loading" && <div className="h-9 w-28 animate-pulse rounded-lg bg-brand-soft" aria-hidden="true" />}
          {status === "authenticated" && user && (
            <>
              <NotificationBell />
              <UserMenu user={user} />
            </>
          )}
          {status === "anonymous" && (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href={loginHref} className={buttonClasses("ghost", "sm")}>
                Đăng nhập
              </Link>
              <Link href="/register" className={buttonClasses("primary", "sm")}>
                Đăng ký
              </Link>
            </div>
          )}
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-lg text-ink transition-colors hover:bg-brand-soft md:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav id="mobile-nav" aria-label="Điều hướng di động" className="border-t border-line bg-white px-4 pb-4 md:hidden">
          <ul className="flex flex-col gap-1 pt-2">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActivePath(pathname ?? "", item) ? "page" : undefined}
                  className="block rounded-lg px-3 py-3 text-base font-medium text-ink hover:bg-brand-soft"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {status === "anonymous" && (
              <li className="mt-2 grid grid-cols-2 gap-2">
                <Link href={loginHref} className={buttonClasses("secondary", "md")}>
                  Đăng nhập
                </Link>
                <Link href="/register" className={buttonClasses("primary", "md")}>
                  Đăng ký
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
