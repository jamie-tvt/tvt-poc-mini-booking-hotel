import type { Metadata } from "next";
import { FacilityManager } from "@/features/admin/components/FacilityManager";

export const metadata: Metadata = { title: "Tiện nghi" };

export default function Page() {
  return <FacilityManager />;
}
