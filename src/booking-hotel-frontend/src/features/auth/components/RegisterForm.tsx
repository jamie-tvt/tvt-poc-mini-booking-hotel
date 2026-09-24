"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { ApiError, errorMessage } from "@/lib/api/errors";
import { zodFieldErrors } from "@/lib/utils/validation";
import { registerSchema, type RegisterInput } from "../validators/authSchemas";
import { authService } from "../services/authService";
import { DemoAccounts } from "./DemoAccounts";

const EMPTY: RegisterInput = { fullName: "", email: "", password: "", confirmPassword: "", phone: "" };

/** UC-AUTH-01: đăng ký xong chuyển sang trang đăng nhập (không tự đăng nhập). */
export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterInput>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const set = (k: keyof RegisterInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setError(null);
    setPending(true);
    try {
      await authService.register(parsed.data);
      router.push("/login?registered=1");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors.length) setFieldErrors(err.fieldErrors);
        if (err.code === "EMAIL_EXISTS") setFieldErrors({ email: err.message });
      }
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start">
    <div className="rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Tạo tài khoản</h1>
      <p className="mt-1 text-ink-soft">Tạo tài khoản khách hàng để lưu các đơn đặt phòng và nhận thông báo. Chủ khách sạn dùng tài khoản do quản trị viên cấp.</p>
      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}
      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <TextField id="reg-name" label="Họ và tên" autoComplete="name" value={form.fullName} onChange={set("fullName")} error={fieldErrors.fullName} required />
        <TextField id="reg-email" label="Email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={fieldErrors.email} required />
        <TextField
          id="reg-phone"
          label="Số điện thoại"
          type="tel"
          autoComplete="tel"
          hint="Không bắt buộc"
          value={form.phone ?? ""}
          onChange={set("phone")}
          error={fieldErrors.phone}
        />
        <TextField
          id="reg-password"
          label="Mật khẩu"
          type="password"
          autoComplete="new-password"
          hint="Tối thiểu 8 ký tự"
          value={form.password}
          onChange={set("password")}
          error={fieldErrors.password}
          required
        />
        <TextField
          id="reg-confirm"
          label="Nhập lại mật khẩu"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={set("confirmPassword")}
          error={fieldErrors.confirmPassword}
          required
        />
        <Button type="submit" size="lg" loading={pending}>
          <UserPlus className="size-5" aria-hidden="true" /> Đăng ký
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-semibold text-brand underline-offset-4 hover:underline">
          Đăng nhập
        </Link>
      </p>
    </div>
    <DemoAccounts onPick={(em) => router.push(`/login?demo=${encodeURIComponent(em)}`)} />
    </div>
  );
}
