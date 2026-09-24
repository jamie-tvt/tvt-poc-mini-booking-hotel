import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, LogIn, LogOut, MapPin, Phone } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { ErrorState } from "@/components/shared/ErrorState";
import { PhotoBackdrop } from "@/components/shared/PhotoBackdrop";
import { buttonClasses } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { HotelClass, ReviewScore } from "@/components/ui/HotelClass";
import { LinkPagination } from "@/components/ui/Pagination";
import { FacilityGroups } from "@/features/room-detail/components/FacilityGroups";
import { HotelGallery } from "@/features/room-detail/components/HotelGallery";
import { HotelStayForm } from "@/features/room-detail/components/HotelStayForm";
import { RoomTypeCard } from "@/features/room-detail/components/RoomTypeCard";
import { ReviewList } from "@/features/review/components/ReviewList";

import { hotelServer } from "@/features/search/services/hotelServer";
import { pickSearchParams, STAY_KEYS } from "@/features/search/types";
import { ApiError, errorMessage } from "@/lib/api/errors";
import { formatStayRange, formatVnd } from "@/lib/utils/format";
import { firstParam, toInt, toQueryString } from "@/lib/utils/query";
import { nightsBetween, stayFromParams, todayVn, validateStay } from "@/lib/utils/stay";
import type { HotelDetailDto } from "@/types/domain";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return { title: "Khách sạn" };
  try {
    const hotel = await hotelServer.detail(id);
    return { title: hotel.name, description: hotel.description?.slice(0, 160) };
  } catch {
    return { title: "Chi tiết khách sạn" };
  }
}

