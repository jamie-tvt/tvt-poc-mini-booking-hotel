import type { Metadata } from "next";
import { MockGateway } from "@/features/booking/components/MockGateway";
import { firstParam } from "@/lib/utils/query";

export const metadata: Metadata = { title: "Cổng thanh toán giả lập", robots: { index: false } };

type Props = {
  params: Promise<{ paymentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MockPayPage({ params, searchParams }: Props) {
  const { paymentId } = await params;
  const sp = await searchParams;
  return <MockGateway paymentId={paymentId} accessKey={firstParam(sp.key) ?? ""} />;
}
