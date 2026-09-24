import { formatStayDateWithWeekday, formatVnd } from "@/lib/utils/format";
import type { PriceBreakdown } from "@/lib/utils/stay";

/**
 * Tóm tắt giá trước khi đặt: giá từng đêm (đã gồm phí) × số phòng, tách tiền phòng / phí nền tảng
 * khi suy ra được, và tổng thanh toán.
 */
export function PriceSummary({ breakdown, rooms }: { breakdown: PriceBreakdown; rooms: number }) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      {breakdown.nights.length > 0 && (
        <details className="group rounded-lg bg-bg p-3" open={breakdown.nights.length <= 4}>
          <summary className="flex min-h-9 items-center justify-between font-semibold text-ink-strong">
            Giá từng đêm ({breakdown.nights.length} đêm × {rooms} phòng)
          </summary>
          <ul className="mt-2 flex flex-col gap-1">
            {breakdown.nights.map((n) => (
              <li key={n.date} className="flex justify-between gap-3">
                <span className="text-ink-soft">{formatStayDateWithWeekday(n.date)}</span>
                <span>
                  {formatVnd(n.listingPrice)}
                  {rooms > 1 && <span className="text-ink-soft"> × {rooms}</span>}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <dl className="grid grid-cols-[1fr_auto] gap-y-1.5">
        {breakdown.base !== null && breakdown.fee !== null ? (
          <>
            <dt className="text-ink-soft">Giá phòng</dt>
            <dd className="text-right">{formatVnd(breakdown.base)}</dd>
            <dt className="text-ink-soft">Phí nền tảng</dt>
            <dd className="text-right">{formatVnd(breakdown.fee)}</dd>
          </>
        ) : (
          <>
            <dt className="text-ink-soft">Giá phòng (đã gồm phí nền tảng)</dt>
            <dd className="text-right">{formatVnd(breakdown.total)}</dd>
          </>
        )}
        <div className="col-span-2 my-1 h-px bg-line" aria-hidden="true" />
        <dt className="self-center font-semibold text-ink-strong">Tổng thanh toán</dt>
        <dd className="text-right font-heading text-2xl font-bold text-cta" data-testid="checkout-total">
          {formatVnd(breakdown.total)}
        </dd>
      </dl>
      <p className="text-xs text-ink-soft">Giá tạm tính theo giá niêm yết hiện tại; số tiền chính xác được xác nhận khi giữ phòng.</p>
    </div>
  );
}
