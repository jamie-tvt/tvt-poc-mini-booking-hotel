"use client";

import { useState } from "react";
import { CircleCheck, CircleX, Landmark } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { useApiQuery, useMutation } from "@/lib/api/hooks";
import { formatDateTime, formatVnd } from "@/lib/utils/format";
import { bookingHref, paymentService } from "../services/bookingService";
import { PaymentStatusBadge } from "./BookingStatusBadge";

/**
 * Cổng thanh toán giả lập (chỉ môi trường demo). Kết quả do backend ghi nhận qua
 * POST /payments/mock/{id}/complete — trình duyệt không tự đổi trạng thái đơn.
 */
export function MockGateway({ paymentId, accessKey }: { paymentId: string; accessKey: string }) {
  const q = useApiQuery(`payment-${paymentId}`, () => paymentService.get(paymentId, accessKey), !!accessKey);
  const m = useMutation((result: "SUCCESS" | "FAILED") => paymentService.completeMock(paymentId, accessKey, result));
  const [choice, setChoice] = useState<"SUCCESS" | "FAILED" | null>(null);

  if (!accessKey) return <ErrorState title="Thiếu mã truy cập" message="Đường dẫn thanh toán không hợp lệ. Hãy mở lại đơn và bấm Thanh toán." />;
  if (q.loading) return <Spinner label="Đang tải giao dịch…" />;
  if (q.error || !q.data) return <ErrorState message={q.error?.message} />;
  const p = q.data;
  const back = (paid?: "1" | "0") => bookingHref(p.bookingCode, accessKey, paid ? { paid } : undefined);

  async function complete(result: "SUCCESS" | "FAILED") {
    setChoice(result);
    const ok = await m.run(result);
    if (ok !== undefined) window.location.assign(back(result === "SUCCESS" ? "1" : "0"));
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-modal">
        <div className="flex items-center gap-3 bg-brand px-5 py-4 text-white">
          <Landmark className="size-6" aria-hidden="true" />
          <div>
            <h1 className="text-lg font-bold text-white">Cổng thanh toán giả lập</h1>
            <p className="text-sm text-blue-100">Mekong Pay Sandbox</p>
          </div>
        </div>
        <div className="flex flex-col gap-5 p-5">
          <Alert tone="warning" title="Môi trường demo">
            Không có giao dịch tiền thật. Chọn kết quả để mô phỏng phản hồi từ cổng thanh toán.
          </Alert>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-ink-soft">Mã đơn</dt>
            <dd className="text-right font-mono font-semibold">{p.bookingCode}</dd>
            <dt className="text-ink-soft">Khách hàng</dt>
            <dd className="text-right">{p.guestName}</dd>
            <dt className="text-ink-soft">Mã thanh toán</dt>
            <dd className="text-right font-mono">#{p.id}</dd>
            <dt className="text-ink-soft">Tạo lúc</dt>
            <dd className="text-right">{formatDateTime(p.createdAt)}</dd>
            <dt className="text-ink-soft">Trạng thái</dt>
            <dd className="text-right">
              <PaymentStatusBadge status={p.status} />
            </dd>
          </dl>
          <div className="rounded-xl bg-bg p-4 text-center">
            <p className="text-sm text-ink-soft">Số tiền thanh toán</p>
            <p className="font-heading text-3xl font-bold text-ink-strong" data-testid="mock-amount">
              {formatVnd(p.amount)}
            </p>
          </div>
          {m.error && <Alert tone="error">{m.error.message}</Alert>}
          {p.status !== "PENDING" ? (
            <Alert tone="info">
              Giao dịch này đã được xử lý.{" "}
              <a href={back()} className="font-semibold underline">
                Xem đơn đặt phòng
              </a>
            </Alert>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                size="lg"
                className="bg-green-700 hover:bg-green-800"
                onClick={() => complete("SUCCESS")}
                loading={m.pending && choice === "SUCCESS"}
                disabled={m.pending}
              >
                <CircleCheck className="size-5" aria-hidden="true" /> Thanh toán thành công
              </Button>
              <Button size="lg" variant="danger" onClick={() => complete("FAILED")} loading={m.pending && choice === "FAILED"} disabled={m.pending}>
                <CircleX className="size-5" aria-hidden="true" /> Thanh toán thất bại
              </Button>
            </div>
          )}
          <a href={back()} className="text-center text-sm font-medium text-brand underline-offset-4 hover:underline">
            Quay lại đơn (chưa thanh toán)
          </a>
        </div>
      </div>
    </div>
  );
}
