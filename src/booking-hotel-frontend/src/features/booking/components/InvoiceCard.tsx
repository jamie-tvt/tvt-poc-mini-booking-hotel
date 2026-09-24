import { Receipt } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatDateTime, formatVnd } from "@/lib/utils/format";
import { PROVIDER_LABEL } from "@/lib/utils/labels";
import type { InvoiceDto } from "@/types/domain";
import { PaymentStatusBadge } from "./BookingStatusBadge";

/** Hoá đơn: tách tiền phòng (phần khách sạn) và phí nền tảng + lịch sử thanh toán. */
export function InvoiceCard({ invoice }: { invoice: InvoiceDto }) {
  return (
    <Card>
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Receipt className="size-5 text-brand" aria-hidden="true" /> Hoá đơn
      </h2>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-ink-soft">Mã hoá đơn</dt>
        <dd className="text-right font-mono font-semibold">{invoice.invoiceCode}</dd>
        <dt className="text-ink-soft">Ngày lập</dt>
        <dd className="text-right">{formatDateTime(invoice.createdAt)}</dd>
        <dt className="text-ink-soft">Tiền phòng</dt>
        <dd className="text-right">{formatVnd(invoice.baseAmount)}</dd>
        <dt className="text-ink-soft">Phí nền tảng</dt>
        <dd className="text-right">{formatVnd(invoice.feeAmount)}</dd>
        <div className="col-span-2 my-1 h-px bg-line" aria-hidden="true" />
        <dt className="font-semibold">Tổng</dt>
        <dd className="text-right font-semibold">{formatVnd(invoice.amount)}</dd>
      </dl>
      {invoice.payments?.length > 0 && (
        <>
          <h3 className="mt-4 font-sans text-sm font-semibold">Lịch sử thanh toán</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {invoice.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-bg px-3 py-2 text-sm">
                <span>
                  <span className="font-semibold">{formatVnd(p.amount)}</span>
                  {p.refundAmount ? <span className="text-ink-soft"> · hoàn {formatVnd(p.refundAmount)}</span> : null}
                  <span className="block text-xs text-ink-soft">
                    {PROVIDER_LABEL[p.provider] ?? p.provider}
                    {p.transactionCode ? ` · ${p.transactionCode}` : ""} · {formatDateTime(p.paidAt ?? p.createdAt)}
                  </span>
                </span>
                <PaymentStatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
