import { z } from "zod";

const email = z
  .string()
  .trim()
  .min(1, { error: "Vui lòng nhập email." })
  .pipe(z.email({ error: "Email không đúng định dạng." }));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "Vui lòng nhập mật khẩu." }),
});
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Số điện thoại Việt Nam, bắt đầu bằng 0 hoặc +84:
 * di động 10 số (đầu 3, 5, 7, 8, 9 — VD 0901234567) hoặc cố định 11 số (đầu 2 — VD 02923812345).
 */
export const VN_PHONE_REGEX = /^(0|\+84)(?:[35789]\d{8}|2\d{9})$/;

/** Bỏ khoảng trắng, dấu chấm, gạch ngang; đổi +84 thành 0 (backend lưu dạng 0xxxxxxxxx). */
export function normalizePhone(v: string): string {
  return v.replace(/[\s.\-()]/g, "").replace(/^\+84/, "0");
}

export const optionalPhone = z
  .string()
  .trim()
  .refine((v) => v === "" || VN_PHONE_REGEX.test(normalizePhone(v)), {
    error: "Số điện thoại không hợp lệ (VD 0901234567).",
  })
  .transform((v) => (v === "" ? undefined : normalizePhone(v)));

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, { error: "Họ tên tối thiểu 2 ký tự." })
      .max(100, { error: "Họ tên tối đa 100 ký tự." }),
    email,
    password: z
      .string()
      .min(8, { error: "Mật khẩu tối thiểu 8 ký tự." })
      .max(100, { error: "Mật khẩu tối đa 100 ký tự." }),
    confirmPassword: z.string().min(1, { error: "Vui lòng nhập lại mật khẩu." }),
    phone: optionalPhone,
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    error: "Mật khẩu nhập lại không khớp.",
  });
export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterPayload = z.output<typeof registerSchema>;

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { error: "Họ tên tối thiểu 2 ký tự." })
    .max(100, { error: "Họ tên tối đa 100 ký tự." }),
  phone: optionalPhone,
});
export type ProfileInput = z.input<typeof profileSchema>;
