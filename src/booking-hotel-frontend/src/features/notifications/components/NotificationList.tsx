"use client";

import Link from "next/link";
import { useState } from "react";
import { BellOff, CheckCheck } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ButtonPagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useApiQuery, useMutation } from "@/lib/api/hooks";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/format";
import { notificationService, notifyNotificationsChanged } from "../services/notificationService";

/** Trang có danh sách đơn theo vai trò (thông báo chỉ có bookingCode, không có access key). */
function bookingListPath(role: string | undefined): string | null {
  if (role === "CUSTOMER") return "/my-bookings";
  if (role === "HOTEL_OWNER" || role === "HOTEL_STAFF") return "/portal/bookings";
  if (role === "ADMIN") return "/admin/bookings";
  return null;
}

export function NotificationList() {
  const { user } = useAuth();
  const bookingLink = bookingListPath(user?.role);
  const [page, setPage] = useState(0);
  const q = useApiQuery(`notifications-${page}`, () => notificationService.list(page));
  const readOne = useMutation(notificationService.markRead);
  const readAll = useMutation(notificationService.markAllRead);

  async function markRead(id: number) {
    const ok = await readOne.run(id);
    if (ok !== undefined) {
      q.setData((prev) => (prev ? { ...prev, content: prev.content.map((n) => (n.id === id ? { ...n, read: true } : n)) } : prev));
      notifyNotificationsChanged();
    }
  }

  async function markAll() {
    const ok = await readAll.run();
    if (ok !== undefined) {
      q.setData((prev) => (prev ? { ...prev, content: prev.content.map((n) => ({ ...n, read: true })) } : prev));
      notifyNotificationsChanged();
    }
  }

  const hasUnread = q.data?.content.some((n) => !n.read);
  const err = readOne.error ?? readAll.error;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Thông báo</h1>
        <Button variant="secondary" onClick={markAll} loading={readAll.pending} disabled={!hasUnread}>
          <CheckCheck className="size-4" aria-hidden="true" /> Đánh dấu tất cả đã đọc
        </Button>
      </div>
      {err && <Alert tone="error" className="mb-4">{err.message}</Alert>}
      {q.loading ? (
        <Spinner />
      ) : q.error ? (
        <ErrorState message={q.error.message} />
      ) : !q.data || q.data.content.length === 0 ? (
        <EmptyState icon={BellOff} title="Chưa có thông báo" description="Thông báo về đơn đặt phòng, nhận – trả phòng và duyệt khách sạn sẽ hiển thị ở đây." />
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {q.data.content.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between",
                  n.read ? "border-line bg-white" : "border-brand/40 bg-brand-soft",
                )}
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-ink">
                    {!n.read && <span className="size-2 shrink-0 rounded-full bg-cta" aria-hidden="true" />}
                    {!n.read && <span className="sr-only">Chưa đọc: </span>}
                    {n.title}
                  </p>
                  <p className="mt-1 text-sm text-ink">{n.content}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {formatDateTime(n.createdAt)}
                    {n.bookingCode && (
                      <>
                        {" · Đơn "}
                        <span className="font-mono font-semibold text-ink">{n.bookingCode}</span>
                        {bookingLink && (
                          <>
                            {" · "}
                            <Link href={bookingLink} className="font-semibold text-brand hover:underline">
                              Xem đơn
                            </Link>
                          </>
                        )}
                      </>
                    )}
                  </p>
                </div>
                {!n.read && (
                  <Button size="sm" variant="ghost" onClick={() => markRead(n.id)} aria-label={`Đánh dấu đã đọc: ${n.title}`}>
                    Đánh dấu đã đọc
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <ButtonPagination page={q.data.page} totalPages={q.data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
