import type { Metadata } from "next";
import { PortalBookingList } from "@/features/booking-operations/components/PortalBookingList";

export const metadata: Metadata = { title: "Đơn đặt phòng" };

export default function PortalBookingsPage() {
  return <PortalBookingList />;
}
