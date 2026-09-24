"use client";

import Link from "next/link";
import { useState } from "react";
import { CircleCheck, CircleX, ExternalLink, Pause, Play } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextAreaField } from "@/components/ui/Field";
import { HotelClass } from "@/components/ui/HotelClass";
import { ButtonPagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { Table, Td, Th } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { HotelStatusBadge } from "@/features/booking/components/BookingStatusBadge";
import { useApiQuery, useMutation } from "@/lib/api/hooks";
import { HOTEL_STATUS, HOTEL_STATUSES } from "@/lib/utils/labels";
import type { HotelStatus, HotelSummaryDto } from "@/types/domain";
import { adminService } from "../services/adminService";

type Action = "approve" | "reject" | "suspend" | "activate";
type TabKey = "ALL" | HotelStatus;

const ACTION_META: Record<Action, { title: string; confirm: string; done: string; danger?: boolean }> = {
  approve: { title: "Duyệt khách sạn?", confirm: "Duyệt", done: "Đã duyệt" },
  reject: { title: "Từ chối khách sạn?", confirm: "Từ chối", done: "Đã từ chối", danger: true },
  suspend: { title: "Tạm ngưng khách sạn?", confirm: "Tạm ngưng", done: "Đã tạm ngưng", danger: true },
  activate: { title: "Kích hoạt lại khách sạn?", confirm: "Kích hoạt", done: "Đã kích hoạt" },
};

/** Duyệt khách sạn (FR-HTL-002): PENDING_APPROVAL → ACTIVE | REJECTED; ACTIVE ↔ SUSPENDED. */
export function HotelApproval({ initialStatus }: { initialStatus?: string }) {
  const start = (HOTEL_STATUSES as string[]).includes(initialStatus ?? "") ? (initialStatus as HotelStatus) : "ALL";
  const [tab, setTab] = useState<TabKey>(start);
  const [page, setPage] = useState(0);
  const [pending, setPending] = useState<{ hotel: HotelSummaryDto; action: Action } | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const q = useApiQuery(`admin-hotels-${tab}-${page}`, () => adminService.hotels({ status: tab === "ALL" ? undefined : tab, page }));
  const m = useMutation(({ hotel, action }: { hotel: HotelSummaryDto; action: Action }) => {
    if (action === "approve") return adminService.approveHotel(hotel.id);
    if (action === "reject") return adminService.rejectHotel(hotel.id, reason.trim());
    if (action === "suspend") return adminService.suspendHotel(hotel.id);
    return adminService.activateHotel(hotel.id);
  });

  function open(hotel: HotelSummaryDto, action: Action) {
    m.reset();
    setReason("");
    setReasonError(null);
    setPending({ hotel, action });
  }

  async function confirm() {
    if (!pending) return;
    if (pending.action === "reject" && reason.trim().length < 5) {
      setReasonError("Nhập lý do từ chối (tối thiểu 5 ký tự) để chủ khách sạn biết cần sửa gì.");
      return;
    }
    const res = await m.run(pending);
    if (res !== undefined) {
      setNotice(`${ACTION_META[pending.action].done} ${pending.hotel.name}.`);
      setPending(null);
      void q.reload();
    }
  }

  const tabs = [{ key: "ALL" as TabKey, label: "Tất cả" }, ...HOTEL_STATUSES.map((s) => ({ key: s as TabKey, label: HOTEL_STATUS[s].label }))];

  return (
    <div>
      <PageHeader title="Duyệt khách sạn" description="Chỉ khách sạn Đang hoạt động mới hiển thị và nhận đặt phòng." />
      <Tabs
        label="Lọc theo trạng thái"
        items={tabs}
        value={tab}
        idPrefix="ah"
        onChange={(k) => {
          setTab(k);
          setPage(0);
        }}
      />
      <div role="tabpanel" id="ah-panel" aria-labelledby={`ah-tab-${tab}`} className="pt-4">
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
          <EmptyState title="Không có khách sạn ở trạng thái này" />
        ) : (
          <>
            <Table caption="Danh sách khách sạn">
              <thead>
                <tr>
                  <Th>Khách sạn</Th>
                  <Th>Thành phố</Th>
                  <Th>Chủ sở hữu</Th>
                  <Th>Trạng thái</Th>
                  <Th className="text-right">Thao tác</Th>
                </tr>
              </thead>
              <tbody>
                {q.data.content.map((h) => (
                  <tr key={h.id}>
                    <Td>
                      <span className="font-semibold">{h.name}</span>
                      <HotelClass stars={h.starRating} className="ml-2" />
                      <span className="block text-xs text-ink-soft">{h.address}</span>
                      {h.status === "REJECTED" && h.rejectReason && <span className="block text-xs text-danger">Lý do: {h.rejectReason}</span>}
                    </Td>
                    <Td>{h.city}</Td>
                    <Td>{h.ownerName ?? "—"}</Td>
                    <Td>
                      <HotelStatusBadge status={h.status} />
                    </Td>
                    <Td className="text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {h.status === "PENDING_APPROVAL" && (
                          <>
                            <Button size="sm" onClick={() => open(h, "approve")} aria-label={`Duyệt ${h.name}`}>
                              <CircleCheck className="size-4" aria-hidden="true" /> Duyệt
                            </Button>
                            <Button size="sm" variant="ghost" className="text-danger" onClick={() => open(h, "reject")} aria-label={`Từ chối ${h.name}`}>
                              <CircleX className="size-4" aria-hidden="true" /> Từ chối
                            </Button>
                          </>
                        )}
                        {h.status === "ACTIVE" && (
                          <>
                            <Link
                              href={`/hotels/${h.id}`}
                              className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-brand hover:bg-brand-soft"
                              aria-label={`Xem trang công khai ${h.name}`}
                            >
                              <ExternalLink className="size-4" aria-hidden="true" /> Xem
                            </Link>
                            <Button size="sm" variant="ghost" className="text-danger" onClick={() => open(h, "suspend")} aria-label={`Tạm ngưng ${h.name}`}>
                              <Pause className="size-4" aria-hidden="true" /> Tạm ngưng
                            </Button>
                          </>
                        )}
                        {h.status === "SUSPENDED" && (
                          <Button size="sm" variant="secondary" onClick={() => open(h, "activate")} aria-label={`Kích hoạt ${h.name}`}>
                            <Play className="size-4" aria-hidden="true" /> Kích hoạt
                          </Button>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ButtonPagination page={q.data.page} totalPages={q.data.totalPages} onChange={setPage} />
          </>
        )}
      </div>

      <Dialog
        open={!!pending}
        onClose={() => setPending(null)}
        title={pending ? ACTION_META[pending.action].title : ""}
        description={pending ? `${pending.hotel.name} — ${pending.hotel.city}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>
              Quay lại
            </Button>
            <Button variant={pending && ACTION_META[pending.action].danger ? "danger" : "primary"} loading={m.pending} onClick={confirm}>
              {pending ? ACTION_META[pending.action].confirm : ""}
            </Button>
          </>
        }
      >
        {pending?.action === "reject" ? (
          <TextAreaField
            id="reject-reason"
            label="Lý do từ chối"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={reasonError ?? undefined}
            maxLength={500}
          />
        ) : (
          <p className="text-sm">
            {pending?.action === "approve" && "Khách sạn sẽ hiển thị trên trang tìm kiếm và nhận đặt phòng ngay."}
            {pending?.action === "suspend" && "Khách sạn bị ẩn khỏi tìm kiếm và ngừng nhận đơn mới; đơn đã đặt vẫn giữ nguyên."}
            {pending?.action === "activate" && "Khách sạn hiển thị lại và nhận đặt phòng."}
          </p>
        )}
        {m.error && (
          <Alert tone="error" className="mt-3">
            {m.error.message}
          </Alert>
        )}
      </Dialog>
    </div>
  );
}
