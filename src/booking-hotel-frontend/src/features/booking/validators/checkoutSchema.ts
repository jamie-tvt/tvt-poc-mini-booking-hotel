import { z } from "zod";
import { normalizePhone, VN_PHONE_REGEX } from "@/features/auth/validators/authSchemas";
import { MAX_NIGHTS, MAX_ROOMS } from "@/lib/config/env";
import { isValidYmd, nightsBetween } from "@/lib/utils/stay";

const ymd = (label: string) =>
  z.string({ error: `Vui lòng chọn ${label}.` }).refine(isValidYmd, { error: `${label[0]!.toUpperCase()}${label.slice(1)} không hợp lệ.` });

/**
 * Checkout khách vãng lai (POST /bookings): thông tin khách + khoảng ngày.
 * `today` để chặn ngày nhận ở quá khứ; `capacity` (sức chứa/phòng) để chặn guests > capacity × số phòng.
 */
export function createCheckoutSchema({ today, capacity }: { today: string; capacity?: number }) {
  return z
    .object({
      roomTypeId: z.number({ error: "Thiếu loại phòng." }).int().positive({ error: "Thiếu loại phòng." }),
      checkIn: ymd("ngày nhận phòng"),
      checkOut: ymd("ngày trả phòng"),
      roomsCount: z
        .number({ error: "Số phòng không hợp lệ." })
        .int({ error: "Số phòng phải là số nguyên." })
        .min(1, { error: "Cần ít nhất 1 phòng." })
        .max(MAX_ROOMS, { error: `Tối đa ${MAX_ROOMS} phòng mỗi đơn.` }),
      guests: z.number({ error: "Số khách không hợp lệ." }).int({ error: "Số khách phải là số nguyên." }).min(1, { error: "Cần ít nhất 1 khách." }),
      guestName: z
        .string()
        .trim()
        .min(2, { error: "Họ tên tối thiểu 2 ký tự." })
        .max(100, { error: "Họ tên tối đa 100 ký tự." }),
      guestEmail: z
        .string()
        .trim()
        .min(1, { error: "Vui lòng nhập email để nhận mã đơn." })
        .pipe(z.email({ error: "Email không đúng định dạng." })),
      guestPhone: z
        .string()
        .trim()
        .min(1, { error: "Vui lòng nhập số điện thoại." })
        .transform(normalizePhone)
        .refine((v) => VN_PHONE_REGEX.test(v), { error: "Số điện thoại Việt Nam không hợp lệ (VD 0901234567)." }),
      note: z
        .string()
        .trim()
        .max(500, { error: "Ghi chú tối đa 500 ký tự." })
        .optional()
        .transform((v) => (v ? v : undefined)),
    })
    .superRefine((v, ctx) => {
      if (isValidYmd(v.checkIn) && v.checkIn < today) {
        ctx.addIssue({ code: "custom", path: ["checkIn"], message: "Ngày nhận phòng không được ở quá khứ." });
      }
      if (isValidYmd(v.checkIn) && isValidYmd(v.checkOut)) {
        if (v.checkOut <= v.checkIn) {
          ctx.addIssue({ code: "custom", path: ["checkOut"], message: "Ngày trả phòng phải sau ngày nhận phòng." });
        } else if (nightsBetween(v.checkIn, v.checkOut) > MAX_NIGHTS) {
          ctx.addIssue({ code: "custom", path: ["checkOut"], message: `Mỗi lần đặt tối đa ${MAX_NIGHTS} đêm.` });
        }
      }
      if (v.guests < v.roomsCount) {
        ctx.addIssue({ code: "custom", path: ["guests"], message: "Số khách phải lớn hơn hoặc bằng số phòng." });
      } else if (capacity && v.guests > capacity * v.roomsCount) {
        ctx.addIssue({
          code: "custom",
          path: ["guests"],
          message: `${v.roomsCount} phòng chỉ chứa tối đa ${capacity * v.roomsCount} khách.`,
        });
      }
    });
}

export type CheckoutInput = z.input<ReturnType<typeof createCheckoutSchema>>;
export type CheckoutPayload = z.output<ReturnType<typeof createCheckoutSchema>>;

export const lookupSchema = z.object({
  bookingCode: z
    .string()
    .trim()
    .min(1, { error: "Vui lòng nhập mã đơn." })
    .transform((v) => v.toUpperCase())
    .refine((v) => /^HB-[A-Z0-9]{4,12}$/.test(v), { error: "Mã đơn có dạng HB-XXXXXX." }),
  email: z
    .string()
    .trim()
    .min(1, { error: "Vui lòng nhập email đã dùng khi đặt." })
    .pipe(z.email({ error: "Email không đúng định dạng." })),
});

