"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ROLE_LABEL } from "@/lib/utils/labels";
import type { UserDto } from "@/types/domain";

const itemCls =
  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink transition-colors duration-150 hover:bg-brand-soft";

export function UserMenu({ user }: { user: UserDto }) {
  const { logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    await logout();
    router.push("/login");
  }

  const initial = user.fullName.trim().split(/\s+/).pop()?.charAt(0).toUpperCase() ?? "?";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Tài khoản ${user.fullName}`}
        className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-ink transition-colors duration-200 hover:bg-brand-soft"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white" aria-hidden="true">
          {initial}
        </span>
        <span className="hidden max-w-36 truncate lg:inline">{user.fullName}</span>
        <ChevronDown className="size-4" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={menuId}
          className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-line bg-white p-2 shadow-pop"
        >
          <div className="border-b border-line px-3 pb-2 pt-1">
            <p className="truncate font-semibold text-ink">{user.fullName}</p>
            <p className="truncate text-xs text-ink-soft">{user.email}</p>
            <p className="mt-0.5 text-xs font-medium text-brand">{ROLE_LABEL[user.role]}</p>
          </div>
          <ul className="pt-1">
            <li>
              <Link href="/account" className={itemCls} onClick={() => setOpen(false)}>
                <UserRound className="size-4" aria-hidden="true" /> Tài khoản của tôi
              </Link>
            </li>
            <li>
              <button type="button" className={itemCls} onClick={handleLogout}>
                <LogOut className="size-4" aria-hidden="true" /> Đăng xuất
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
