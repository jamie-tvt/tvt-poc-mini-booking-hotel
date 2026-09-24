"use client";

import { useState } from "react";
import { BadgeCheck, Wallet } from "lucide-react";
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
import { PayoutStatusBadge } from "@/features/booking/components/BookingStatusBadge";
import { usePortalHotel } from "@/features/hotel-management/context/PortalHotelContext";
import { useApiQuery, useMutation } from "@/lib/api/hooks";
import { formatDateTime, formatVnd } from "@/lib/utils/format";
import { PAYOUT_STATUS, PAYOUT_STATUSES } from "@/lib/utils/labels";
import { asList } from "@/lib/utils/query";
import type { PayoutDto, PayoutStatus } from "@/types/domain";
import { payoutService } from "../services/payoutService";

/** Đối soát chi trả — dùng chung cho owner (/portal/payouts) và admin (/admin/payouts, có nút đánh dấu đã trả). */
export function PayoutList({ mode }: { mode: "portal" | "admin" }) {
  if (mode === "portal") return <PortalPayoutList />;
  return <PayoutListView mode="admin" hotelId={null} />;
}

function PortalPayoutList() {
  const { hotelId, hotel } = usePortalHotel();
  return <PayoutListView mode="portal" hotelId={hotelId} hotelName={hotel?.name} />;
}

function PayoutListView({ mode, hotelId, hotelName }: { mode: "portal" | "admin"; hotelId: number | null; hotelName?: string }) {
  const [status, setStatus] = useState<PayoutStatus | "">("");
  const [page, setPage] = useState(0);
  const [paying, setPaying] = useState<PayoutDto | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const q = useApiQuery(
    `payouts-${mode}-${hotelId}-${status}-${page}`,
    () =>
      mode === "portal"
        ? payoutService.portal({ hotelId: hotelId ?? undefined, status: status || undefined, page })
        : payoutService.admin({ status: status || undefined, page }),
    mode === "admin" || hotelId !== null,
  );
  const markPaid = useMutation((id: number) => payoutService.markPaid(id));
  const rows = asList(q.data);
  const totalPages = q.data && !Array.isArray(q.data) ? q.data.totalPages : 1;
  const pendingTotal = rows.filter((r) => r.status === "PENDING").reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <PageHeader
        title={mode === "admin" ? "Chi trả khách sạn" : "Đối soát chi trả"}
        description={
          mode === "admin"
            ? "Khoản phải trả cho khách sạn sinh khi đơn trả phòng; số tiền = tiền phòng (không gồm phí nền tảng)."
            : `${hotelName ?? ""} — khoản khách sạn nhận sau mỗi đơn đã trả phòng.`
        }
      />
      <div className="mb-4 flex flex-wrap items-end gap-4 rounded-xl border border-line bg-white p-4">
        <SelectField
          id="po-status"
          label="Trạng thái"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as PayoutStatus | "");
            setPage(0);
          }}
          containerClassName="w-full sm:w-60"
        >
          <option value="">Tất cả</option>
          {PAYOUT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PAYOUT_STATUS[s].label}
            </option>
          ))}
        </SelectField>
        {rows.length > 0 && (
          <p className="text-sm text-ink-soft">
            Chờ chi trả (trang này): <strong className="font-heading text-lg text-ink-strong">{formatVnd(pendingTotal)}</strong>
          </p>
        )}
      </div>
      {notice && (
        <Alert tone="success" className="mb-4">
          {notice}
        </Alert>
      )}
      {q.loading && !q.data ? (
        <Spinner />
      ) : q.error ? (
        <ErrorState message={q.error.message} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Wallet} title="Chưa có khoản chi trả" description="Khoản chi trả được tạo khi khách trả phòng." />
      ) : (
        <>
          <Table caption="Danh sách khoản chi trả">
            <thead>
              <tr>
                {mode === "admin" && <Th>Khách sạn</Th>}
                <Th>Mã đơn</Th>
                <Th>Số tiền</Th>
                <Th>Trạng thái</Th>
                <Th>Tạo lúc</Th>
                <Th>Đã trả lúc</Th>
                {mode === "admin" && <Th className="text-right">Thao tác</Th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  {mode === "admin" && <Td className="font-medium">{p.hotelName}</Td>}
                  <Td className="font-mono text-xs font-semibold">{p.bookingCode}</Td>
                  <Td className="font-semibold">{formatVnd(p.amount)}</Td>
                  <Td>
                    <PayoutStatusBadge status={p.status} />
                  </Td>
                  <Td className="text-xs">{formatDateTime(p.createdAt)}</Td>
                  <Td className="text-xs">{p.paidAt ? formatDateTime(p.paidAt) : "—"}</Td>
                  {mode === "admin" && (
                    <Td className="text-right">
                      {p.status === "PENDING" && (
                        <Button size="sm" onClick={() => setPaying(p)} aria-label={`Đánh dấu đã trả khoản ${p.bookingCode}`}>
                          <BadgeCheck className="size-4" aria-hidden="true" /> Đánh dấu đã trả
                        </Button>
                      )}
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
          <ButtonPagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
      <Dialog
        open={!!paying}
        onClose={() => {
          setPaying(null);
          markPaid.reset();
        }}
        title="Xác nhận đã chi trả?"
        description={paying ? `${paying.hotelName} · đơn ${paying.bookingCode} · ${formatVnd(paying.amount)}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaying(null)}>
              Quay lại
            </Button>
            <Button
              loading={markPaid.pending}
              onClick={async () => {
                if (!paying) return;
                const res = await markPaid.run(paying.id);
                if (res !== undefined) {
                  setNotice(`Đã đánh dấu chi trả đơn ${paying.bookingCode}.`);
                  setPaying(null);
                  void q.reload();
                }
              }}
            >
              Xác nhận đã trả
            </Button>
          </>
        }
      >
        <p className="text-sm">Chỉ đánh dấu sau khi đã chuyển khoản cho khách sạn. Thao tác được ghi nhật ký.</p>
        {markPaid.error && (
          <Alert tone="error" className="mt-3">
            {markPaid.error.message}
          </Alert>
        )}
      </Dialog>
    </div>
  );
}
