import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StayPicker, stayFromParams, type StayValue } from "../components/StayPicker";

function Harness({ initial, onChange }: { initial?: Partial<StayValue>; onChange?: (v: StayValue) => void }) {
  const [v, setV] = useState<StayValue>({ checkIn: "", checkOut: "", guests: 2, rooms: 1, ...initial });
  return (
    <StayPicker
      idPrefix="t"
      today="2026-10-01"
      value={v}
      onChange={(n) => {
        setV(n);
        onChange?.(n);
      }}
      errors={{}}
    />
  );
}

describe("StayPicker — bộ chọn ngày và khách", () => {
  it("ô ngày có nhãn gắn với input và chặn ngày quá khứ (min)", () => {
    render(<Harness />);
    const checkIn = screen.getByLabelText("Ngày nhận phòng");
    const checkOut = screen.getByLabelText("Ngày trả phòng");
    expect(checkIn).toHaveAttribute("type", "date");
    expect(checkIn).toHaveAttribute("min", "2026-10-01");
    expect(checkOut).toHaveAttribute("min", "2026-10-02");
  });

  it("chọn ngày nhận sau ngày trả → tự dời ngày trả sang hôm sau, hiện số đêm", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial={{ checkIn: "2026-10-05", checkOut: "2026-10-07" }} onChange={onChange} />);
    expect(screen.getByText("2 đêm")).toBeInTheDocument();
    const checkIn = screen.getByLabelText("Ngày nhận phòng");
    await user.clear(checkIn);
    await user.type(checkIn, "2026-10-09");
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ checkIn: "2026-10-09", checkOut: "2026-10-10" }));
    expect(screen.getByLabelText("Ngày trả phòng")).toHaveValue("2026-10-10");
    expect(screen.getByText("1 đêm")).toBeInTheDocument();
  });

  it("nút khách/phòng mở bảng chọn, tăng phòng kéo số khách theo, Esc để đóng", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial={{ guests: 1, rooms: 1 }} onChange={onChange} />);
    const toggle = screen.getByRole("button", { name: "Khách và phòng: 1 khách · 1 phòng" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("button", { name: "Tăng số phòng" }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ rooms: 2, guests: 2 }));
    expect(screen.getByLabelText("Số phòng")).toHaveValue(2);
    expect(screen.getByLabelText("Số khách")).toHaveValue(2);

    await user.click(screen.getByRole("button", { name: "Giảm số khách" }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ rooms: 1, guests: 1 }));

    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Khách và phòng: 1 khách · 1 phòng" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("Số phòng")).not.toBeInTheDocument();
  });

  it("không vượt 5 phòng", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ guests: 5, rooms: 5 }} />);
    await user.click(screen.getByRole("button", { name: /Khách và phòng/ }));
    expect(screen.getByRole("button", { name: "Tăng số phòng" })).toBeDisabled();
  });

  it("hiển thị lỗi dưới ô khi có errors", () => {
    render(
      <StayPicker
        idPrefix="e"
        today="2026-10-01"
        value={{ checkIn: "2026-10-05", checkOut: "2026-10-05", guests: 1, rooms: 1 }}
        onChange={() => {}}
        errors={{ checkOut: "Ngày trả phòng phải sau ngày nhận phòng." }}
      />,
    );
    const checkOut = screen.getByLabelText("Ngày trả phòng");
    expect(checkOut).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Ngày trả phòng phải sau ngày nhận phòng.");
  });

  it("stayFromParams: mặc định 2 khách 1 phòng, bỏ giá trị sai", () => {
    expect(stayFromParams({})).toEqual({ checkIn: "", checkOut: "", guests: 2, rooms: 1 });
    expect(stayFromParams({ guests: "3", rooms: "abc", checkIn: "2026-10-05" })).toEqual({ checkIn: "2026-10-05", checkOut: "", guests: 3, rooms: 1 });
  });
});
