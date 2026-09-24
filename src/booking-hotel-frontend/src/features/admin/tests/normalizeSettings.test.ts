import { describe, expect, it } from "vitest";
import { normalizeSettings } from "../services/adminService";

describe("normalizeSettings", () => {
  it("nhận cả mảng {key,value} lẫn object {key: value}", () => {
    expect(normalizeSettings([{ key: "platform.fee_percent", value: "10" }])).toEqual([{ key: "platform.fee_percent", value: "10" }]);
    expect(normalizeSettings({ "platform.fee_percent": 10, "booking.payment_timeout_minutes": "15" })).toEqual([
      { key: "platform.fee_percent", value: "10" },
      { key: "booking.payment_timeout_minutes", value: "15" },
    ]);
    expect(normalizeSettings(null)).toEqual([]);
  });
});
