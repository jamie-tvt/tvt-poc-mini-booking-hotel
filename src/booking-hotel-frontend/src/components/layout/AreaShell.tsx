"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PanelLeft } from "lucide-react";
import { isActivePath, type NavItem } from "@/lib/config/navigation";
import { cn } from "@/lib/utils/cn";

/**
 * Khung khu vực quản trị (Hotel Portal, Admin Panel): sidebar trên desktop, menu thu gọn trên mobile.
 */
export function AreaShell({
  title,
  subtitle,
  nav,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:px-8">
      <aside className="lg:w-60 lg:shrink-0">
        <div className="flex items-center justify-between gap-3 lg:block">
          <div className="min-w-0">
            <p className="font-heading text-lg font-bold text-ink-strong">{title}</p>
            {subtitle && <div className="text-sm text-ink-soft">{subtitle}</div>}
          </div>
          <button
            type="button"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-line-strong bg-white px-3 text-sm font-medium text-ink lg:hidden"
            aria-expanded={open}
            aria-controls="area-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <PanelLeft className="size-4" aria-hidden="true" /> {open ? "Đóng menu" : "Menu khu vực"}
          </button>
        </div>
        <nav
          id="area-nav"
          aria-label={title}
          className={cn("mt-3 rounded-xl border border-line bg-white p-2 lg:block lg:sticky lg:top-20", open ? "block" : "hidden")}
        >
          <ul className="flex flex-col gap-1">
            {nav.map((item) => {
              const active = isActivePath(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                      active ? "bg-brand text-white" : "text-ink hover:bg-brand-soft",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
