import type { Metadata } from "next";
import { UserManager } from "@/features/admin/components/UserManager";

export const metadata: Metadata = { title: "Người dùng" };

export default function Page() {
  return <UserManager />;
}
