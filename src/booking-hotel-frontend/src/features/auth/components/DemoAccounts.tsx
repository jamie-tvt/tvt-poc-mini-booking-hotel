"use client";

import Link from "next/link";
import { KeyRound, SearchCheck } from "lucide-react";
import { ROLE_LABEL } from "@/lib/utils/labels";
import type { Role } from "@/types/domain";

export const DEMO_PASSWORD = "12345678";

/** Tài khoản mẫu theo hợp đồng API §6. */
export const DEMO_ACCOUNTS: { email: string; role: Role; name?: string; note?: string }[] = [
  { email: "customer@example.com", role: "CUSTOMER", name: "Nguyễn Văn Hào", note: "có đơn đã xác nhận, đơn chờ đánh giá" },
  { email: "mai.tran@example.com", role: "CUSTOMER" },
  { email: "owner@example.com", role: "HOTEL_OWNER", name: "Trần Minh Khoa", note: "2 khách sạn Cần Thơ + 1 chờ duyệt" },
  { email: "owner2@example.com", role: "HOTEL_OWNER", name: "Lê Thị Thu", note: "Hậu Giang, Phú Quốc" },
  { email: "staff@example.com", role: "HOTEL_STAFF", name: "Phạm Văn Lộc", note: "lễ tân Ninh Kiều Riverside" },
  { email: "admin@example.com", role: "ADMIN" },
];

export const DEMO_GUEST = { bookingCode: "HB-GUEST1", email: "guest@example.com" };

export function DemoAccounts({ onPick }: { onPick: (email: string, password: string) => void }) {
  return (
    <section aria-labelledby="demo-heading" className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <h2 id="demo-heading" className="flex items-center gap-2 text-lg font-bold">
        <KeyRound className="size-5 text-cta" aria-hidden="true" /> Tài khoản demo
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Mật khẩu chung: <code className="rounded bg-muted px-1.5 py-0.5 font-semibold text-ink">{DEMO_PASSWORD}</code>
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {DEMO_ACCOUNTS.map((a) => (
          <li key={a.email} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-bg px-3 py-2">
            <div className="min-w-0">
              <p className="break-all text-sm font-semibold text-ink">{a.email}</p>
              <p className="text-xs text-ink-soft">
                {ROLE_LABEL[a.role]}
                {a.name ? ` · ${a.name}` : ""}
                {a.note ? ` · ${a.note}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onPick(a.email, DEMO_PASSWORD)}
              aria-label={`Điền nhanh tài khoản ${a.email}`}
              className="min-h-9 rounded-lg border border-brand px-3 text-xs font-semibold text-brand transition-colors duration-200 hover:bg-brand-soft"
            >
              Điền nhanh
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 rounded-lg border border-cta/40 bg-cta-soft p-3 text-sm">
        <p className="flex items-center gap-2 font-semibold text-cta-ink">
          <SearchCheck className="size-4" aria-hidden="true" /> Khách vãng lai (không cần tài khoản)
        </p>
        <p className="mt-1 text-ink">
          Tra cứu đơn mẫu bằng mã <code className="font-mono font-semibold">{DEMO_GUEST.bookingCode}</code> và email{" "}
          <code className="font-mono font-semibold">{DEMO_GUEST.email}</code>.
        </p>
        <Link
          href={`/lookup?code=${DEMO_GUEST.bookingCode}&email=${encodeURIComponent(DEMO_GUEST.email)}`}
          className="mt-2 inline-flex min-h-9 items-center rounded-lg font-semibold text-brand underline underline-offset-4 hover:text-brand-hover"
        >
          Tra cứu đơn khách vãng lai
        </Link>
      </div>
    </section>
  );
}
