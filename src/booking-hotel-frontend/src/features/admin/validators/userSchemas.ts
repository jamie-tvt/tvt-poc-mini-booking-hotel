import { z } from "zod";
import { optionalPhone } from "@/features/auth/validators/authSchemas";

/** Admin tạo tài khoản khách hàng / chủ khách sạn / quản trị (nhân viên khách sạn do chủ khách sạn tạo trong Portal). */
const role = z.enum(["CUSTOMER", "HOTEL_OWNER", "ADMIN"], { error: "Vui lòng chọn vai trò." });

export const createUserSchema = z.object({
  fullName: z.string().trim().min(2, { error: "Họ tên tối thiểu 2 ký tự." }).max(100),
  email: z.string().trim().pipe(z.email({ error: "Email không đúng định dạng." })),
  password: z.string().min(8, { error: "Mật khẩu tối thiểu 8 ký tự." }),
  phone: optionalPhone,
  role,
});
export type CreateUserValues = z.input<typeof createUserSchema>;
