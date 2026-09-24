"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { allowedRolesForPath } from "@/lib/auth/roles";

/** Khu vực cần đăng nhập: /my-bookings (CUSTOMER), /account, /notifications (mọi vai trò). */
export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <RequireAuth roles={allowedRolesForPath(pathname)}>{children}</RequireAuth>
      </div>
      <SiteFooter />
    </>
  );
}
