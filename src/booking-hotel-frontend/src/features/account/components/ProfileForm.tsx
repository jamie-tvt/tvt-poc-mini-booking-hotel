"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { authService } from "@/features/auth/services/authService";
import { profileSchema } from "@/features/auth/validators/authSchemas";
import { useApiQuery, useMutation } from "@/lib/api/hooks";
import { useAuth } from "@/lib/auth/AuthProvider";
import { formatDate } from "@/lib/utils/format";
import { ROLE_LABEL } from "@/lib/utils/labels";
import { zodFieldErrors } from "@/lib/utils/validation";

export function ProfileForm() {
  const { updateUser } = useAuth();
  const q = useApiQuery("me", authService.me);
  const m = useMutation(authService.updateMe);
  const [form, setForm] = useState({ fullName: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (q.data) setForm({ fullName: q.data.fullName ?? "", phone: q.data.phone ?? "" });
  }, [q.data]);

  if (q.loading) return <Spinner />;
  if (q.error || !q.data) return <ErrorState message={q.error?.message} />;
  const me = q.data;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    const user = await m.run(parsed.data);
    if (user) {
      updateUser(user);
      q.setData(user);
      setSaved(true);
    }
  }

  const fe = { ...m.fieldErrors, ...errors };
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <h2 className="text-lg font-bold">Thông tin cá nhân</h2>
        <form onSubmit={onSubmit} noValidate className="mt-4 flex flex-col gap-4">
          <TextField id="acc-email" label="Email" value={me.email} disabled hint="Email dùng để đăng nhập, không đổi được." />
          <TextField id="acc-name" label="Họ và tên" value={form.fullName} onChange={set("fullName")} error={fe.fullName} required autoComplete="name" />
          <TextField id="acc-phone" label="Số điện thoại" type="tel" value={form.phone} onChange={set("phone")} error={fe.phone} autoComplete="tel" />
          {saved && <Alert tone="success">Đã lưu thông tin tài khoản.</Alert>}
          {m.error && !m.error.errors.length && <Alert tone="error">{m.error.message}</Alert>}
          <Button type="submit" loading={m.pending} className="self-start">
            <Save className="size-4" aria-hidden="true" /> Lưu thay đổi
          </Button>
        </form>
      </Card>
      <Card className="h-fit">
        <h2 className="text-lg font-bold">Tài khoản</h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-ink-soft">Vai trò</dt>
          <dd className="text-right font-semibold">{ROLE_LABEL[me.role]}</dd>
          {me.hotelName && (
            <>
              <dt className="text-ink-soft">Khách sạn</dt>
              <dd className="text-right font-semibold">{me.hotelName}</dd>
            </>
          )}
          <dt className="text-ink-soft">Ngày tạo</dt>
          <dd className="text-right">{formatDate(me.createdAt)}</dd>
          <dt className="text-ink-soft">Trạng thái</dt>
          <dd className="text-right">{me.active ? "Đang hoạt động" : "Đã khoá"}</dd>
        </dl>
      </Card>
    </div>
  );
}
