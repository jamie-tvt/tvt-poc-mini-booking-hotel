import type { Metadata } from "next";
import { HotelApproval } from "@/features/admin/components/HotelApproval";
import { firstParam } from "@/lib/utils/query";

export const metadata: Metadata = { title: "Duyệt khách sạn" };

export default async function AdminHotelsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return <HotelApproval initialStatus={firstParam(sp.status)} />;
}
