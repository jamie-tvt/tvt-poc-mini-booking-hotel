import type { Metadata } from "next";
import { PayoutList } from "@/features/payout/components/PayoutList";

export const metadata: Metadata = { title: "Đối soát chi trả" };

export default function PortalPayoutsPage() {
  return <PayoutList mode="portal" />;
}
