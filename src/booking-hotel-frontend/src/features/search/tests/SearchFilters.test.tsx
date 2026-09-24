import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FacilityCategoryDto } from "@/types/domain";
import { activeFilterChips, SearchFilters } from "../components/SearchFilters";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const CATS: FacilityCategoryDto[] = [
  {
    id: 1,
    name: "Dịch vụ",
    facilities: [
      { id: 9, name: "Hồ bơi", icon: "waves", categoryId: 1, categoryName: "Dịch vụ" },
      { id: 10, name: "Gym", icon: "dumbbell", categoryId: 1, categoryName: "Dịch vụ" },
    ],
  },
];

describe("activeFilterChips — điều kiện lọc đang bật (không tính sắp xếp)", () => {
  it("mỗi điều kiện 1 chip, bỏ chip → tham số còn lại", () => {
    const p = {
      city: "Cần Thơ",
      checkIn: "2026-10-05",
      checkOut: "2026-10-07",
      guests: "2",
      rooms: "1",
      minPrice: "500000",
      stars: "4,5",
      facilityIds: "9",
      sort: "rating",
    };
    const chips = activeFilterChips(p, CATS);
    expect(chips.map((c) => c.label)).toEqual(["Cần Thơ", "05/10 – 07/10 · 2 khách", "Từ 500.000\u00a0₫", "4 sao", "5 sao", "Hồ bơi"]);
    expect(chips[0]!.next.city).toBeUndefined();
    expect(chips[1]!.next).not.toHaveProperty("checkIn");
    expect(chips[3]!.next.stars).toBe("5");
    expect(chips[5]!.next.facilityIds).toBeUndefined();
    expect(chips.every((c) => c.next.sort === "rating")).toBe(true);
  });

  it("không có điều kiện → không có chip; khách/phòng mặc định không tính", () => {
    expect(activeFilterChips({ guests: "2", rooms: "1", sort: "price,asc" }, CATS)).toEqual([]);
    expect(activeFilterChips({ guests: "4", rooms: "2" }, CATS).map((c) => c.label)).toEqual(["4 khách · 2 phòng"]);
  });
});

describe("SearchFilters — mobile: nút Bộ lọc (n), chip ✕, bottom sheet", () => {
  beforeEach(() => push.mockClear());

  it("hiện số điều kiện và bỏ 1 điều kiện bằng chip", async () => {
    render(<SearchFilters initial={{ city: "Cần Thơ", stars: "5" }} cities={["Cần Thơ"]} categories={CATS} />);
    expect(screen.getByRole("button", { name: "Bộ lọc (2)" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Bỏ lọc 5 sao" }));
    expect(push).toHaveBeenCalledWith("/hotels?city=C%E1%BA%A7n+Th%C6%A1");
  });

  it("mở sheet (dialog modal), khoá cuộn, Esc đóng và trả focus về nút mở", async () => {
    render(<SearchFilters initial={{}} cities={["Cần Thơ"]} categories={CATS} />);
    const open = screen.getByRole("button", { name: "Bộ lọc" });
    await userEvent.click(open);
    const sheet = screen.getByRole("dialog", { name: "Bộ lọc" });
    expect(sheet).toHaveAttribute("aria-modal", "true");
    expect(document.body.style.overflow).toBe("hidden");
    expect(within(sheet).getByLabelText("Thành phố")).toHaveAttribute("id", "fs-city");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
    expect(open).toHaveFocus();
  });

  it("Áp dụng: lỗi giá hiện trong sheet; hợp lệ thì đẩy URL và đóng sheet", async () => {
    render(<SearchFilters initial={{}} cities={["Cần Thơ"]} categories={CATS} />);
    await userEvent.click(screen.getByRole("button", { name: "Bộ lọc" }));
    const sheet = screen.getByRole("dialog");
    await userEvent.type(within(sheet).getByLabelText("Giá từ (₫/đêm)"), "900000");
    await userEvent.type(within(sheet).getByLabelText("Giá đến (₫/đêm)"), "500000");
    await userEvent.click(within(sheet).getByRole("button", { name: "Áp dụng" }));
    expect(within(sheet).getByRole("alert")).toHaveTextContent("Giá tối thiểu không được lớn hơn giá tối đa.");
    expect(push).not.toHaveBeenCalled();

    await userEvent.clear(within(sheet).getByLabelText("Giá đến (₫/đêm)"));
    await userEvent.click(within(sheet).getByLabelText("Hồ bơi"));
    await userEvent.click(within(sheet).getByRole("button", { name: "Áp dụng" }));
    expect(push).toHaveBeenCalledWith("/hotels?guests=2&rooms=1&minPrice=900000&facilityIds=9");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
