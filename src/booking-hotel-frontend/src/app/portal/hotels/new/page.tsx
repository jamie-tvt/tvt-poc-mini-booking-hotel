import type { Metadata } from "next";
import { NewHotel } from "@/features/hotel-management/components/NewHotel";

export const metadata: Metadata = { title: "Đăng ký khách sạn mới" };

export default function NewHotelPage() {
  return <NewHotel />;
}
