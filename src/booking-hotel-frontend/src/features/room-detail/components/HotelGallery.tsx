import { HotelImage } from "@/components/shared/HotelImage";

/** Ảnh bìa lớn + tối đa 2 ảnh phụ; ảnh "nổi" trên nền mờ (bo 16px, bóng). Ảnh bìa dùng srcSet 800/1200/1600. */
export function HotelGallery({ name, cover, images }: { name: string; cover?: string | null; images: string[] }) {
  const all = [cover, ...images].filter((u, i, arr): u is string => !!u && arr.indexOf(u) === i);
  const [first, ...rest] = all;
  return (
    <div className={rest.length ? "grid gap-2 sm:grid-cols-4 sm:grid-rows-2" : "grid"}>
      {/* Chỉ có ảnh bìa → ảnh chiếm hết chiều ngang */}
      <div
        className={
          rest.length ? "overflow-hidden rounded-2xl shadow-float sm:col-span-3 sm:row-span-2" : "overflow-hidden rounded-2xl shadow-float"
        }
      >
        <HotelImage
          src={first}
          alt={`Ảnh ${name}`}
          priority
          width={1200}
          srcSetWidths={[800, 1200, 1600]}
          sizes="(min-width: 1024px) 45vw, (min-width: 640px) 75vw, 100vw"
          className="h-full"
        />
      </div>
      {rest.slice(0, 2).map((src, i) => (
        <div key={src} className="hidden overflow-hidden rounded-2xl shadow-float sm:block">
          <HotelImage src={src} alt={`Ảnh ${name} ${i + 2}`} className="h-full" />
        </div>
      ))}
    </div>
  );
}
