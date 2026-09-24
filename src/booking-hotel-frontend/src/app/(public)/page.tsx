import Link from "next/link";
import { ArrowRight, BadgePercent, Clock3, MapPin, ShieldCheck, UserRoundCheck } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { EmptyState } from "@/components/shared/EmptyState";
import { HotelImage } from "@/components/shared/HotelImage";
import { ErrorState } from "@/components/shared/ErrorState";
import { LinkButton } from "@/components/ui/Button";
import { HeroSearch } from "@/features/search/components/HeroSearch";
import { HotelGrid } from "@/features/search/components/HotelCard";
import { hotelServer } from "@/features/search/services/hotelServer";
import { errorMessage } from "@/lib/api/errors";
import { HERO_IMAGE, HOTEL_IMAGES, unsplash, unsplashSrcSet, unsplashVariant } from "@/lib/utils/images";

export const dynamic = "force-dynamic";

/** Ảnh điểm đến — Unsplash License (thành phố lạ dùng ảnh mặc định). */
const CITY_IMAGES: Record<string, string> = {
  "Cần Thơ": HOTEL_IMAGES.ninhKieu, // Tan Dao
  "Hậu Giang": HOTEL_IMAGES.viThanh, // Hà Nguyễn
  "Phú Quốc": HOTEL_IMAGES.sunsetBay, // Wolfgang Unger
  "Kiên Giang": HOTEL_IMAGES.sunsetBay, // Wolfgang Unger
  "Đồng Tháp": unsplash("photo-1785109825844-92b3cab7a4f8"), // Irish83 — cánh đồng sen
};

export default async function HomePage() {
  const [hotelsRes, citiesRes] = await Promise.allSettled([hotelServer.search({ sort: "rating" }, 6), hotelServer.cities()]);
  const cities = citiesRes.status === "fulfilled" ? citiesRes.value : [];

  return (
    <>
      {/* Hero ảnh thật tràn ngang (F6) + gradient tối từ dưới lên cho chữ trắng; nền navy phía sau khi ảnh không tải được */}
      <section className="hero-navy relative isolate overflow-hidden text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={unsplashVariant(HERO_IMAGE, 1200)}
          srcSet={unsplashSrcSet(HERO_IMAGE, [800, 1200, 1600, 2000])}
          sizes="100vw"
          alt=""
          width={1600}
          height={900}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 -z-10 size-full max-w-none object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-linear-to-b from-brand-hover/40 via-brand-hover/45 via-40% to-brand-hover/90"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 hidden bg-linear-to-r from-brand-hover/55 via-brand-hover/15 via-60% to-transparent sm:block"
        />
        <Container className="relative flex min-h-[27rem] flex-col justify-end pb-32 pt-16 sm:min-h-[30rem] sm:pb-36 lg:min-h-[34rem] lg:pb-32">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-200 [text-shadow:0_1px_8px_rgb(0_0_0/0.4)]">
            Sông nước miền Tây · Biển đảo phương Nam
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold text-white [text-shadow:0_2px_12px_rgb(0_0_0/0.35)] sm:text-4xl lg:text-5xl">
            Thức dậy bên bến Ninh Kiều, ngủ muộn cùng hoàng hôn Phú Quốc
          </h1>
          <p className="mt-4 max-w-2xl text-base text-blue-50 sm:text-lg">
            Giá hiển thị đã gồm phí, giữ phòng ngay khi đặt và không cần tạo tài khoản.
          </p>
        </Container>
      </section>
      {/* Form tìm kiếm là thẻ kính đè lên mép dưới hero */}
      <Container className="relative z-10 -mt-24 sm:-mt-28 lg:-mt-24">
        <HeroSearch cities={cities} />
      </Container>

      <Container className="py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Khách sạn nổi bật</h2>
            <p className="mt-1 text-ink-soft">Được khách đánh giá cao nhất trên Mekong Stay.</p>
          </div>
          <Link
            href="/hotels?sort=rating"
            className="inline-flex min-h-11 items-center gap-1 rounded-md font-semibold text-brand hover:underline"
          >
            Xem tất cả khách sạn <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        {hotelsRes.status === "rejected" ? (
          <ErrorState message={errorMessage(hotelsRes.reason, undefined)} action={<LinkButton href="/">Tải lại trang</LinkButton>} />
        ) : hotelsRes.value.content.length === 0 ? (
          <EmptyState title="Chưa có khách sạn đang nhận khách" description="Các khách sạn mới sẽ sớm được cập nhật." />
        ) : (
          <HotelGrid hotels={hotelsRes.value.content} wide />
        )}
      </Container>

      {cities.length > 0 && (
        <section className="border-y border-line bg-white" aria-labelledby="dest-heading">
          <Container className="py-12">
            <h2 id="dest-heading" className="text-2xl font-bold sm:text-3xl">
              Điểm đến
            </h2>
            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cities.map((c) => (
                <li key={c}>
                  <Link
                    href={`/hotels?city=${encodeURIComponent(c)}`}
                    className="group flex items-center gap-3 overflow-hidden rounded-xl border border-line bg-bg p-2 pr-4 transition-colors duration-200 hover:border-brand hover:bg-brand-soft"
                  >
                    <span className="w-24 shrink-0 overflow-hidden rounded-lg">
                      <HotelImage src={CITY_IMAGES[c]} alt="" width={240} />
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5 font-semibold text-ink-strong">
                      <MapPin className="size-4 shrink-0 text-cta" aria-hidden="true" />
                      <span className="truncate">{c}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <Container className="py-12">
        <h2 className="text-2xl font-bold sm:text-3xl">Đặt phòng yên tâm</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              Icon: BadgePercent,
              title: "Giá đã gồm phí",
              text: "Giá mỗi đêm hiển thị đúng số tiền bạn trả, không phát sinh phí ở bước cuối.",
            },
            { Icon: Clock3, title: "Giữ phòng tức thì", text: "Phòng được giữ ngay khi đặt, bạn có 15 phút để hoàn tất thanh toán." },
            { Icon: ShieldCheck, title: "Không lo trùng phòng", text: "Tồn kho tính theo từng đêm, không bán vượt số phòng còn trống." },
            { Icon: UserRoundCheck, title: "Không cần tài khoản", text: "Nhận mã đơn để tra cứu, huỷ hoặc đánh giá bất cứ lúc nào." },
          ].map(({ Icon, title, text }) => (
            <li key={title} className="rounded-xl border border-line bg-white p-5">
              <Icon className="size-8 text-cta" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-bold">{title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{text}</p>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
