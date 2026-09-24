import { z } from "zod";
import { optionalPhone } from "@/features/auth/validators/authSchemas";
import { isValidYmd } from "@/lib/utils/stay";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v), { error: "Đường dẫn ảnh phải bắt đầu bằng / hoặc http(s)://" })
  .transform((v) => (v === "" ? undefined : v));

export const hotelSchema = z.object({
  name: z.string().trim().min(3, { error: "Tên khách sạn tối thiểu 3 ký tự." }).max(150, { error: "Tên tối đa 150 ký tự." }),
  city: z.string().trim().min(2, { error: "Vui lòng nhập thành phố." }).max(100),
  address: z.string().trim().min(5, { error: "Vui lòng nhập địa chỉ đầy đủ." }).max(255),
  description: z.string().trim().min(20, { error: "Mô tả tối thiểu 20 ký tự." }).max(4000, { error: "Mô tả tối đa 4000 ký tự." }),
  starRating: z.number({ error: "Chọn hạng sao." }).int().min(1, { error: "Hạng sao từ 1 đến 5." }).max(5, { error: "Hạng sao từ 1 đến 5." }),
  phone: optionalPhone,
  checkInTime: z.string().regex(TIME, { error: "Giờ không hợp lệ (HH:mm)." }),
  checkOutTime: z.string().regex(TIME, { error: "Giờ không hợp lệ (HH:mm)." }),
  coverImageUrl: optionalUrl,
});
export type HotelFormValues = z.input<typeof hotelSchema>;

export const roomTypeSchema = z
  .object({
    name: z.string().trim().min(2, { error: "Tên loại phòng tối thiểu 2 ký tự." }).max(100),
    description: z.string().trim().min(5, { error: "Vui lòng nhập mô tả loại phòng." }).max(2000, { error: "Mô tả tối đa 2000 ký tự." }),
    capacity: z.number({ error: "Sức chứa không hợp lệ." }).int().min(1, { error: "Sức chứa tối thiểu 1 khách." }).max(20, { error: "Sức chứa tối đa 20 khách." }),
    bedInfo: z.string().trim().min(2, { error: "Vui lòng mô tả giường (VD 1 giường đôi)." }).max(100),
    areaM2: z.number({ error: "Diện tích không hợp lệ." }).int({ error: "Diện tích là số nguyên (m²)." }).min(5, { error: "Diện tích tối thiểu 5 m²." }).max(1000),
    basePrice: z
      .number({ error: "Giá không hợp lệ." })
      .int({ error: "Giá phải là số nguyên (VND)." })
      .min(50_000, { error: "Giá cơ bản tối thiểu 50.000 ₫/đêm." }),
    cancellationPolicy: z.enum(["FREE_BEFORE_DATE", "NON_REFUNDABLE"], { error: "Chọn chính sách huỷ." }),
    freeCancelDays: z.number().int().min(0).max(60).optional(),
    imageUrl: optionalUrl,
    facilityIds: z.array(z.number().int().positive()),
  })
  .superRefine((v, ctx) => {
    if (v.cancellationPolicy === "FREE_BEFORE_DATE" && (v.freeCancelDays === undefined || v.freeCancelDays < 1)) {
      ctx.addIssue({ code: "custom", path: ["freeCancelDays"], message: "Nhập số ngày được huỷ miễn phí (≥ 1)." });
    }
  })
  .transform((v) => ({ ...v, freeCancelDays: v.cancellationPolicy === "FREE_BEFORE_DATE" ? v.freeCancelDays : undefined }));

export const priceSchema = z
  .object({
    from: z.string().refine(isValidYmd, { error: "Chọn ngày bắt đầu." }),
    to: z.string().refine(isValidYmd, { error: "Chọn ngày kết thúc." }),
    price: z.number({ error: "Giá không hợp lệ." }).int({ error: "Giá phải là số nguyên (VND)." }).min(50_000, { error: "Giá tối thiểu 50.000 ₫/đêm." }),
  })
  .refine((v) => v.to >= v.from, { path: ["to"], error: "Ngày kết thúc phải từ ngày bắt đầu trở đi." });

export const staffSchema = z.object({
  fullName: z.string().trim().min(2, { error: "Họ tên tối thiểu 2 ký tự." }).max(100),
  email: z.string().trim().pipe(z.email({ error: "Email không đúng định dạng." })),
  password: z.string().min(8, { error: "Mật khẩu tối thiểu 8 ký tự." }),
  phone: optionalPhone,
});
