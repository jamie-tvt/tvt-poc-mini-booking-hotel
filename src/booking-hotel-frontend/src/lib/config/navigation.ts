import type { Role } from "@/types/domain";

export interface NavItem {
  href: string;
  label: string;
  /** khớp chính xác đường dẫn thay vì theo tiền tố */
  exact?: boolean;
}

/** Menu header theo vai trò. */
export function headerNav(role: Role | null): NavItem[] {
  const base: NavItem[] = [{ href: "/hotels", label: "Tìm khách sạn" }];
  switch (role) {
    case "CUSTOMER":
      return [...base, { href: "/my-bookings", label: "Đơn của tôi" }, { href: "/lookup", label: "Tra cứu đơn" }];
    case "HOTEL_OWNER":
    case "HOTEL_STAFF":
      return [...base, { href: "/portal", label: "Cổng khách sạn" }];
    case "ADMIN":
      return [...base, { href: "/admin", label: "Quản trị" }];
    default:
      return [...base, { href: "/lookup", label: "Tra cứu đơn" }];
  }
}

export function portalNav(role: Role | null): NavItem[] {
  const all: (NavItem & { ownerOnly?: boolean })[] = [
    { href: "/portal", label: "Tổng quan hôm nay", exact: true },
    { href: "/portal/front-desk", label: "Lễ tân" },
    { href: "/portal/bookings", label: "Đơn đặt phòng" },
    { href: "/portal/hotels", label: "Khách sạn của tôi", ownerOnly: true },
    { href: "/portal/payouts", label: "Đối soát chi trả", ownerOnly: true },
  ];
  return all.filter((i) => !i.ownerOnly || role === "HOTEL_OWNER").map(({ ownerOnly: _o, ...rest }) => rest);
}

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Tổng quan", exact: true },
  { href: "/admin/hotels", label: "Duyệt khách sạn" },
  { href: "/admin/facilities", label: "Tiện nghi" },
  { href: "/admin/bookings", label: "Đơn đặt phòng" },
  { href: "/admin/payments", label: "Thanh toán" },
  { href: "/admin/payouts", label: "Chi trả khách sạn" },
  { href: "/admin/users", label: "Người dùng" },
  { href: "/admin/settings", label: "Cài đặt" },
  { href: "/admin/audit-logs", label: "Nhật ký hệ thống" },
];

export function isActivePath(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
