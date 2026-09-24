import { serverGet } from "@/lib/api/server";
import { DEFAULT_PAGE_SIZE } from "@/lib/config/env";
import type { PageResponse } from "@/types/api";
import type { FacilityCategoryDto, HotelDetailDto, HotelSummaryDto, ReviewDto } from "@/types/domain";
import type { HotelSearchParams } from "../types";

/** Gọi API công khai từ Server Component (cache no-store). */
export const hotelServer = {
  search: (p: HotelSearchParams & { page?: string | number }, size = DEFAULT_PAGE_SIZE) =>
    serverGet<PageResponse<HotelSummaryDto>>("/hotels/search", {
      city: p.city,
      checkIn: p.checkIn,
      checkOut: p.checkOut,
      guests: p.guests,
      rooms: p.rooms,
      minPrice: p.minPrice,
      maxPrice: p.maxPrice,
      stars: p.stars,
      facilityIds: p.facilityIds,
      sort: p.sort,
      page: p.page ?? 0,
      size,
    }),
  detail: (id: string | number, stay: HotelSearchParams = {}) =>
    serverGet<HotelDetailDto>(`/hotels/${id}`, {
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      guests: stay.guests,
      rooms: stay.rooms,
    }),
  reviews: (hotelId: string | number, page = 0, size = 5) =>
    serverGet<PageResponse<ReviewDto>>(`/hotels/${hotelId}/reviews`, { page, size }),
  cities: () => serverGet<string[]>("/cities"),
  facilityCategories: () => serverGet<FacilityCategoryDto[]>("/facility-categories"),
};
