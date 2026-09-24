"use client";

import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";
import { formatCountdown, formatDateTime } from "@/lib/utils/format";
import { getServerSkewMs } from "../services/serverClock";

/** Đếm ngược tới `expiresAt` theo giờ nghiệp vụ của server. Gọi onExpire một lần khi về 0. */
export function Countdown({ expiresAt, onExpire }: { expiresAt: string; onExpire?: () => void }) {
  const [skew, setSkew] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const fired = useRef(false);
  const target = new Date(expiresAt).getTime();

  useEffect(() => {
    let alive = true;
    void getServerSkewMs().then((s) => alive && setSkew(s));
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);

  const remaining = target - (now + (skew ?? 0));
  useEffect(() => {
    if (skew !== null && remaining <= 0 && !fired.current) {
      fired.current = true;
      onExpire?.();
    }
  }, [remaining, skew, onExpire]);

  const expired = skew !== null && remaining <= 0;
  const urgent = remaining < 5 * 60_000;
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 ${urgent ? "border-amber-300 bg-amber-50" : "border-line bg-brand-soft"}`}>
      <Timer className={`size-6 shrink-0 ${urgent ? "text-amber-700" : "text-brand"}`} aria-hidden="true" />
      <div>
        <p className="text-sm text-ink-soft">{expired ? "Đã hết thời gian giữ phòng" : "Thời gian giữ phòng còn lại"}</p>
        <p className="font-heading text-2xl font-bold tabular-nums text-ink" aria-live="off">
          {skew === null ? "--:--" : formatCountdown(remaining)}
        </p>
        <p className="text-xs text-ink-soft">Hạn thanh toán: {formatDateTime(expiresAt)}</p>
      </div>
    </div>
  );
}
