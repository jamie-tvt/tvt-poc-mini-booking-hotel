"use client";

import { useState } from "react";
import { BedDouble, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { FacilityIcon } from "@/components/shared/FacilityIcon";
import { useApiQuery, useMutation, type QueryState } from "@/lib/api/hooks";
import { formatNumber, formatVnd } from "@/lib/utils/format";
import { cancellationLabel } from "@/lib/utils/stay";
import { zodFieldErrors } from "@/lib/utils/validation";
import type { RoomTypeDto } from "@/types/domain";
import { portalHotelService, type RoomTypePayload } from "../services/portalHotelService";
import { roomTypeSchema } from "../validators/hotelSchemas";

export function RoomTypeManager({ hotelId, query }: { hotelId: number; query: QueryState<RoomTypeDto[]> }) {
  const [editing, setEditing] = useState<RoomTypeDto | "new" | null>(null);
  const [deleting, setDeleting] = useState<RoomTypeDto | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const del = useMutation((id: number) => portalHotelService.deleteRoomType(id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-soft">Giá cơ bản là phần khách sạn nhận; khách thấy giá đã cộng phí nền tảng.</p>
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" aria-hidden="true" /> Thêm loại phòng
        </Button>
      </div>
      {notice && <Alert tone="success">{notice}</Alert>}
      {query.loading && !query.data ? (
        <Spinner />
      ) : query.error ? (
        <ErrorState message={query.error.message} />
      ) : !query.data || query.data.length === 0 ? (
        <EmptyState icon={BedDouble} title="Chưa có loại phòng" description="Thêm loại phòng, sau đó thêm số phòng ở tab Phòng." />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {query.data.map((rt) => (
            <li key={rt.id} className="flex flex-col gap-2 rounded-xl border border-line bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold">{rt.name}</h3>
                  <p className="flex flex-wrap gap-x-3 text-sm text-ink-soft">
                    <span className="flex items-center gap-1">
                      <Users className="size-4" aria-hidden="true" /> {rt.capacity} khách
                    </span>
                    <span>{rt.bedInfo}</span>
                    <span>{formatNumber(rt.areaM2)} m²</span>
                    <span>{rt.totalRooms} phòng hoạt động</span>
                  </p>
                </div>
                <p className="text-right">
                  <span className="block font-heading text-lg font-bold text-ink-strong">{formatVnd(rt.basePrice)}</span>
                  <span className="text-xs text-ink-soft">giá cơ bản/đêm · khách thấy {formatVnd(rt.listingPrice)}</span>
                </p>
              </div>
              <p className="text-sm font-medium text-ink">{cancellationLabel(rt.cancellationPolicy, rt.freeCancelDays)}</p>
              {rt.facilities.length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label={`Tiện nghi ${rt.name}`}>
                  {rt.facilities.map((f) => (
                    <li key={f.id} className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs">
                      <FacilityIcon name={f.icon} className="size-3.5 text-brand" /> {f.name}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-auto flex justify-end gap-1.5 border-t border-line pt-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(rt)} aria-label={`Sửa loại phòng ${rt.name}`}>
                  <Pencil className="size-4" aria-hidden="true" /> Sửa
                </Button>
                <Button size="sm" variant="ghost" className="text-danger" onClick={() => setDeleting(rt)} aria-label={`Xoá loại phòng ${rt.name}`}>
                  <Trash2 className="size-4" aria-hidden="true" /> Xoá
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <RoomTypeDialog
          hotelId={hotelId}
          roomType={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(rt) => {
            setNotice(editing === "new" ? `Đã thêm loại phòng ${rt.name}.` : `Đã cập nhật ${rt.name}.`);
            setEditing(null);
            void query.reload();
          }}
        />
      )}
      <Dialog
        open={!!deleting}
        onClose={() => {
          setDeleting(null);
          del.reset();
        }}
        title="Xoá loại phòng?"
        description={deleting?.name}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Quay lại
            </Button>
            <Button
              variant="danger"
              loading={del.pending}
              onClick={async () => {
                if (!deleting) return;
                const res = await del.run(deleting.id);
                if (res !== undefined) {
                  setNotice(`Đã xoá loại phòng ${deleting.name}.`);
                  setDeleting(null);
                  void query.reload();
                }
              }}
            >
              Xác nhận xoá
            </Button>
          </>
        }
      >
        <p className="text-sm">Không xoá được nếu loại phòng còn đơn đặt trong tương lai.</p>
        {del.error && (
          <Alert tone="error" className="mt-3">
            {del.error.message}
          </Alert>
        )}
      </Dialog>
    </div>
  );
}

type RtForm = Record<"name" | "description" | "capacity" | "bedInfo" | "areaM2" | "basePrice" | "cancellationPolicy" | "freeCancelDays" | "imageUrl", string>;

function RoomTypeDialog({
  hotelId,
  roomType,
  onClose,
  onSaved,
}: {
  hotelId: number;
  roomType: RoomTypeDto | null;
  onClose: () => void;
  onSaved: (rt: RoomTypeDto) => void;
}) {
  const cats = useApiQuery("facility-categories", portalHotelService.facilityCategories);
  const [f, setF] = useState<RtForm>({
    name: roomType?.name ?? "",
    description: roomType?.description ?? "",
    capacity: String(roomType?.capacity ?? 2),
    bedInfo: roomType?.bedInfo ?? "",
    areaM2: String(roomType?.areaM2 ?? 25),
    basePrice: String(roomType?.basePrice ?? ""),
    cancellationPolicy: roomType?.cancellationPolicy ?? "FREE_BEFORE_DATE",
    freeCancelDays: String(roomType?.freeCancelDays ?? 3),
    imageUrl: roomType?.imageUrl ?? "",
  });
  const [facilityIds, setFacilityIds] = useState<number[]>(roomType?.facilities.map((x) => x.id) ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation((p: RoomTypePayload) =>
    roomType ? portalHotelService.updateRoomType(roomType.id, p) : portalHotelService.createRoomType(hotelId, p),
  );
  const set = (k: keyof RtForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  async function save() {
    const parsed = roomTypeSchema.safeParse({
      ...f,
      capacity: Number(f.capacity),
      areaM2: Number(f.areaM2),
      basePrice: Number(f.basePrice),
      freeCancelDays: f.cancellationPolicy === "FREE_BEFORE_DATE" ? Number(f.freeCancelDays) : undefined,
      facilityIds,
    });
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    const res = await m.run(parsed.data);
    if (res) onSaved(res);
  }

  const fe = { ...m.fieldErrors, ...errors };
  return (
    <Dialog
      open
      onClose={onClose}
      title={roomType ? `Sửa loại phòng ${roomType.name}` : "Thêm loại phòng"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
          <Button onClick={save} loading={m.pending}>
            {roomType ? "Lưu thay đổi" : "Tạo loại phòng"}
          </Button>
        </>
      }
    >
      <form
        noValidate
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <TextField id="rt-name" label="Tên loại phòng" value={f.name} onChange={set("name")} error={fe.name} required placeholder="VD: Deluxe hướng sông" />
        <TextField
          id="rt-price"
          type="number"
          inputMode="numeric"
          min={0}
          step={10000}
          label="Giá cơ bản (₫/đêm)"
          value={f.basePrice}
          onChange={set("basePrice")}
          error={fe.basePrice}
          required
          hint="Chưa gồm phí nền tảng"
        />
        <TextField id="rt-cap" type="number" min={1} max={20} label="Sức chứa (khách/phòng)" value={f.capacity} onChange={set("capacity")} error={fe.capacity} required />
        <TextField id="rt-area" type="number" min={5} label="Diện tích (m²)" value={f.areaM2} onChange={set("areaM2")} error={fe.areaM2} required />
        <TextField id="rt-bed" label="Giường" value={f.bedInfo} onChange={set("bedInfo")} error={fe.bedInfo} required placeholder="VD: 1 giường đôi lớn" containerClassName="sm:col-span-2" />
        <SelectField id="rt-policy" label="Chính sách huỷ" value={f.cancellationPolicy} onChange={set("cancellationPolicy")} error={fe.cancellationPolicy}>
          <option value="FREE_BEFORE_DATE">Miễn phí huỷ trước ngày nhận phòng</option>
          <option value="NON_REFUNDABLE">Không hoàn tiền</option>
        </SelectField>
        {f.cancellationPolicy === "FREE_BEFORE_DATE" ? (
          <TextField
            id="rt-days"
            type="number"
            min={1}
            max={60}
            label="Số ngày huỷ miễn phí"
            value={f.freeCancelDays}
            onChange={set("freeCancelDays")}
            error={fe.freeCancelDays}
            hint="Huỷ trước ngày nhận ≥ N ngày được hoàn 100%"
          />
        ) : (
          <p className="self-end text-sm text-ink-soft">Đơn đã thanh toán không được hoàn tiền khi huỷ.</p>
        )}
        <TextField id="rt-img" label="Ảnh loại phòng" value={f.imageUrl} onChange={set("imageUrl")} error={fe.imageUrl} hint="Không bắt buộc — VD /images/rooms/deluxe.svg" containerClassName="sm:col-span-2" />
        <TextAreaField id="rt-desc" label="Mô tả" value={f.description} onChange={set("description")} error={fe.description} containerClassName="sm:col-span-2" />
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium text-ink">Tiện nghi trong phòng</legend>
          {cats.loading ? (
            <Spinner label="Đang tải tiện nghi…" className="py-4" />
          ) : cats.error ? (
            <p className="text-sm text-danger">{cats.error.message}</p>
          ) : (
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {(cats.data ?? []).map((c) => (
                <div key={c.id}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{c.name}</p>
                  <ul className="mt-1">
                    {c.facilities.map((fac) => {
                      const id = `rt-fac-${fac.id}`;
                      return (
                        <li key={fac.id}>
                          <label htmlFor={id} className="flex min-h-9 items-center gap-2 rounded px-1 text-sm hover:bg-brand-soft">
                            <input
                              id={id}
                              type="checkbox"
                              className="size-4 accent-brand"
                              checked={facilityIds.includes(fac.id)}
                              onChange={() =>
                                setFacilityIds((ids) => (ids.includes(fac.id) ? ids.filter((x) => x !== fac.id) : [...ids, fac.id]))
                              }
                            />
                            <FacilityIcon name={fac.icon} className="text-brand" /> {fac.name}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </fieldset>
        {m.error && !m.error.errors.length && (
          <Alert tone="error" className="sm:col-span-2">
            {m.error.message}
          </Alert>
        )}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Dialog>
  );
}
