"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BookmarkCheck, ChevronLeft, CreditCard, XCircle } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { ReviewForm } from "@/features/review/components/ReviewForm";
import { useApiQuery, useMutation } from "@/lib/api/hooks";
import { useAuth } from "@/lib/auth/AuthProvider";
import { formatDateTime } from "@/lib/utils/format";
import { cancellationLabel } from "@/lib/utils/stay";
import { bookingService } from "../services/bookingService";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { BookingSummaryCard } from "./BookingSummaryCard";
import { CancelBookingDialog } from "./CancelBookingDialog";
import { Countdown } from "./Countdown";
import { InvoiceCard } from "./InvoiceCard";

/**
 * Chi tiết đơn cho khách (có hoặc không có tài khoản) — xác thực bằng mã đơn + access key.
 * `paid` = "1" | "0" khi quay về từ cổng thanh toán; `isNew` khi vừa giữ phòng xong.
 */
export function BookingDetailView({ code, accessKey, paid, isNew }: { code: string; accessKey: string; paid?: string; isNew?: boolean }) {
  const { user } = useAuth();
  const q = useApiQuery(`booking-${code}-${accessKey}`, () => bookingService.getByCode(code, accessKey), !!accessKey);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const pay = useMutation(() => bookingService.startPayment(code, accessKey));
  const booking = q.data;
  const { reload } = q;

  // Vừa quay về từ cổng thanh toán mà đơn còn PENDING → hỏi lại vài lần (webhook có thể chậm).
  const [polls, setPolls] = useState(0);
  useEffect(() => {
    if (paid !== "1" || !booking || booking.status !== "PENDING" || polls >= 5) return;
    const t = window.setTimeout(() => {
      setPolls((n) => n + 1);
      void reload();
    }, 2000);
    return () => window.clearTimeout(t);
  }, [paid, booking, polls, reload]);

  const onExpire = useCallback(() => {
    window.setTimeout(() => void reload(), 1500);
  }, [reload]);

  if (!accessKey) {
    return (
      <ErrorState
        title="Thiếu mã truy cập đơn"
        message="Đường dẫn chưa có mã truy cập. Hãy tra cứu lại đơn bằng mã đơn và email đã dùng khi đặt."
        action={<LinkButton href={`/lookup?code=${encodeURIComponent(code)}`}>Tra cứu đơn</LinkButton>}
      />
    );
  }
  if (q.loading && !booking) return <Spinner label="Đang tải đơn đặt phòng…" />;
  if (q.error || !booking) {
    return (
      <ErrorState
        title={q.error?.status === 404 ? "Không tìm thấy đơn" : undefined}
        message={q.error?.status === 404 ? "Mã đơn hoặc mã truy cập không đúng. Hãy tra cứu lại bằng mã đơn và email." : q.error?.message}
        action={<LinkButton href={`/lookup?code=${encodeURIComponent(code)}`}>Tra cứu đơn</LinkButton>}
      />
    );
  }

  async function startPayment() {
    const payment = await pay.run();
    if (payment?.checkoutUrl) window.location.assign(payment.checkoutUrl);
  }

  return (
    <div>
      {user?.role === "CUSTOMER" ? (
        <Link href="/my-bookings" className="inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-medium text-brand hover:underline">
          <ChevronLeft className="size-4" aria-hidden="true" /> Đơn của tôi
        </Link>
      ) : (
        <Link href="/lookup" className="inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-medium text-brand hover:underline">
          <ChevronLeft className="size-4" aria-hidden="true" /> Tra cứu đơn khác
        </Link>
      )}
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Đơn <span className="font-mono">{booking.bookingCode}</span>
        </h1>
        <BookingStatusBadge status={booking.status} />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <Alert tone="info" title="Lưu mã đơn và email để tra cứu lại">
          Mã đơn <strong className="font-mono">{booking.bookingCode}</strong> · email <strong>{booking.guestEmail}</strong>. Bạn có thể xem, thanh
          toán, huỷ hoặc đánh giá đơn tại trang{" "}
          <Link href="/lookup" className="font-semibold underline">
            Tra cứu đơn
          </Link>
          .
        </Alert>
        {isNew && booking.status === "PENDING" && (
          <Alert tone="success" title="Đã giữ phòng cho bạn">
            Vui lòng thanh toán trước khi hết thời gian giữ phòng để xác nhận đơn.
          </Alert>
        )}
        {paid === "1" && booking.status === "CONFIRMED" && (
          <Alert tone="success" title="Thanh toán thành công">
            Đơn đã được xác nhận. Hẹn gặp bạn tại {booking.hotelName}!
          </Alert>
        )}
        {paid === "1" && booking.status === "PENDING" && <Alert tone="info">Đang chờ xác nhận thanh toán… Trang sẽ tự cập nhật.</Alert>}
        {paid === "0" && booking.status === "PENDING" && (
          <Alert tone="warning" title="Thanh toán chưa thành công">
            Bạn có thể thanh toán lại trước khi hết thời gian giữ phòng.
          </Alert>
        )}
        {notice && <Alert tone="success">{notice}</Alert>}
        {pay.error && <Alert tone="error">{pay.error.message}</Alert>}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-6">
          <BookingSummaryCard booking={booking} />

          {booking.status === "CANCELLED" && (
            <Alert tone="warning" title="Đơn đã huỷ">
              {booking.cancelledAt && <>Huỷ lúc {formatDateTime(booking.cancelledAt)}. </>}
              {booking.cancelReason && <>Lý do: {booking.cancelReason}</>}
            </Alert>
          )}
          {booking.status === "EXPIRED" && (
            <Alert tone="warning" title="Đơn đã hết hạn giữ phòng">
              Đơn không được thanh toán đúng hạn nên phòng đã được trả lại. Bạn có thể đặt lại nếu khách sạn còn phòng.
            </Alert>
          )}
          {booking.status === "NO_SHOW" && (
            <Alert tone="warning" title="Không đến nhận phòng">
              Khách sạn đã ghi nhận bạn không đến nhận phòng. Theo chính sách, đơn không được hoàn tiền.
            </Alert>
          )}

          {booking.canReview && !reviewed && (
            <Card>
              <h2 className="text-lg font-bold">Đánh giá kỳ nghỉ</h2>
              <p className="mb-4 mt-1 text-sm text-ink-soft">Chia sẻ trải nghiệm để giúp những du khách khác chọn chỗ ở.</p>
              <ReviewForm
                bookingCode={booking.bookingCode}
                accessKey={accessKey}
                onDone={() => {
                  setReviewed(true);
                  setNotice("Cảm ơn bạn đã gửi đánh giá!");
                  void q.reload();
                }}
              />
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {(booking.canPay || booking.canCancel) && (
            <Card className="flex flex-col gap-4">
              <h2 className="text-lg font-bold">Thao tác</h2>
              {booking.canPay && booking.expiresAt && <Countdown expiresAt={booking.expiresAt} onExpire={onExpire} />}
              {booking.canPay && (
                <Button variant="cta" size="lg" onClick={startPayment} loading={pay.pending}>
                  <CreditCard className="size-5" aria-hidden="true" /> Thanh toán
                </Button>
              )}
              {booking.canCancel && (
                <Button variant="secondary" onClick={() => setCancelOpen(true)}>
                  <XCircle className="size-5" aria-hidden="true" /> Huỷ đặt phòng
                </Button>
              )}
              <p className="text-xs text-ink-soft">
                Chính sách huỷ: {cancellationLabel(booking.cancellationPolicy, booking.freeCancelDays, booking.checkIn)}.
              </p>
            </Card>
          )}
          {booking.invoice && <InvoiceCard invoice={booking.invoice} />}
          {!booking.canPay && !booking.canCancel && !booking.invoice && (
            <Card className="flex items-start gap-3">
              <BookmarkCheck className="size-6 shrink-0 text-brand" aria-hidden="true" />
              <p className="text-sm text-ink">Đơn này không còn thao tác nào cần thực hiện.</p>
            </Card>
          )}
        </div>
      </div>

      {booking.canCancel && (
        <CancelBookingDialog
          booking={booking}
          accessKey={accessKey}
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          onCancelled={(b) => {
            q.setData(b);
            setNotice("Đã huỷ đơn đặt phòng.");
            void q.reload();
          }}
        />
      )}
    </div>
  );
}
