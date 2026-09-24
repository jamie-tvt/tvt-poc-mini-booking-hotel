export const PLACEHOLDER_IMAGE = "/images/hotels/placeholder.svg";
export const ROOM_PLACEHOLDER_IMAGE = "/images/rooms/standard.svg";

/** Ảnh mặc định cho loại phòng theo tên (Deluxe, Family…) khi backend không có imageUrl. */
export function roomImageFor(name: string, imageUrl?: string | null): string {
  if (imageUrl) return imageUrl;
  const n = name.toLowerCase();
  const pick = ["suite", "villa", "bungalow", "family", "garden", "deluxe", "superior"].find((k) => n.includes(k));
  if (pick) return `/images/rooms/${pick}.svg`;
  if (n.includes("gia đình")) return "/images/rooms/family.svg";
  if (n.includes("vườn")) return "/images/rooms/garden.svg";
  return "/images/rooms/standard.svg";
}
