import { z } from "zod";

/** Đánh giá sau khi trả phòng (POST /reviews): 1–5 sao, nội dung ≥ 10 ký tự. */
export const reviewSchema = z.object({
  rating: z
    .number({ error: "Vui lòng chọn số sao." })
    .int()
    .min(1, { error: "Vui lòng chọn từ 1 đến 5 sao." })
    .max(5, { error: "Vui lòng chọn từ 1 đến 5 sao." }),
  content: z
    .string()
    .trim()
    .min(10, { error: "Nội dung đánh giá tối thiểu 10 ký tự." })
    .max(2000, { error: "Nội dung đánh giá tối đa 2000 ký tự." }),
});
export type ReviewInput = z.infer<typeof reviewSchema>;
