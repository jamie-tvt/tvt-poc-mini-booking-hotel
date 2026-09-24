import { describe, expect, it } from "vitest";
import { zodFieldErrors } from "@/lib/utils/validation";
import { loginSchema, registerSchema } from "../validators/authSchemas";

const valid = {
  fullName: "Nguyễn Văn Hào",
  email: "hao@example.com",
  password: "12345678",
  confirmPassword: "12345678",
  phone: "0901234567",
};

describe("registerSchema", () => {
  it("chấp nhận dữ liệu hợp lệ và chuẩn hoá", () => {
    const r = registerSchema.safeParse({ ...valid, email: "  hao@example.com ", phone: "0901 234 567" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe("hao@example.com");
      expect(r.data.phone).toBe("0901234567");
    }
  });

  it("số điện thoại bỏ trống thành undefined", () => {
    const r = registerSchema.safeParse({ ...valid, phone: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.phone).toBeUndefined();
  });

  it("báo lỗi từng field bằng tiếng Việt", () => {
    const r = registerSchema.safeParse({ fullName: "A", email: "sai-email", password: "123", confirmPassword: "123", phone: "12ab" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errs = zodFieldErrors(r.error);
      expect(errs.fullName).toBe("Họ tên tối thiểu 2 ký tự.");
      expect(errs.email).toBe("Email không đúng định dạng.");
      expect(errs.password).toBe("Mật khẩu tối thiểu 8 ký tự.");
      expect(errs.phone).toMatch(/Số điện thoại không hợp lệ/);
    }
  });

  it("mật khẩu nhập lại phải khớp", () => {
    const r = registerSchema.safeParse({ ...valid, confirmPassword: "87654321" });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodFieldErrors(r.error).confirmPassword).toBe("Mật khẩu nhập lại không khớp.");
  });

  it("chấp nhận số +84", () => {
    expect(registerSchema.safeParse({ ...valid, phone: "+84901234567" }).success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("bắt buộc email và mật khẩu", () => {
    const r = loginSchema.safeParse({ email: "", password: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errs = zodFieldErrors(r.error);
      expect(errs.email).toBe("Vui lòng nhập email.");
      expect(errs.password).toBe("Vui lòng nhập mật khẩu.");
    }
  });
});
