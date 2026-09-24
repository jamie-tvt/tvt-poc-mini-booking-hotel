import type { Metadata } from "next";
import { MyBookings } from "@/features/my-bookings/components/MyBookings";

export const metadata: Metadata = { title: "Đơn của tôi" };

export default function MyBookingsPage() {
  return <MyBookings />;
}
