"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { homePathForRole } from "@/lib/auth/roles";
import { Spinner } from "@/components/ui/Spinner";
import { LinkButton } from "@/components/ui/Button";
import type { Role } from "@/types/domain";

/**
 * Guard phía client: chưa đăng nhập → /login?next=...; sai vai trò → báo không có quyền.
 * (Backend vẫn kiểm tra quyền ở mọi API — guard chỉ để UX.)
 */
type Props = { roles?: Role[] | null; children: React.ReactNode };

export function RequireAuth(props: Props) {
  return (
    <Suspense fallback={<Spinner label="Đang kiểm tra đăng nhập…" />}>
      <Guard {...props} />
    </Suspense>
  );
}

function Guard({ roles, children }: Props) {
  const { status, user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") {
      const qs = searchParams?.toString();
      const next = `${pathname}${qs ? `?${qs}` : ""}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [status, pathname, searchParams, router]);

  if (status !== "authenticated" || !user) return <Spinner label="Đang kiểm tra đăng nhập…" />;

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-16 text-center">
        <ShieldAlert className="size-12 text-danger" aria-hidden="true" />
        <h1 className="text-2xl font-bold">Bạn không có quyền truy cập trang này</h1>
        <p className="text-ink-soft">Trang này dành cho vai trò khác. Hãy quay lại khu vực của bạn.</p>
        <LinkButton href={homePathForRole(user.role)}>Về trang của tôi</LinkButton>
      </div>
    );
  }
  return <>{children}</>;
}
