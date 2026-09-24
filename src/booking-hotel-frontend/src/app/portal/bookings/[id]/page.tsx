import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PortalBookingDetail } from "@/features/booking-operations/components/PortalBookingDetail";

export const metadata: Metadata = { title: "Chi tiết đơn" };

export default async function PortalBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <PortalBookingDetail id={id} />;
}
