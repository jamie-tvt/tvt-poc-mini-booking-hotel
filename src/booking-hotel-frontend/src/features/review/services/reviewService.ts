import { api } from "@/lib/api/client";
import type { ReviewDto } from "@/types/domain";

export const reviewService = {
  /** Công khai: xác thực bằng mã đơn + access key (chỉ khi đơn CHECKED_OUT, mỗi đơn 1 lần). */
  create: (payload: { bookingCode: string; key: string; rating: number; content: string }) =>
    api.post<ReviewDto>("/reviews", payload, { auth: false }),
};
