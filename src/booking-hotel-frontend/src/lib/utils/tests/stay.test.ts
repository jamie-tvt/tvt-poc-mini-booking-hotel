import { describe, expect, it } from "vitest";
import {
  addDays,
  cancellationLabel,
  freeCancelBefore,
  isValidYmd,
  nightsBetween,
  priceBreakdown,
  stayNights,
  validateStay,
} from "../stay";

describe("tính số đêm", () => {
  it("số đêm = ngày trả − ngày nhận", () => {
    expect(nightsBetween("2026-10-05", "2026-10-07")).toBe(2);
    expect(nightsBetween("2026-10-05", "2026-10-06")).toBe(1);
  });

  it("qua tháng, qua năm, năm nhuận", () => {
    expect(nightsBetween("2026-10-30", "2026-11-02")).toBe(3);
    expect(nightsBetween("2026-12-30", "2027-01-02")).toBe(3);
    expect(nightsBetween("2028-02-28", "2028-03-01")).toBe(2);
  });

  it("trả ≤ nhận hoặc ngày sai → 0", () => {
    expect(nightsBetween("2026-10-05", "2026-10-05")).toBe(0);
    expect(nightsBetween("2026-10-07", "2026-10-05")).toBe(0);
    expect(nightsBetween("2026-02-30", "2026-03-02")).toBe(0);
    expect(nightsBetween("", "2026-10-05")).toBe(0);
  });

  it("addDays, stayNights, isValidYmd", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-10-01", -1)).toBe("2026-09-30");
    expect(stayNights("2026-10-05", "2026-10-08")).toEqual(["2026-10-05", "2026-10-06", "2026-10-07"]);
    expect(isValidYmd("2026-02-29")).toBe(false);
    expect(isValidYmd("2028-02-29")).toBe(true);
  });
});

describe("validateStay", () => {
  const today = "2026-10-01";
  const ok = { checkIn: "2026-10-05", checkOut: "2026-10-07", guests: 2, rooms: 1 };

  it("hợp lệ", () => {
    expect(validateStay(ok, today)).toEqual({});
    expect(validateStay({ ...ok, checkIn: today, checkOut: "2026-10-02" }, today)).toEqual({});
  });

  it("ngày trả phải sau ngày nhận", () => {
    expect(validateStay({ ...ok, checkOut: "2026-10-05" }, today).checkOut).toBe("Ngày trả phòng phải sau ngày nhận phòng.");
    expect(validateStay({ ...ok, checkOut: "2026-10-04" }, today).checkOut).toBe("Ngày trả phòng phải sau ngày nhận phòng.");
  });

  it("không nhận phòng ở quá khứ, tối đa 30 đêm", () => {
    expect(validateStay({ ...ok, checkIn: "2026-09-30" }, today).checkIn).toBe("Ngày nhận phòng không được ở quá khứ.");
    expect(validateStay({ ...ok, checkOut: "2026-11-05" }, today).checkOut).toBe("Mỗi lần đặt tối đa 30 đêm.");
  });

  it("bắt buộc ngày khi requireDates, cho phép bỏ trống khi tìm chung", () => {
    const empty = { ...ok, checkIn: "", checkOut: "" };
    expect(validateStay(empty, today).checkIn).toBe("Vui lòng chọn ngày nhận phòng.");
    expect(validateStay(empty, today, false)).toEqual({});
    expect(validateStay({ ...empty, checkIn: "2026-10-05" }, today, false).checkOut).toBe("Vui lòng chọn ngày trả phòng.");
  });

  it("số phòng 1–5, số khách ≥ số phòng", () => {
    expect(validateStay({ ...ok, rooms: 6, guests: 6 }, today).rooms).toBe("Số phòng từ 1 đến 5.");
    expect(validateStay({ ...ok, rooms: 3, guests: 2 }, today).guests).toBe("Số khách phải lớn hơn hoặc bằng số phòng.");
    expect(validateStay({ ...ok, guests: 0 }, today).guests).toBe("Cần ít nhất 1 khách.");
  });
});

describe("chính sách huỷ", () => {
  it("huỷ trước ≥ N ngày được miễn phí → 'trước' ngày (checkIn − N + 1)", () => {
    // nhận 10/10, N = 3: hạn cuối 07/10 → hiển thị "trước 08/10"
    expect(freeCancelBefore("2026-10-10", 3)).toBe("2026-10-08");
    expect(cancellationLabel("FREE_BEFORE_DATE", 3, "2026-10-10", "2026-10-01")).toBe("Miễn phí huỷ trước 08/10");
  });

  it("đã qua hạn huỷ miễn phí", () => {
    expect(cancellationLabel("FREE_BEFORE_DATE", 3, "2026-10-10", "2026-10-08")).toBe("Đã qua hạn huỷ miễn phí — huỷ không hoàn tiền");
  });

  it("chưa chọn ngày / không hoàn tiền", () => {
    expect(cancellationLabel("FREE_BEFORE_DATE", 2)).toBe("Miễn phí huỷ trước ngày nhận phòng 2 ngày");
    expect(cancellationLabel("NON_REFUNDABLE", null, "2026-10-10")).toBe("Không hoàn tiền");
  });
});

describe("priceBreakdown", () => {
  const nightly = [
    { date: "2026-10-05", listingPrice: 1_210_000, basePrice: 1_100_000 },
    { date: "2026-10-06", listingPrice: 1_320_000, basePrice: 1_200_000 },
  ];

  it("tổng = Σ giá niêm yết các đêm × số phòng; tách phí theo giá cơ bản từng đêm (nếu backend trả)", () => {
    const r = priceBreakdown(nightly, 2, 1_100_000);
    expect(r.total).toBe((1_210_000 + 1_320_000) * 2);
    expect(r.base).toBe((1_100_000 + 1_200_000) * 2);
    expect(r.fee).toBe(r.total - (r.base ?? 0));
    expect(r.nights).toHaveLength(2);
  });

  it("giá các đêm khác nhau mà không có giá cơ bản từng đêm (có thể là giá riêng theo ngày) → không tách", () => {
    const r = priceBreakdown(
      [
        { date: "2026-10-05", listingPrice: 1_210_000 },
        { date: "2026-10-06", listingPrice: 1_650_000 },
      ],
      1,
      1_100_000,
    );
    expect(r.total).toBe(2_860_000);
    expect(r.base).toBeNull();
  });

  it("cùng giá mọi đêm → tách theo giá cơ bản của loại phòng", () => {
    const r = priceBreakdown(
      [
        { date: "2026-10-05", listingPrice: 1_210_000 },
        { date: "2026-10-06", listingPrice: 1_210_000 },
      ],
      1,
      1_100_000,
    );
    expect(r.base).toBe(2_200_000);
    expect(r.fee).toBe(220_000);
  });

  it("không tách được (giá cơ bản > giá niêm yết) → base/fee null", () => {
    const r = priceBreakdown([{ date: "2026-10-05", listingPrice: 500_000 }], 1, 900_000);
    expect(r.total).toBe(500_000);
    expect(r.base).toBeNull();
    expect(r.fee).toBeNull();
  });

  it("chưa có giá từng đêm → dùng stayTotal", () => {
    expect(priceBreakdown(null, 1, 900_000, 2_000_000).total).toBe(2_000_000);
  });
});
