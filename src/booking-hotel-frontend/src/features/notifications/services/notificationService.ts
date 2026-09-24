import { api } from "@/lib/api/client";
import type { PageResponse } from "@/types/api";
import type { NotificationDto } from "@/types/domain";

/** Phát khi danh sách thông báo thay đổi để chuông cập nhật số chưa đọc. */
export const NOTIFICATIONS_CHANGED_EVENT = "hb:notifications-changed";

export function notifyNotificationsChanged(): void {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}

export const notificationService = {
  list: (page: number, size = 20) => api.get<PageResponse<NotificationDto>>("/notifications", { page, size }),
  unreadCount: () => api.get<{ count: number }>("/notifications/unread-count"),
  markRead: (id: number) => api.put<unknown>(`/notifications/${id}/read`),
  markAllRead: () => api.put<unknown>("/notifications/read-all"),
};
