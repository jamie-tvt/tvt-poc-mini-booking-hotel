"use client";

import { AreaShell } from "@/components/layout/AreaShell";
import { RequireAuth } from "@/components/shared/RequireAuth";
import { ADMIN_NAV } from "@/lib/config/navigation";

/** /admin: chỉ ADMIN. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth roles={["ADMIN"]}>
      <AreaShell title="Quản trị" subtitle="Mekong Stay Admin" nav={ADMIN_NAV}>
        {children}
      </AreaShell>
    </RequireAuth>
  );
}
