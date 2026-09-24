import { describe, expect, it } from "vitest";
import { ROOM_IMAGES, roomImageFor, unsplash, unsplashSrcSet, unsplashVariant } from "../images";

const SEED = "https://images.unsplash.com/photo-1683617638309-b1fc59c8c7b3?auto=format&fit=crop&w=1200&q=75";

describe("unsplashVariant", () => {
  it("đổi w (và q) của ảnh Unsplash, giữ các tham số khác", () => {
    expect(unsplashVariant(SEED, 800)).toBe("https://images.unsplash.com/photo-1683617638309-b1fc59c8c7b3?auto=format&fit=crop&w=800&q=75");
    expect(unsplashVariant(SEED, 64, 40)).toBe(
      "https://images.unsplash.com/photo-1683617638309-b1fc59c8c7b3?auto=format&fit=crop&w=64&q=40",
    );
  });

  it("thêm w nếu URL Unsplash chưa có tham số", () => {
    expect(unsplashVariant("https://images.unsplash.com/photo-1", 1200)).toBe("https://images.unsplash.com/photo-1?w=1200");
  });

  it("ảnh local / host khác / rỗng → trả nguyên", () => {
    expect(unsplashVariant("/images/hotels/sunset-bay.svg", 800)).toBe("/images/hotels/sunset-bay.svg");
    expect(unsplashVariant("https://example.com/a.jpg?w=10", 800)).toBe("https://example.com/a.jpg?w=10");
    expect(unsplashVariant(null, 800)).toBeUndefined();
    expect(unsplashVariant("", 800)).toBeUndefined();
  });

  it("URL seed ≤ 255 ký tự (cột VARCHAR(255))", () => {
    expect(unsplash("photo-1683617638309-b1fc59c8c7b3")).toBe(SEED);
    for (const url of Object.values(ROOM_IMAGES)) expect(url.length).toBeLessThanOrEqual(255);
  });
});

describe("unsplashSrcSet", () => {
  it("tạo srcSet cho ảnh Unsplash, bỏ qua ảnh khác", () => {
    expect(unsplashSrcSet(SEED, [800, 1200])).toBe(
      "https://images.unsplash.com/photo-1683617638309-b1fc59c8c7b3?auto=format&fit=crop&w=800&q=75 800w, " +
        "https://images.unsplash.com/photo-1683617638309-b1fc59c8c7b3?auto=format&fit=crop&w=1200&q=75 1200w",
    );
    expect(unsplashSrcSet("/images/hotels/placeholder.svg", [800, 1200])).toBeUndefined();
    expect(unsplashSrcSet(undefined, [800])).toBeUndefined();
  });
});

describe("roomImageFor", () => {
  it("chọn ảnh theo từ khoá tên loại phòng", () => {
    expect(roomImageFor("Deluxe hướng sông")).toBe(ROOM_IMAGES.deluxe);
    expect(roomImageFor("Garden Villa")).toBe(ROOM_IMAGES.villa);
    expect(roomImageFor("Phòng vườn")).toBe(ROOM_IMAGES.garden);
    expect(roomImageFor("Phòng gia đình")).toBe(ROOM_IMAGES.family);
    expect(roomImageFor("Standard")).toBe(ROOM_IMAGES.standard);
  });

  it("ưu tiên imageUrl do chủ khách sạn nhập", () => {
    expect(roomImageFor("Deluxe", "/images/rooms/suite.svg")).toBe("/images/rooms/suite.svg");
  });
});
