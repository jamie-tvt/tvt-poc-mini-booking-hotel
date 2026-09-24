import type { Metadata } from "next";
import { AdminBookings } from "@/features/admin/components/AdminBookings";

export const metadata: Metadata = { title: "Đơn đặt phòng" };

export default function Page() {
  return <AdminBookings />;
}
