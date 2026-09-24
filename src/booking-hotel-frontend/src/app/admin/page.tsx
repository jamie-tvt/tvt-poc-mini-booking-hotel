import type { Metadata } from "next";
import { Dashboard } from "@/features/admin/components/Dashboard";

export const metadata: Metadata = { title: "Tổng quan" };

export default function AdminDashboardPage() {
  return <Dashboard />;
}
