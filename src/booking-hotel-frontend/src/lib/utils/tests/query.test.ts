import { describe, expect, it } from "vitest";
import { asList, firstParam, safeNextPath, toInt, toQueryString } from "../query";

describe("query helpers", () => {
  it("toQueryString bỏ giá trị rỗng", () => {
    expect(toQueryString({ keyword: "cần thơ", categoryId: "", page: 0, x: undefined, y: null })).toBe(
      "?keyword=c%E1%BA%A7n+th%C6%A1&page=0",
    );
    expect(toQueryString({})).toBe("");
  });

  it("safeNextPath chỉ cho đường dẫn nội bộ", () => {
    expect(safeNextPath("/bookings/3")).toBe("/bookings/3");
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath(undefined, "/manager")).toBe("/manager");
  });

  it("firstParam / toInt / asList", () => {
    expect(firstParam(["a", "b"])).toBe("a");
    expect(firstParam("")).toBeUndefined();
    expect(toInt("2", 0)).toBe(2);
    expect(toInt("-1", 0)).toBe(0);
    expect(toInt("abc", 5)).toBe(5);
    expect(asList([1, 2])).toEqual([1, 2]);
    expect(asList({ content: [3] })).toEqual([3]);
    expect(asList(null)).toEqual([]);
  });
});
