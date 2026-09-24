import type { Metadata } from "next";
import { PortalOverview } from "@/features/booking-operations/components/PortalOverview";

export const metadata: Metadata = { title: "Cổng khách sạn" };

export default function PortalHomePage() {
  return <PortalOverview />;
}
