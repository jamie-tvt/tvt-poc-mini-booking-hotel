export const PLACEHOLDER_IMAGE = "/images/hotels/placeholder.svg";
export const ROOM_PLACEHOLDER_IMAGE = "/images/rooms/standard.svg";

const UNSPLASH_HOST = "images.unsplash.com";

/** URL ảnh Unsplash (CDN) theo photo id — cùng dạng với URL lưu trong seed/DB (≤ 255 ký tự). */
export function unsplash(photoId: string): string {
  return `https://${UNSPLASH_HOST}/${photoId}?auto=format&fit=crop&w=1200&q=75`;
}

/**
 * Đổi kích thước ảnh Unsplash qua tham số CDN (w, q), giữ nguyên tham số khác.
 * Ảnh local (/images/*.svg) hoặc URL do chủ khách sạn nhập → trả nguyên.
 */
export function unsplashVariant(url: string, width: number, quality?: number): string;
export function unsplashVariant(url: string | null | undefined, width: number, quality?: number): string | undefined;
export function unsplashVariant(url: string | null | undefined, width: number, quality?: number): string | undefined {
  if (!url) return undefined;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url; // đường dẫn tương đối
  }
  if (u.hostname !== UNSPLASH_HOST) return url;
  u.searchParams.set("w", String(Math.round(width)));
  if (quality !== undefined) u.searchParams.set("q", String(Math.round(quality)));
  return u.toString();
}

/** srcSet "…w=800 800w, …w=1200 1200w" cho ảnh Unsplash; ảnh khác → undefined (dùng src thường). */
export function unsplashSrcSet(url: string | null | undefined, widths: number[]): string | undefined {
  if (!url || unsplashVariant(url, widths[0] ?? 800) === url) return undefined;
  return widths.map((w) => `${unsplashVariant(url, w)} ${w}w`).join(", ");
}

/** Ảnh khách sạn mẫu theo slug (Unsplash License) — trùng URL ảnh bìa trong seed (DemoDataSeeder.java, mock db.ts). */
export const HOTEL_IMAGES = {
  ninhKieu: unsplash("photo-1683617638309-b1fc59c8c7b3"), // Tan Dao
  caiRang: unsplash("photo-1778123178296-fdd5cb2424b5"), // Ahmet Yüksek
  viThanh: unsplash("photo-1619676289827-3b6eefa7ff93"), // Hà Nguyễn
  sunsetBay: unsplash("photo-1783162919371-8d7e9fa65f58"), // Wolfgang Unger
  mekongLotus: unsplash("photo-1784007686796-bcaaf1044000"), // Jamie Trinh
};

/** Ảnh hero trang chủ (Unsplash License) — Nico Smit. */
export const HERO_IMAGE = unsplash("photo-1699086054659-4da0f4f50ece");

/**
 * Ảnh loại phòng theo từ khoá tên (Unsplash License — tác giả ghi cạnh từng ảnh).
 * Mất mạng → HotelImage tự đổi sang ROOM_PLACEHOLDER_IMAGE (SVG local).
 */
export const ROOM_IMAGES: Record<string, string> = {
  standard: unsplash("photo-1631049307264-da0ec9d70304"), // Point3D Commercial Imaging
  superior: unsplash("photo-1618773928121-c32242e63f39"), // Vojtech Bruzek
  deluxe: unsplash("photo-1776763018972-588e27bf6511"), // Antonio Araujo
  suite: unsplash("photo-1631049035634-c04c637651b1"), // Point3D Commercial Imaging
  family: unsplash("photo-1771775529138-a7a20ba7e032"), // Erik Mclean
  garden: unsplash("photo-1611892440504-42a792e24d32"), // visualsofdana
  villa: unsplash("photo-1596178067639-5c6e68aea6dc"), // The Anam
  bungalow: unsplash("photo-1710330758599-c4a3328c4c67"), // XT7 Core
};

/** Ảnh mặc định cho loại phòng theo tên (Deluxe, Family…) khi backend không có imageUrl. */
export function roomImageFor(name: string, imageUrl?: string | null): string {
  if (imageUrl) return imageUrl;
  const n = name.toLowerCase();
  const pick = ["suite", "villa", "bungalow", "family", "garden", "deluxe", "superior"].find((k) => n.includes(k));
  if (pick) return ROOM_IMAGES[pick]!;
  if (n.includes("gia đình")) return ROOM_IMAGES.family!;
  if (n.includes("vườn")) return ROOM_IMAGES.garden!;
  return ROOM_IMAGES.standard!;
}
