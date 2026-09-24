import type { Metadata } from "next";
import { PortalHotelList } from "@/features/hotel-management/components/PortalHotelList";
import { firstParam } from "@/lib/utils/query";

export const metadata: Metadata = { title: "Khách sạn của tôi" };

export default async function PortalHotelsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return <PortalHotelList created={firstParam(sp.created) === "1"} />;
}
