import type { Metadata } from "next";
import { BookingDetailView } from "@/features/booking/components/BookingDetailView";
import { firstParam } from "@/lib/utils/query";

export const metadata: Metadata = { title: "Chi tiết đơn đặt phòng", robots: { index: false } };

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** /booking/{code}?key= — trang đơn cho khách, không bắt đăng nhập. */
export default async function BookingPage({ params, searchParams }: Props) {
  const { code } = await params;
  const sp = await searchParams;
  return (
    <BookingDetailView
      code={decodeURIComponent(code)}
      accessKey={firstParam(sp.key) ?? ""}
      paid={firstParam(sp.paid)}
      isNew={firstParam(sp.new) === "1"}
    />
  );
}
