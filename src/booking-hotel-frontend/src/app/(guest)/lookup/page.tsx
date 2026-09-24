import type { Metadata } from "next";
import { SearchCheck } from "lucide-react";
import { LookupForm } from "@/features/booking/components/LookupForm";
import { firstParam } from "@/lib/utils/query";

export const metadata: Metadata = { title: "Tra cứu đơn đặt phòng" };

export default async function LookupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-[1fr_1fr] md:items-start">
      <div>
        <SearchCheck className="size-10 text-cta" aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Tra cứu đơn đặt phòng</h1>
        <p className="mt-2 text-ink-soft">
          Nhập mã đơn (dạng <span className="font-mono font-semibold text-ink">HB-XXXXXX</span>) và email đã dùng khi đặt để xem trạng thái, thanh toán, huỷ
          hoặc đánh giá kỳ nghỉ. Không cần tài khoản.
        </p>
        <p className="mt-4 rounded-lg border border-line bg-white p-3 text-sm text-ink-soft">
          Đơn mẫu để thử: mã <span className="font-mono font-semibold text-ink">HB-GUEST1</span>, email{" "}
          <span className="font-mono font-semibold text-ink">guest@example.com</span>.
        </p>
      </div>
      <div className="rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
        <LookupForm initialCode={firstParam(sp.code) ?? ""} initialEmail={firstParam(sp.email) ?? ""} />
      </div>
    </div>
  );
}
