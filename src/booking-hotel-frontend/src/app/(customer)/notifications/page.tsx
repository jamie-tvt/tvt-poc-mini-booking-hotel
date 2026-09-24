import type { Metadata } from "next";
import { NotificationList } from "@/features/notifications/components/NotificationList";

export const metadata: Metadata = { title: "Thông báo" };

export default function NotificationsPage() {
  return <NotificationList />;
}
