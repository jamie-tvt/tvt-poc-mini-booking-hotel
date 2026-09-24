import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HotelEditor } from "@/features/hotel-management/components/HotelEditor";

export const metadata: Metadata = { title: "Quản lý khách sạn" };

export default async function PortalHotelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <HotelEditor id={Number(id)} />;
}
