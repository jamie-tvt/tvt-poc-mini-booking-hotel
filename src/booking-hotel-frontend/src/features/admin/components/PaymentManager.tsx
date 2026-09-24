"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/Field";
import { ButtonPagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { PaymentStatusBadge } from "@/features/booking/components/BookingStatusBadge";
import { useApiQuery, useMutation } from "@/lib/api/hooks";
import { formatDateTime, formatVnd } from "@/lib/utils/format";
import { PAYMENT_STATUS, PAYMENT_STATUSES, PROVIDER_LABEL } from "@/lib/utils/labels";
import type { PaymentDto, PaymentStatus } from "@/types/domain";
import { adminService } from "../services/adminService";

/** Giao dịch thanh toán; hoàn tiền thủ công cho giao dịch đã thanh toán. */
export function PaymentManager() {
  const [status, setStatus] = useState<PaymentStatus | "">("");
  const [page, setPage] = useState(0);
  const [refunding, setRefunding] = useState<PaymentDto | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const q = useApiQuery(`admin-payments-${status}-${page}`, () => adminService.payments({ status: status || undefined, page }));
  const refund = useMutation((id: number) => adminService.refundPayment(id));

  return (
    <div>
      <PageHeader title="Thanh toán" description="Giao dịch qua cổng thanh toán. Trạng thái Đã thanh toán chỉ đổi qua webhook đã xác minh chữ ký." />
      <div className="mb-4 rounded-xl border border-line bg-white p-4">
        <SelectField
          id="ap-status"
          label="Trạng thái"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as PaymentStatus | "");
            setPage(0);
          }}
          containerClassName="w-full sm:w-60"
        >
          <option value="">Tất cả</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PAYMENT_STATUS[s].label}
            </option>
          ))}
        </SelectField>
      </div>
      {notice && (
        <Alert tone="success" className="mb-4">
          {notice}
        </Alert>
      )}
      {q.loading ? (
        <Spinner />
      ) : q.error ? (
        <ErrorState message={q.error.message} />
      ) : !q.data || q.data.content.length === 0 ? (
        <EmptyState title="Chưa có giao dịch" />
      ) : (
        <>
          <Table caption="Danh sách giao dịch">
            <thead>
              <tr>
                <Th>#</Th>
                <Th>Mã đơn</Th>
                <Th>Khách</Th>
                <Th>Cổng</Th>
                <Th>Số tiền</Th>
                <Th>Đã hoàn</Th>
                <Th>Trạng thái</Th>
                <Th>Thời gian</Th>
                <Th className="text-right">Thao tác</Th>
              </tr>
            </thead>
            <tbody>
              {q.data.content.map((p) => (
                <tr key={p.id}>
                  <Td className="font-mono text-xs">{p.id}</Td>
                  <Td className="font-mono text-xs font-semibold">{p.bookingCode}</Td>
                  <Td>{p.guestName}</Td>
                  <Td>
                    {PROVIDER_LABEL[p.provider] ?? p.provider}
                    {p.transactionCode && <span className="block font-mono text-xs text-ink-soft">{p.transactionCode}</span>}
                  </Td>
                  <Td className="font-semibold">{formatVnd(p.amount)}</Td>
                  <Td>{p.refundAmount ? formatVnd(p.refundAmount) : "—"}</Td>
                  <Td>
                    <PaymentStatusBadge status={p.status} />
                  </Td>
                  <Td className="text-xs">{formatDateTime(p.paidAt ?? p.createdAt)}</Td>
                  <Td className="text-right">
                    {p.status === "PAID" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        onClick={() => {
                          refund.reset();
                          setRefunding(p);
                        }}
                        aria-label={`Hoàn tiền giao dịch ${p.id} đơn ${p.bookingCode}`}
                      >
                        <RotateCcw className="size-4" aria-hidden="true" /> Hoàn tiền
                      </Button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <ButtonPagination page={q.data.page} totalPages={q.data.totalPages} onChange={setPage} />
        </>
      )}
      <Dialog
        open={!!refunding}
        onClose={() => setRefunding(null)}
        title="Hoàn tiền giao dịch?"
        description={refunding ? `Đơn ${refunding.bookingCode} · ${formatVnd(refunding.amount)}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRefunding(null)}>
              Quay lại
            </Button>
            <Button
              variant="danger"
              loading={refund.pending}
              onClick={async () => {
                if (!refunding) return;
                const res = await refund.run(refunding.id);
                if (res) {
                  setNotice(`Đã hoàn tiền giao dịch #${refunding.id} (đơn ${refunding.bookingCode}).`);
                  setRefunding(null);
                  void q.reload();
                }
              }}
            >
              Xác nhận hoàn tiền
            </Button>
          </>
        }
      >
        <p className="text-sm">Hoàn toàn bộ số tiền cho khách qua cổng thanh toán. Thao tác không thể hoàn tác và được ghi nhật ký.</p>
        {refund.error && (
          <Alert tone="error" className="mt-3">
            {refund.error.message}
          </Alert>
        )}
      </Dialog>
    </div>
  );
}
