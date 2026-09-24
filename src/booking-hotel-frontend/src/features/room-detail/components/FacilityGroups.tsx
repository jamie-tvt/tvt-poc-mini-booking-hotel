import { FacilityIcon } from "@/components/shared/FacilityIcon";
import type { FacilityDto } from "@/types/domain";

/** Tiện nghi nhóm theo danh mục. */
export function FacilityGroups({ facilities }: { facilities: FacilityDto[] }) {
  if (facilities.length === 0) return <p className="text-ink-soft">Khách sạn chưa cập nhật tiện nghi.</p>;
  const groups = new Map<string, FacilityDto[]>();
  for (const f of facilities) {
    const key = f.categoryName || "Khác";
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[...groups.entries()].map(([cat, items]) => (
        <div key={cat}>
          <h3 className="text-base font-bold">{cat}</h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {items.map((f) => (
              <li key={f.id} className="flex items-center gap-2 text-sm text-ink">
                <FacilityIcon name={f.icon} className="text-brand" /> {f.name}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Danh sách tiện nghi rút gọn (thẻ loại phòng). */
export function FacilityChips({ facilities, max = 6 }: { facilities: FacilityDto[]; max?: number }) {
  if (facilities.length === 0) return null;
  const shown = facilities.slice(0, max);
  const more = facilities.length - shown.length;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Tiện nghi trong phòng">
      {shown.map((f) => (
        <li key={f.id} className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-ink">
          <FacilityIcon name={f.icon} className="size-3.5 text-brand" /> {f.name}
        </li>
      ))}
      {more > 0 && <li className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-ink">+{more} tiện nghi</li>}
    </ul>
  );
}
