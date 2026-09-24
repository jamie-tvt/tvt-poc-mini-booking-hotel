import { describe, expect, it } from "vitest";
import catalog from "../../../booking-hotel-backend/src/main/resources/seed/mekong-catalog.json";
import { seed } from "./db";

describe("catalog 200 chỗ nghỉ miền Tây trong bản demo offline", () => {
  const now = Date.UTC(2026, 8, 24, 3, 0, 0); // 10:00 giờ VN
  const db = seed(now);

  it("thêm đủ 200 chỗ nghỉ sau 5 khách sạn demo gốc", () => {
    expect(catalog.hotels).toHaveLength(200);
    expect(db.hotels).toHaveLength(205);
    expect(db.hotels.slice(5).map((h) => h.name)).toEqual(catalog.hotels.map((h) => h.name));
    expect(new Set(db.hotels.map((h) => h.city)).size).toBe(13);
  });

  it("chủ cơ sở là tài khoản HOTEL_OWNER mới, khách sạn demo gốc vẫn thuộc owner@example.com", () => {
    const owners = db.users.filter((u) => u.email.startsWith("chunha"));
    expect(owners).toHaveLength(catalog.owners.length);
    expect(owners.every((u) => u.role === "HOTEL_OWNER")).toBe(true);
    const khoa = db.users.find((u) => u.email === "owner@example.com")!;
    expect(db.hotels.filter((h) => h.ownerId === khoa.id)).toHaveLength(3);
  });

  it("mỗi chỗ nghỉ có ảnh Unsplash, loại phòng có ảnh, tiện nghi hợp lệ và phòng không trùng số", () => {
    const facIds = new Set(db.facilities.map((f) => f.id));
    for (const h of db.hotels.slice(5)) {
      expect(h.images.length).toBeGreaterThanOrEqual(3);
      expect(h.images[0]).toBe(h.coverImageUrl);
      expect(h.images.every((u) => u.startsWith("https://images.unsplash.com/photo-"))).toBe(true);
      const types = db.roomTypes.filter((t) => t.hotelId === h.id);
      expect(types.length).toBeGreaterThanOrEqual(2);
      for (const t of types) {
        expect(t.imageUrl).toMatch(/^https:\/\/images\.unsplash\.com\/photo-/);
        expect(t.facilityIds.every((id) => facIds.has(id))).toBe(true);
      }
      const numbers = db.rooms.filter((r) => r.hotelId === h.id).map((r) => r.roomNumber);
      expect(new Set(numbers).size).toBe(numbers.length);
    }
  });

  it("tiện nghi dân dã được thêm, không nhân đôi danh mục", () => {
    expect(new Set(db.facilityCategories.map((c) => c.name)).size).toBe(db.facilityCategories.length);
    expect(db.facilities.map((f) => f.icon)).toEqual(expect.arrayContaining(["bike", "sailboat", "fan", "tree-palm"]));
  });
});
