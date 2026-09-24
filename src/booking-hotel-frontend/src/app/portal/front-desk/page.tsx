import type { Metadata } from "next";
import { FrontDesk } from "@/features/booking-operations/components/FrontDesk";

export const metadata: Metadata = { title: "Lễ tân" };

export default function FrontDeskPage() {
  return <FrontDesk />;
}
