import { describe, expect, it } from "vitest";
import { zodFieldErrors } from "@/lib/utils/validation";
import { createCheckoutSchema, lookupSchema } from "../validators/checkoutSchema";

const today = "2026-10-01";
const schema = createCheckoutSchema({ today, capacity: 2 });
const valid = {
  roomTypeId: 7,
  checkIn: "2026-10-05",
  checkOut: "2026-10-07",
  roomsCount: 1,
  guests: 2,
  guestName: "Nguyễn Văn Hào",
  guestEmail: "hao@example.com",
  guestPhone: "0901234567",
  note: "",
};

function errorsOf(input: unknown) {
  const r = schema.safeParse(input);
  expect(r.success).toBe(false);
  return r.success ? {} : zodFieldErrors(r.error);
}

describe("createCheckoutSchema", () => {
  it("hợp lệ và chuẩn hoá SĐT, email, ghi chú rỗng", () => {
    const r = schema.safeParse({ ...valid, guestEmail: "  hao@example.com ", guestPhone: "090 123.4567" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.guestEmail).toBe("hao@example.com");
      expect(r.data.guestPhone).toBe("0901234567");
      expect(r.data.note).toBeUndefined();
    }
  });

  it("ngày trả phải sau ngày nhận", () => {
    expect(errorsOf({ ...valid, checkOut: "2026-10-05" }).checkOut).toBe("Ngày trả phòng phải sau ngày nhận phòng.");
    expect(errorsOf({ ...valid, checkOut: "2026-10-03" }).checkOut).toBe("Ngày trả phòng phải sau ngày nhận phòng.");
  });

  it("không nhận phòng ở quá khứ, tối đa 30 đêm, ngày phải đúng định dạng", () => {
    expect(errorsOf({ ...valid, checkIn: "2026-09-30" }).checkIn).toBe("Ngày nhận phòng không được ở quá khứ.");
    expect(errorsOf({ ...valid, checkOut: "2026-11-10" }).checkOut).toBe("Mỗi lần đặt tối đa 30 đêm.");
    expect(errorsOf({ ...valid, checkIn: "05/10/2026" }).checkIn).toBe("Ngày nhận phòng không hợp lệ.");
  });

  it("email bắt buộc và đúng định dạng", () => {
    expect(errorsOf({ ...valid, guestEmail: "" }).guestEmail).toBe("Vui lòng nhập email để nhận mã đơn.");
    expect(errorsOf({ ...valid, guestEmail: "hao@" }).guestEmail).toBe("Email không đúng định dạng.");
  });

  it.each(["0901234567", "+84901234567", "0351234567", "02923812345"])("SĐT Việt Nam hợp lệ: %s", (phone) => {
    expect(schema.safeParse({ ...valid, guestPhone: phone }).success).toBe(true);
  });

  it.each(["", "12345", "0101234567", "090123456", "09012345678", "abc0901234"])("SĐT không hợp lệ: “%s”", (phone) => {
    expect(errorsOf({ ...valid, guestPhone: phone }).guestPhone).toMatch(/số điện thoại/i);
  });

  it("họ tên tối thiểu 2 ký tự", () => {
    expect(errorsOf({ ...valid, guestName: " A " }).guestName).toBe("Họ tên tối thiểu 2 ký tự.");
  });

  it("số khách ≤ sức chứa × số phòng, ≥ số phòng; số phòng 1–5", () => {
    expect(errorsOf({ ...valid, guests: 3 }).guests).toBe("1 phòng chỉ chứa tối đa 2 khách.");
    expect(schema.safeParse({ ...valid, guests: 3, roomsCount: 2 }).success).toBe(true);
    expect(errorsOf({ ...valid, guests: 1, roomsCount: 2 }).guests).toBe("Số khách phải lớn hơn hoặc bằng số phòng.");
    expect(errorsOf({ ...valid, roomsCount: 6, guests: 6 }).roomsCount).toBe("Tối đa 5 phòng mỗi đơn.");
  });
});

describe("lookupSchema", () => {
  it("mã đơn viết hoa, dạng HB-XXXXXX", () => {
    const r = lookupSchema.safeParse({ bookingCode: " hb-guest1 ", email: "guest@example.com" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.bookingCode).toBe("HB-GUEST1");
    const bad = lookupSchema.safeParse({ bookingCode: "12345", email: "x" });
    expect(bad.success).toBe(false);
    if (!bad.success) {
      const e = zodFieldErrors(bad.error);
      expect(e.bookingCode).toBe("Mã đơn có dạng HB-XXXXXX.");
      expect(e.email).toBe("Email không đúng định dạng.");
    }
  });
});
