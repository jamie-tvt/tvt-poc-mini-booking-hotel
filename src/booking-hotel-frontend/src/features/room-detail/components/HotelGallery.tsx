import { HotelImage } from "@/components/shared/HotelImage";

/** Ảnh bìa lớn + tối đa 4 ảnh phụ. */
export function HotelGallery({ name, cover, images }: { name: string; cover?: string | null; images: string[] }) {
  const all = [cover, ...images].filter((u, i, arr): u is string => !!u && arr.indexOf(u) === i);
  const [first, ...rest] = all;
  return (
    <div className="grid gap-2 sm:grid-cols-4 sm:grid-rows-2">
      <div className="overflow-hidden rounded-xl sm:col-span-3 sm:row-span-2">
        <HotelImage src={first} alt={`Ảnh ${name}`} priority className="h-full" />
      </div>
      {rest.slice(0, 2).map((src, i) => (
        <div key={src} className="hidden overflow-hidden rounded-xl sm:block">
          <HotelImage src={src} alt={`Ảnh ${name} ${i + 2}`} className="h-full" />
        </div>
      ))}
    </div>
  );
}
