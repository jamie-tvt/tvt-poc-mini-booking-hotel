import type { Role } from "@/types/domain";

export const PORTAL_ROLES: Role[] = ["HOTEL_OWNER", "HOTEL_STAFF"];

export function isPortalRole(role: Role | null | undefined): boolean {
  return !!role && PORTAL_ROLES.includes(role);
}

/** Trang mặc định sau đăng nhập theo vai trò. */
export function homePathForRole(role: Role): string {
  switch (role) {
    case "HOTEL_OWNER":
    case "HOTEL_STAFF":
      return "/portal";
    case "ADMIN":
      return "/admin";
    default:
      return "/";
  }
}

/** Mục chỉ dành cho chủ khách sạn trong Hotel Portal. */
const OWNER_ONLY_PREFIXES = ["/portal/hotels", "/portal/payouts"];

/** Vai trò được vào từng khu vực (guard ở layout client — backend vẫn kiểm tra mọi API). */
export function allowedRolesForPath(pathname: string): Role[] | null {
  if (pathname === "/portal" || pathname.startsWith("/portal/")) {
    return OWNER_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ? ["HOTEL_OWNER"] : PORTAL_ROLES;
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return ["ADMIN"];
  if (pathname.startsWith("/my-bookings")) return ["CUSTOMER"];
  return null;
}
