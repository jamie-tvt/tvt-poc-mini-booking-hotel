import type { Metadata } from "next";
import { PayoutList } from "@/features/payout/components/PayoutList";

export const metadata: Metadata = { title: "Chi trả khách sạn" };

export default function Page() {
  return <PayoutList mode="admin" />;
}
