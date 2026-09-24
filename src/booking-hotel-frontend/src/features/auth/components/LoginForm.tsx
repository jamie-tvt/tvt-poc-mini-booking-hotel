"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { LogIn } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { useAuth } from "@/lib/auth/AuthProvider";
import { homePathForRole } from "@/lib/auth/roles";
import { ApiError, errorMessage } from "@/lib/api/errors";
import { safeNextPath } from "@/lib/utils/query";
import { zodFieldErrors } from "@/lib/utils/validation";
import { loginSchema } from "../validators/authSchemas";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, DemoAccounts } from "./DemoAccounts";

export function LoginForm({ next, registered, demo }: { next?: string; registered?: boolean; demo?: string }) {
  const { login } = useAuth();
  const router = useRouter();
  const demoAccount = DEMO_ACCOUNTS.find((a) => a.email === demo);
  const [email, setEmail] = useState(demoAccount?.email ?? "");
  const [password, setPassword] = useState(demoAccount ? DEMO_PASSWORD : "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setError(null);
    setPending(true);
    try {
      const user = await login(parsed.data.email, parsed.data.password);
      router.replace(safeNextPath(next, homePathForRole(user.role)));
    } catch (err) {
      if (err instanceof ApiError && err.errors.length) setFieldErrors(err.fieldErrors);
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start">
      <div className="rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Đăng nhập</h1>
        <p className="mt-1 text-ink-soft">Đăng nhập để xem đơn của bạn, quản lý khách sạn hoặc vào trang quản trị. Đặt phòng không bắt buộc tài khoản.</p>
        {registered && (
          <Alert tone="success" className="mt-4" title="Đăng ký thành công">
            Vui lòng đăng nhập bằng email và mật khẩu vừa tạo.
          </Alert>
        )}
        {next && !registered && (
          <Alert tone="info" className="mt-4">
            Bạn cần đăng nhập để tiếp tục.
          </Alert>
        )}
        {error && (
          <Alert tone="error" className="mt-4">
            {error}
          </Alert>
        )}
        <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
          <TextField
            id="login-email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            required
          />
          <TextField
            id="login-password"
            label="Mật khẩu"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            required
          />
          <Button ref={submitRef} type="submit" size="lg" loading={pending}>
            <LogIn className="size-5" aria-hidden="true" /> Đăng nhập
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-ink-soft">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-semibold text-brand underline-offset-4 hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </div>
      <DemoAccounts
        onPick={(em, pw) => {
          setEmail(em);
          setPassword(pw);
          setFieldErrors({});
          setError(null);
          submitRef.current?.focus();
        }}
      />
    </div>
  );
}
