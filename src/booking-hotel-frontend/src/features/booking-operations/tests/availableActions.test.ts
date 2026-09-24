import { describe, expect, it } from "vitest";
import type { BookingDto } from "@/types/domain";
import { availableActions } from "../components/BookingActions";

const base = { checkIn: "2026-10-05", checkOut: "2026-10-07" } as BookingDto;

describe("nút lễ tân theo trạng thái và ngày", () => {
  it("CONFIRMED: nhận phòng từ ngày nhận; không đến từ ngày nhận + 1", () => {
    const b = { ...base, status: "CONFIRMED" } as BookingDto;
    expect(availableActions(b, "2026-10-04")).toEqual([]);
    expect(availableActions(b, "2026-10-05")).toEqual(["check-in"]);
    expect(availableActions(b, "2026-10-06")).toEqual(["check-in", "no-show"]);
    // từ ngày trả phòng không nhận phòng được nữa, chỉ còn "không đến"
    expect(availableActions(b, "2026-10-07")).toEqual(["no-show"]);
  });

  it("CHECKED_IN: chỉ trả phòng; trạng thái cuối không có nút", () => {
    expect(availableActions({ ...base, status: "CHECKED_IN" } as BookingDto, "2026-10-06")).toEqual(["check-out"]);
    for (const s of ["PENDING", "CHECKED_OUT", "CANCELLED", "EXPIRED", "NO_SHOW"] as const) {
      expect(availableActions({ ...base, status: s } as BookingDto, "2026-10-06")).toEqual([]);
    }
  });
});
