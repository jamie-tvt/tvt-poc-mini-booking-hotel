import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Alert } from "@/components/ui/Alert";
import { LinkButton } from "@/components/ui/Button";
import { LinkPagination } from "@/components/ui/Pagination";
import { HotelGrid } from "@/features/search/components/HotelCard";
import { SearchFilters } from "@/features/search/components/SearchFilters";
import { hotelServer } from "@/features/search/services/hotelServer";
import { pickSearchParams, SEARCH_KEYS, stayOnly } from "@/features/search/types";
import { errorMessage } from "@/lib/api/errors";
import { formatStayRange } from "@/lib/utils/format";
import { firstParam, toInt, toQueryString } from "@/lib/utils/query";
import { nightsBetween, stayFromParams, todayVn, validateStay } from "@/lib/utils/stay";


export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tìm khách sạn" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function HotelsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const params = pickSearchParams(sp);
  const page = toInt(firstParam(sp.page), 0);

  // Ngày sai (trả ≤ nhận, quá khứ, > 30 đêm) → báo ngay, không gọi API với ngày sai.
  const stayErrors = validateStay(stayFromParams(params), todayVn(), false);
  const stayInvalid = Object.keys(stayErrors).length > 0;
  const query = stayInvalid ? { ...params, checkIn: undefined, checkOut: undefined } : params;

  const [hotelsRes, citiesRes, catsRes] = await Promise.allSettled([
    hotelServer.search({ ...query, page }),
    hotelServer.cities(),
    hotelServer.facilityCategories(),
  ]);
  const cities = citiesRes.status === "fulfilled" ? citiesRes.value : [];
  const categories = catsRes.status === "fulfilled" ? catsRes.value : [];
  const filterKey = SEARCH_KEYS.map((k) => params[k] ?? "").join("|");
  const nights = stayInvalid ? 0 : nightsBetween(params.checkIn, params.checkOut);

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold sm:text-3xl">{params.city ? `Khách sạn tại ${params.city}` : "Tìm khách sạn"}</h1>
      <p className="mt-1 text-ink-soft">
        {nights > 0
          ? `${formatStayRange(params.checkIn, params.checkOut)} · ${nights} đêm · ${params.guests ?? 2} khách · ${params.rooms ?? 1} phòng`
          : "Chọn ngày nhận – trả phòng để xem giá và phòng còn trống chính xác."}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
        <aside className="lg:sticky lg:top-20">
          <SearchFilters key={filterKey} initial={params} cities={cities} categories={categories} />
        </aside>

        <section aria-live="polite" aria-label="Kết quả tìm kiếm" className="min-w-0">
          {stayInvalid && (
            <Alert tone="warning" className="mb-4" title="Ngày lưu trú chưa hợp lệ">
              {Object.values(stayErrors)[0]} Kết quả dưới đây chưa lọc theo ngày.
            </Alert>
          )}
          {hotelsRes.status === "rejected" ? (
            <ErrorState message={errorMessage(hotelsRes.reason, undefined)} action={<LinkButton href="/hotels">Thử lại</LinkButton>} />
          ) : hotelsRes.value.content.length === 0 ? (
            <EmptyState
              title="Không tìm thấy khách sạn phù hợp"
              description={
                nights > 0
                  ? "Có thể các khách sạn đã hết phòng trong khoảng ngày này. Thử đổi ngày, giảm số phòng hoặc bỏ bớt bộ lọc."
                  : "Thử bỏ bớt điều kiện lọc hoặc chọn thành phố khác."
              }
              action={
                <LinkButton href="/hotels" variant="secondary">
                  Xoá bộ lọc
                </LinkButton>
              }
            />
          ) : (
            <>
              <p className="mb-4 text-sm text-ink-soft">
                Tìm thấy <strong className="text-ink-strong">{hotelsRes.value.totalElements}</strong> khách sạn
              </p>
              <HotelGrid hotels={hotelsRes.value.content} stay={stayInvalid ? {} : stayOnly(params)} />
              <LinkPagination
                page={hotelsRes.value.page}
                totalPages={hotelsRes.value.totalPages}
                hrefFor={(p) => `/hotels${toQueryString({ ...params, page: p || undefined })}`}
              />
            </>
          )}
        </section>
      </div>
    </Container>
  );
}