export default async function HotelDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const sp = await searchParams;
  const stayParams = pickSearchParams(sp, STAY_KEYS);
  const reviewPage = toInt(firstParam(sp.reviewPage), 0);
  const today = todayVn();

  const stay = stayFromParams(stayParams);
  const stayErrors = stay.checkIn || stay.checkOut ? validateStay(stay, today, true) : {};
  const datesOk = Object.keys(stayErrors).length === 0 && nightsBetween(stay.checkIn, stay.checkOut) > 0;
  const query = datesOk ? { checkIn: stay.checkIn, checkOut: stay.checkOut, guests: String(stay.guests), rooms: String(stay.rooms) } : {};

  let hotel: HotelDetailDto;
  try {
    hotel = await hotelServer.detail(id, query);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    return (
      <Container className="py-12">
        <ErrorState message={errorMessage(e, undefined)} />
      </Container>
    );
  }
  const reviews = await hotelServer.reviews(id, reviewPage).catch(() => null);
  const selection = datesOk ? stay : { guests: stay.guests, rooms: stay.rooms };
  const minPrice = hotel.fromPrice ?? Math.min(...hotel.roomTypes.map((r) => r.listingPrice).filter((n) => n > 0));
  const backQs = toQueryString(datesOk ? { checkIn: stay.checkIn, checkOut: stay.checkOut, guests: stay.guests, rooms: stay.rooms } : {});

  return (
    <>
      <div className="relative isolate">
        {/* Đầu trang nền mờ theo ảnh bìa (F6) */}
        <PhotoBackdrop src={hotel.coverImageUrl} tone="page" className="bottom-auto h-[46rem] lg:h-[40rem]" />
        <Container className="relative py-6 sm:py-8">
          <Link href={`/hotels${backQs}`} className="inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-medium text-brand hover:underline">
            <ChevronLeft className="size-4" aria-hidden="true" /> Quay lại kết quả tìm kiếm
          </Link>

          <div className="mt-2 grid gap-5 lg:grid-cols-[3fr_2fr] lg:items-start lg:gap-8">
            <HotelGallery name={hotel.name} cover={hotel.coverImageUrl} images={hotel.images ?? []} />
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="glass-pill inline-flex min-h-8 items-center gap-1.5 px-3 py-1 text-sm font-medium text-ink-strong">
                  <HotelClass stars={hotel.starRating} /> · {hotel.city}
                </span>
                <span className="glass-pill inline-flex min-h-8 items-center py-1 pl-1.5 pr-3">
                  <ReviewScore value={hotel.ratingAverage} count={hotel.ratingCount} />
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl lg:text-4xl">{hotel.name}</h1>
              <p className="flex items-start gap-1.5 text-ink-soft">
                <MapPin className="mt-1 size-4 shrink-0 text-brand" aria-hidden="true" /> {hotel.address}, {hotel.city}
              </p>
              <aside className="glass mt-3 flex flex-col gap-4 p-4 sm:p-5" aria-labelledby="stay-heading">
                <div>
                  <h2 id="stay-heading" className="text-lg font-bold">
                    Chọn ngày lưu trú
                  </h2>
                  {Number.isFinite(minPrice) && (
                    <p className="mt-1 text-sm text-ink-soft">
                      Giá từ <strong className="font-heading text-lg text-cta">{formatVnd(minPrice)}</strong> /đêm (đã gồm phí)
                    </p>
                  )}
                </div>
                <HotelStayForm hotelId={hotel.id} initial={stay} />
              </aside>
            </div>
          </div>

          <div className="mt-10 grid gap-10 lg:grid-cols-[2fr_1fr]">
            <section aria-labelledby="about-heading">
              <h2 id="about-heading" className="text-xl font-bold sm:text-2xl">
                Giới thiệu
              </h2>
              <p className="mt-3 whitespace-pre-line text-ink">{hotel.description}</p>
            </section>
            <section aria-labelledby="policy-heading" className="rounded-xl border border-line bg-white p-4 sm:p-5">
              <h2 id="policy-heading" className="text-lg font-bold">
                Giờ nhận – trả phòng
              </h2>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
                <dt className="flex items-center gap-1.5 text-ink-soft">
                  <LogIn className="size-4 text-brand" aria-hidden="true" /> Nhận phòng
                </dt>
                <dd className="text-right font-semibold">từ {hotel.checkInTime}</dd>
                <dt className="flex items-center gap-1.5 text-ink-soft">
                  <LogOut className="size-4 text-brand" aria-hidden="true" /> Trả phòng
                </dt>
                <dd className="text-right font-semibold">trước {hotel.checkOutTime}</dd>
                {hotel.phone && (
                  <>
                    <dt className="flex items-center gap-1.5 text-ink-soft">
                      <Phone className="size-4 text-brand" aria-hidden="true" /> Điện thoại
                    </dt>
                    <dd className="text-right font-semibold">{hotel.phone}</dd>
                </>
              )}
            </dl>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-soft">
              <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> Phòng được giữ 15 phút sau khi đặt để bạn thanh toán.
            </p>
            </section>
          </div>

          <section aria-labelledby="fac-heading" className="mt-10">
            <h2 id="fac-heading" className="mb-4 text-xl font-bold sm:text-2xl">
              Tiện nghi
            </h2>
            <FacilityGroups facilities={hotel.facilities ?? []} />
          </section>

          <section id="rooms" aria-labelledby="rooms-heading" className="mt-10 scroll-mt-24">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <h2 id="rooms-heading" className="text-xl font-bold sm:text-2xl">
                Loại phòng
              </h2>
              {datesOk && (
                <p className="text-sm text-ink-soft">
                  {formatStayRange(stay.checkIn, stay.checkOut)} · {stay.guests} khách · {stay.rooms} phòng
                </p>
              )}
            </div>
            {Object.keys(stayErrors).length > 0 && (
              <Alert tone="warning" className="mb-4" title="Ngày lưu trú chưa hợp lệ">
                {Object.values(stayErrors)[0]}
              </Alert>
            )}
            {!datesOk && Object.keys(stayErrors).length === 0 && (
              <Alert tone="info" className="mb-4">
                Chọn ngày nhận – trả phòng để xem số phòng còn trống và tổng tiền cho kỳ nghỉ.
              </Alert>
            )}
            {hotel.roomTypes.length === 0 ? (
              <p className="text-ink-soft">Khách sạn chưa mở bán loại phòng nào.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {hotel.roomTypes.map((r) => (
                  <li key={r.id}>
                    <RoomTypeCard room={r} stay={selection} today={today} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="reviews" aria-labelledby="rev-heading" className="mt-12 scroll-mt-24">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h2 id="rev-heading" className="text-xl font-bold sm:text-2xl">
                Đánh giá của khách
              </h2>
              <ReviewScore value={hotel.ratingAverage} count={hotel.ratingCount} />
            </div>
            {reviews ? (
              <>
                <ReviewList reviews={reviews.content} />
                <LinkPagination
                  label="Phân trang đánh giá"
                  page={reviews.page}
                  totalPages={reviews.totalPages}
                  hrefFor={(p) => `/hotels/${hotel.id}${toQueryString({ ...query, reviewPage: p })}#reviews`}
                />
              </>
            ) : (
              <p className="text-ink-soft">Chưa tải được đánh giá.</p>
            )}
          </section>
        </Container>
      </div>

      {/* Mobile: thanh kính dính đáy — giá từ + nút cuộn tới danh sách phòng (ẩn từ lg) */}
      <div data-sticky-cta className="glass fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 rounded-b-none rounded-t-[18px] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
        {Number.isFinite(minPrice) ? (
          <p className="min-w-0 leading-tight">
            <span className="block text-xs text-ink-soft">Giá từ / đêm</span>
            <span className="font-heading text-xl font-bold text-cta">{formatVnd(minPrice)}</span>
          </p>
        ) : (
          <span className="text-sm text-ink-soft">{hotel.name}</span>
        )}
        <a href="#rooms" className={buttonClasses("cta", "md", "shrink-0 px-6")}>
          Chọn phòng
        </a>
      </div>
    </>
  );
}
