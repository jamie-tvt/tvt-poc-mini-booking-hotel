import type { Metadata } from "next";
import { AuditLogTable } from "@/features/admin/components/AuditLogTable";

export const metadata: Metadata = { title: "Nhật ký hệ thống" };

export default function Page() {
  return <AuditLogTable />;
}
