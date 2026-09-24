import type { Metadata } from "next";
import { PaymentManager } from "@/features/admin/components/PaymentManager";

export const metadata: Metadata = { title: "Thanh toán" };

export default function Page() {
  return <PaymentManager />;
}
