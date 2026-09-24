"use client";

import { usePathname } from "next/navigation";
import { AreaShell } from "@/components/layout/AreaShell";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { useAuth } from "@/lib/auth/AuthProvider";
import { allowedRolesForPath } from "@/lib/auth/roles";
import { portalNav } from "@/lib/config/navigation";
import { HotelSwitcher, PortalHotelProvider } from "../context/PortalHotelContext";

/** /portal: HOTEL_OWNER + HOTEL_STAFF; mục chỉ dành cho owner bị ẩn khỏi menu và chặn ở guard. */
export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/portal";
  const { user } = useAuth();
  return (
    <RequireAuth roles={allowedRolesForPath(pathname)}>
      <PortalHotelProvider>
        <AreaShell title="Cổng khách sạn" subtitle={<HotelSwitcher />} nav={portalNav(user?.role ?? null)}>
          {children}
        </AreaShell>
      </PortalHotelProvider>
    </RequireAuth>
  );
}
