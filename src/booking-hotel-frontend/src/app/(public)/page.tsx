import Link from "next/link";
import { ArrowRight, BadgePercent, Clock3, MapPin, ShieldCheck, UserRoundCheck } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LinkButton } from "@/components/ui/Button";
import { HeroSearch } from "@/features/search/components/HeroSearch";
import { HotelGrid } from "@/features/search/components/HotelCard";
import { hotelServer } from "@/features/search/services/hotelServer";
import { errorMessage } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

/** Ảnh minh hoạ điểm đến (không bắt buộc — thành phố lạ dùng ảnh mặc định). */
const CITY_IMAGES: Record<string, string> = {
  "Cần Thơ": "/images/hotels/ninh-kieu-riverside.svg",
  "Hậu Giang": "/images/hotels/vi-thanh-green.svg",
  "Phú Quốc": "/images/hotels/sunset-bay.svg",
  "Kiên Giang": "/images/hotels/sunset-bay.svg",
  "Đồng Tháp": "/images/hotels/mekong-lotus.svg",
};

export default async function HomePage() {
  const [hotelsRes, citiesRes] = await Promise.allSettled([hotelServer.search({ sort: "rating" }, 6), hotelServer.cities()]);
  const cities = citiesRes.status === "fulfilled" ? citiesRes.value : [];

  return (
    <>
      <section className="hero-navy relative text-white">
        <Container className="relative py-14 sm:py-20 lg:py-24">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-200">Sông nước miền Tây · Biển đảo phương Nam</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Thức dậy bên bến Ninh Kiều, ngủ muộn cùng hoàng hôn Phú Quốc
          </h1>
          <p className="mt-4 max-w-2xl text-base text-blue-50 sm:text-lg">
            Giá hiển thị đã gồm phí, giữ phòng ngay khi đặt và không cần tạo tài khoản.
          </p>
          <div className="mt-8">
            <HeroSearch cities={cities} />
          </div>
        </Container>
      </section>

      <Container className="py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Khách sạn nổi bật</h2>
            <p className="mt-1 text-ink-soft">Được khách đánh giá cao nhất trên Mekong Stay.</p>
          </div>
          <Link href="/hotels?sort=rating" className="inline-flex min-h-11 items-center gap-1 rounded-md font-semibold text-brand hover:underline">
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={CITY_IMAGES[c] ?? "/images/hotels/placeholder.svg"}
                      alt=""
                      width={96}
                      height={60}
                      loading="lazy"
                      className="aspect-[16/10] w-24 shrink-0 rounded-lg object-cover"
                    />
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
            { Icon: BadgePercent, title: "Giá đã gồm phí", text: "Giá mỗi đêm hiển thị đúng số tiền bạn trả, không phát sinh phí ở bước cuối." },
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
