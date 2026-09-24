"use client";

import { useState } from "react";
import { Clock, FlaskConical, RotateCcw, Zap } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { resetServerSkew } from "@/features/booking/services/serverClock";
import { useApiQuery, useMutation } from "@/lib/api/hooks";
import { formatDateTime } from "@/lib/utils/format";
import { adminService } from "../services/adminService";

function describeOffset(min: number): string {
  if (min === 0) return "Giờ thật (không dời)";
  const sign = min > 0 ? "+" : "−";
  const abs = Math.abs(min);
  const d = Math.floor(abs / 1440);
  const h = Math.floor((abs % 1440) / 60);
  const m = abs % 60;
  return `${sign}${d ? `${d} ngày ` : ""}${h ? `${h} giờ ` : ""}${m ? `${m} phút` : ""}`.trim();
}

/** Công cụ demo: dời đồng hồ nghiệp vụ, chạy job hết hạn. Ẩn nếu backend tắt DEMO_TOOLS (404). */
export function DemoTools() {
  const q = useApiQuery("demo-clock", adminService.clock);
  const setClock = useMutation(adminService.setClock);
  const expire = useMutation(adminService.expireNow);
  const [notice, setNotice] = useState<string | null>(null);

  if (q.error?.status === 404) return null;
  if (q.loading && !q.data) return null;
  if (!q.data) return null;
  const offset = q.data.offsetMinutes ?? 0;

  async function shift(next: number, label: string) {
    const res = await setClock.run(next);
    if (res !== undefined) {
      resetServerSkew();
      setNotice(`Đã ${label}. Đồng hồ nghiệp vụ: ${describeOffset(next)}.`);
      void q.reload();
    }
  }

  async function runExpire() {
    const res = await expire.run();
    if (res !== undefined) setNotice("Đã chạy job hết hạn — các đơn quá hạn thanh toán đã chuyển sang Hết hạn giữ phòng và trả lại tồn phòng.");
  }

  const err = setClock.error ?? expire.error;
  return (
    <section aria-labelledby="demo-tools-heading" className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-card sm:p-6">
      <h2 id="demo-tools-heading" className="flex items-center gap-2 text-lg font-bold">
        <FlaskConical className="size-5 text-amber-700" aria-hidden="true" /> Công cụ demo
      </h2>
      <p className="mt-1 text-sm text-ink-soft">Chỉ có ở môi trường demo — dùng để trình diễn hết hạn giữ phòng, nhận – trả phòng, không đến.</p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg bg-white p-3">
          <dt className="flex items-center gap-1 text-ink-soft">
            <Clock className="size-4" aria-hidden="true" /> Giờ nghiệp vụ
          </dt>
          <dd className="font-heading text-lg font-bold" data-testid="demo-now">
            {formatDateTime(q.data.now)}
          </dd>
        </div>
        <div className="rounded-lg bg-white p-3">
          <dt className="text-ink-soft">Độ lệch</dt>
          <dd className="font-heading text-lg font-bold" data-testid="demo-offset">
            {describeOffset(offset)}
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => shift(offset + 15, "tua 15 phút")} disabled={setClock.pending}>
          +15 phút
        </Button>
        <Button variant="secondary" size="sm" onClick={() => shift(offset + 1440, "tua 1 ngày")} disabled={setClock.pending}>
          +1 ngày
        </Button>
        <Button variant="secondary" size="sm" onClick={() => shift(offset + 7 * 1440, "tua 7 ngày")} disabled={setClock.pending}>
          +7 ngày
        </Button>
        <Button variant="ghost" size="sm" onClick={() => shift(0, "đặt lại đồng hồ")} disabled={setClock.pending || offset === 0}>
          <RotateCcw className="size-4" aria-hidden="true" /> Đặt lại 0
        </Button>
        <Button variant="cta" size="sm" onClick={runExpire} loading={expire.pending}>
          <Zap className="size-4" aria-hidden="true" /> Chạy job hết hạn ngay
        </Button>
      </div>
      {notice && <Alert tone="success" className="mt-4">{notice}</Alert>}
      {err && <Alert tone="error" className="mt-4">{err.message}</Alert>}
    </section>
  );
}
