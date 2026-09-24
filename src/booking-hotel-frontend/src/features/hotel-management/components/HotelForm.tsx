"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { useMutation } from "@/lib/api/hooks";
import { cn } from "@/lib/utils/cn";
import { zodFieldErrors } from "@/lib/utils/validation";
import type { PortalHotelDto } from "@/types/domain";
import type { HotelPayload } from "../services/portalHotelService";
import { hotelSchema } from "../validators/hotelSchemas";

export const COVER_PRESETS = [
  { url: "/images/hotels/ninh-kieu-riverside.svg", label: "Bến sông" },
  { url: "/images/hotels/cai-rang-homestay.svg", label: "Homestay miệt vườn" },
  { url: "/images/hotels/vi-thanh-green.svg", label: "Khách sạn xanh" },
  { url: "/images/hotels/sunset-bay.svg", label: "Biển hoàng hôn" },
  { url: "/images/hotels/mekong-lotus.svg", label: "Hồ sen" },
];

type FormState = Record<"name" | "city" | "address" | "description" | "starRating" | "phone" | "checkInTime" | "checkOutTime" | "coverImageUrl", string>;

function toState(h?: PortalHotelDto | null): FormState {
  return {
    name: h?.name ?? "",
    city: h?.city ?? "",
    address: h?.address ?? "",
    description: h?.description ?? "",
    starRating: String(h?.starRating ?? 3),
    phone: h?.phone ?? "",
    checkInTime: h?.checkInTime?.slice(0, 5) ?? "14:00",
    checkOutTime: h?.checkOutTime?.slice(0, 5) ?? "12:00",
    coverImageUrl: h?.coverImageUrl ?? "",
  };
}

/** Form hồ sơ khách sạn (tạo mới hoặc sửa). */
export function HotelForm({
  initial,
  submitLabel,
  onSubmit,
  onDone,
}: {
  initial?: PortalHotelDto | null;
  submitLabel: string;
  onSubmit: (p: HotelPayload) => Promise<PortalHotelDto>;
  onDone: (h: PortalHotelDto) => void;
}) {
  const [f, setF] = useState<FormState>(() => toState(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation(onSubmit);
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = hotelSchema.safeParse({ ...f, starRating: Number(f.starRating) });
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    const res = await m.run(parsed.data);
    if (res) onDone(res);
  }

  const fe = { ...m.fieldErrors, ...errors };
  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <TextField id="h-name" label="Tên khách sạn" value={f.name} onChange={set("name")} error={fe.name} required containerClassName="sm:col-span-2" />
      <TextField id="h-city" label="Thành phố" value={f.city} onChange={set("city")} error={fe.city} required placeholder="VD: Cần Thơ" />
      <SelectField id="h-stars" label="Hạng sao" value={f.starRating} onChange={set("starRating")} error={fe.starRating} required>
        {[1, 2, 3, 4, 5].map((s) => (
          <option key={s} value={s}>
            {s} sao
          </option>
        ))}
      </SelectField>
      <TextField id="h-address" label="Địa chỉ" value={f.address} onChange={set("address")} error={fe.address} required containerClassName="sm:col-span-2" />
      <TextAreaField
        id="h-desc"
        label="Mô tả"
        value={f.description}
        onChange={set("description")}
        error={fe.description}
        required
        hint="Tối thiểu 20 ký tự — vị trí, không gian, điểm nổi bật"
        containerClassName="sm:col-span-2"
        rows={5}
      />
      <TextField id="h-phone" label="Điện thoại" type="tel" value={f.phone} onChange={set("phone")} error={fe.phone} hint="Không bắt buộc" />
      <div className="grid grid-cols-2 gap-3">
        <TextField id="h-in" type="time" label="Giờ nhận phòng" value={f.checkInTime} onChange={set("checkInTime")} error={fe.checkInTime} required />
        <TextField id="h-out" type="time" label="Giờ trả phòng" value={f.checkOutTime} onChange={set("checkOutTime")} error={fe.checkOutTime} required />
      </div>
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium text-ink">Ảnh bìa</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {COVER_PRESETS.map((p) => {
            const id = `h-cover-${p.label.replace(/\s+/g, "-")}`;
            const checked = f.coverImageUrl === p.url;
            return (
              <label
                key={p.url}
                htmlFor={id}
                className={cn(
                  "flex cursor-pointer flex-col gap-1 rounded-lg border-2 p-1.5 text-xs font-medium transition-colors duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand",
                  checked ? "border-brand bg-brand-soft" : "border-line hover:border-brand",
                )}
              >
                <input id={id} type="radio" name="cover" className="sr-only" checked={checked} onChange={() => setF((s) => ({ ...s, coverImageUrl: p.url }))} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" width={160} height={100} className="aspect-[16/10] w-full rounded object-cover" />
                {p.label}
              </label>
            );
          })}
        </div>
        <TextField
          id="h-cover"
          label="Hoặc đường dẫn ảnh khác"
          value={f.coverImageUrl}
          onChange={set("coverImageUrl")}
          error={fe.coverImageUrl}
          hint="Không bắt buộc — /images/... hoặc https://..."
          containerClassName="mt-3"
        />
      </fieldset>
      {m.error && !m.error.errors.length && (
        <Alert tone="error" className="sm:col-span-2">
          {m.error.message}
        </Alert>
      )}
      <Button type="submit" loading={m.pending} className="justify-self-start sm:col-span-2">
        <Save className="size-4" aria-hidden="true" /> {submitLabel}
      </Button>
    </form>
  );
}
