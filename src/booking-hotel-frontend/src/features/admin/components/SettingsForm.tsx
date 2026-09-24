"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { useApiQuery, useMutation } from "@/lib/api/hooks";
import { adminService } from "../services/adminService";

/** Tham số nghiệp vụ đã biết (FR-FEE): nhãn tiếng Việt + khoảng hợp lệ. Khoá lạ hiển thị dạng thô. */
const KNOWN: Record<string, { label: string; hint: string; min: number; max: number; unit: string }> = {
  "platform.fee_percent": {
    label: "Phí nền tảng (%)",
    hint: "Cộng vào giá cơ bản của khách sạn để ra giá niêm yết (làm tròn lên bội 1.000 ₫). Chỉ áp dụng cho đơn mới.",
    min: 0,
    max: 50,
    unit: "%",
  },
  "booking.payment_timeout_minutes": {
    label: "Thời gian giữ phòng (phút)",
    hint: "Đơn chưa thanh toán sau thời gian này sẽ hết hạn và trả lại tồn phòng.",
    min: 5,
    max: 120,
    unit: "phút",
  },
};

export function SettingsForm() {
  const q = useApiQuery("settings", adminService.settings);
  const m = useMutation(adminService.saveSettings);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (q.data) setValues(Object.fromEntries(q.data.map((s) => [s.key, s.value])));
  }, [q.data]);

  if (q.loading && !q.data) return <Spinner />;
  if (q.error || !q.data) return <ErrorState message={q.error?.message} />;
  const settings = [...q.data].sort((a, b) => Number(!KNOWN[a.key]) - Number(!KNOWN[b.key]));
  const changed = settings.filter((s) => values[s.key] !== undefined && values[s.key] !== s.value);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const errs: Record<string, string> = {};
    for (const s of changed) {
      const meta = KNOWN[s.key];
      const v = Number(values[s.key]);
      if (meta && (!Number.isFinite(v) || v < meta.min || v > meta.max)) errs[s.key] = `Giá trị từ ${meta.min} đến ${meta.max} ${meta.unit}.`;
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const res = await m.run(changed.map((s) => ({ key: s.key, value: (values[s.key] ?? s.value).trim() })));
    if (res !== undefined) {
      setSaved(true);
      void q.reload();
    }
  }

  return (
    <div>
      <PageHeader title="Cài đặt hệ thống" description="Phí nền tảng và thời gian giữ phòng chờ thanh toán." />
      <Card className="max-w-2xl">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          {settings.map((s) => {
            const meta = KNOWN[s.key];
            return (
              <TextField
                key={s.key}
                id={`setting-${s.key.replace(/\W+/g, "-")}`}
                label={meta?.label ?? s.key}
                hint={meta?.hint ?? s.description}
                type={meta ? "number" : "text"}
                inputMode={meta ? "decimal" : undefined}
                min={meta?.min}
                max={meta?.max}
                value={values[s.key] ?? ""}
                onChange={(e) => {
                  setSaved(false);
                  setValues((v) => ({ ...v, [s.key]: e.target.value }));
                }}
                error={errors[s.key] ?? m.fieldErrors[s.key]}
                className={meta ? undefined : "font-mono"}
              />
            );
          })}
          {saved && <Alert tone="success">Đã lưu cài đặt. Giá niêm yết mới áp dụng cho các lượt tìm và đơn tiếp theo.</Alert>}
          {m.error && <Alert tone="error">{m.error.message}</Alert>}
          <Button type="submit" loading={m.pending} disabled={changed.length === 0} className="self-start">
            <Save className="size-4" aria-hidden="true" /> Lưu cài đặt{changed.length ? ` (${changed.length})` : ""}
          </Button>
        </form>
      </Card>
    </div>
  );
}
