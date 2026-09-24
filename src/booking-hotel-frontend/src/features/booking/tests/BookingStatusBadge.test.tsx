import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BookingStatusBadge, HotelStatusBadge, PaymentStatusBadge, PayoutStatusBadge } from "../components/BookingStatusBadge";

describe("BookingStatusBadge", () => {
  it.each([
    ["PENDING", "Chờ thanh toán"],
    ["CONFIRMED", "Đã xác nhận"],
    ["CHECKED_IN", "Đang lưu trú"],
    ["CHECKED_OUT", "Đã trả phòng"],
    ["CANCELLED", "Đã huỷ"],
    ["EXPIRED", "Hết hạn giữ phòng"],
    ["NO_SHOW", "Không đến"],
  ] as const)("%s hiển thị chữ “%s” (không chỉ dựa vào màu)", (status, label) => {
    render(<BookingStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("trạng thái khác nhóm có màu khác nhau", () => {
    const { rerender } = render(<BookingStatusBadge status="PENDING" />);
    const pending = screen.getByText("Chờ thanh toán").className;
    rerender(<BookingStatusBadge status="CANCELLED" />);
    const cancelled = screen.getByText("Đã huỷ").className;
    rerender(<BookingStatusBadge status="CHECKED_IN" />);
    const checkedIn = screen.getByText("Đang lưu trú").className;
    expect(new Set([pending, cancelled, checkedIn]).size).toBe(3);
  });

  it("badge thanh toán, khách sạn, chi trả", () => {
    render(
      <>
        <PaymentStatusBadge status="REFUNDED" />
        <HotelStatusBadge status="PENDING_APPROVAL" />
        <PayoutStatusBadge status="PAID" />
      </>,
    );
    expect(screen.getByText("Đã hoàn tiền")).toBeInTheDocument();
    expect(screen.getByText("Chờ duyệt")).toBeInTheDocument();
    expect(screen.getByText("Đã chi trả")).toBeInTheDocument();
  });
});
