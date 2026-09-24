"use client";

import { useState } from "react";
import { CalendarRange, Save } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { useMutation } from "@/lib/api/hooks";
import { formatStayRange, formatVnd } from "@/lib/utils/format";
import { zodFieldErrors } from "@/lib/utils/validation";
import type { RoomTypeDto } from "@/types/domain";
import { portalHotelService } from "../services/portalHotelService";
import { priceSchema } from "../validators/hotelSchemas";
import { RoomTypePicker } from "./RoomTypePicker";

/** Giá riêng theo khoảng ngày (ghi đè giá cơ bản của các đêm from..to). */
export function PriceManager({ roomTypes, loading }: { hotelId: number; roomTypes: RoomTypeDto[]; loading: boolean }) {
  const [picked, setPicked] = useState<number | null>(null);
  const roomType = roomTypes.find((r) => r.id === picked) ?? roomTypes[0];
  const [f, setF] = useState({ from: "", to: "", price: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<{ roomType: string; from: string; to: string; price: number }[]>([]);
  const m = useMutation((p: { from: string; to: string; price: number }) => portalHotelService.setPrices(roomType!.id, p));

  if (loading && roomTypes.length === 0) return <Spinner />;
  if (!roomType) return <EmptyState icon={CalendarRange} title="Chưa có loại phòng" description="Tạo loại phòng trước khi đặt giá theo ngày." />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = priceSchema.safeParse({ ...f, price: Number(f.price) });
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    const res = await m.run(parsed.data);
    if (res !== undefined) {
      setHistory((h) => [{ roomType: roomType!.name, ...parsed.data }, ...h]);
      setF({ from: "", to: "", price: "" });
    }
  }

  const fe = { ...m.fieldErrors, ...errors };
  return (
    <Card>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <RoomTypePicker id="pr-type" roomTypes={roomTypes} value={roomType.id} onChange={setPicked} />
        <p className="text-sm text-ink-soft">
          Giá cơ bản hiện tại: <strong className="text-ink">{formatVnd(roomType.basePrice)}</strong>/đêm. Giá theo ngày thay giá cơ bản cho các đêm trong
          khoảng (VD lễ, cuối tuần); khách thấy giá đã cộng phí nền tảng.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField id="pr-from" type="date" label="Từ đêm" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} error={fe.from} required />
          <TextField id="pr-to" type="date" label="Đến đêm" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} error={fe.to} required />
          <TextField
            id="pr-price"
            type="number"
            inputMode="numeric"
            min={0}
            step={10000}
            label="Giá cơ bản (₫/đêm)"
            value={f.price}
            onChange={(e) => setF({ ...f, price: e.target.value })}
            error={fe.price}
            required
          />
        </div>
        {m.error && !m.error.errors.length && <Alert tone="error">{m.error.message}</Alert>}
        <Button type="submit" loading={m.pending} className="self-start">
          <Save className="size-4" aria-hidden="true" /> Áp dụng giá
        </Button>
      </form>
      {history.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="font-sans text-sm font-semibold">Đã áp dụng trong phiên này</h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {history.map((h, i) => (
              <li key={i} className="rounded-lg bg-bg px-3 py-2">
                {h.roomType}: {formatStayRange(h.from, h.to)} → <strong>{formatVnd(h.price)}</strong>/đêm
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
