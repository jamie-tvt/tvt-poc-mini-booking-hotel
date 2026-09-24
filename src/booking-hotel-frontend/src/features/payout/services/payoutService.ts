import { api } from "@/lib/api/client";
import type { PageResponse } from "@/types/api";
import type { PayoutDto, PayoutStatus } from "@/types/domain";

type PayoutList = PayoutDto[] | PageResponse<PayoutDto>;

/** Payout (FR-PO-004): sinh khi đơn CHECKED_OUT, số tiền = phần khách sạn (baseAmount). */
export const payoutService = {
  portal: (q: { hotelId?: number; status?: PayoutStatus; page?: number }) =>
    api.get<PayoutList>("/portal/payouts", { ...q, page: q.page ?? 0, size: 20 }),
  admin: (q: { status?: PayoutStatus; page?: number }) => api.get<PayoutList>("/admin/payouts", { ...q, page: q.page ?? 0, size: 20 }),
  markPaid: (id: number) => api.post<PayoutDto>(`/admin/payouts/${id}/paid`),
};
