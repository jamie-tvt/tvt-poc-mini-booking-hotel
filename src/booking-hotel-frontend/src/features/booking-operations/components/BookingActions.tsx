"use client";

import { useState } from "react";
import { DoorClosed, DoorOpen, UserX } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { useApiQuery, useMutation } from "@/lib/api/hooks";
import { formatStayDate } from "@/lib/utils/format";
import { addDays } from "@/lib/utils/stay";
import type { BookingDto } from "@/types/domain";
import { opsService } from "../services/opsService";

type Action = "check-in" | "check-out" | "no-show";

/** Quy tắc hiển thị nút theo hợp đồng §5.4 (backend vẫn kiểm tra lại). */
export function availableActions(b: BookingDto, today: string): Action[] {
  const out: Action[] = [];
  if (b.status === "CONFIRMED" && b.checkIn <= today && today < b.checkOut) out.push("check-in");
  if (b.status === "CONFIRMED" && today >= addDays(b.checkIn, 1)) out.push("no-show");
  if (b.status === "CHECKED_IN") out.push("check-out");
  return out;
}

/** Nút lễ tân cho 1 đơn: Nhận phòng (chọn số phòng), Trả phòng, Không đến — đều có hộp xác nhận trong trang. */
export function BookingActions({
  booking,
  today,
  onChanged,
  size = "sm",
}: {
  booking: BookingDto;
  today: string;
  onChanged: (b: BookingDto, message: string) => void;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState<Action | null>(null);
  const actions = availableActions(booking, today);
  if (actions.length === 0) {
    if (booking.status === "CONFIRMED" && booking.checkIn > today) {
      return <span className="text-xs text-ink-soft">Nhận phòng từ {formatStayDate(booking.checkIn)}</span>;
    }
    return null;
  }
  const who = `${booking.bookingCode} (${booking.guestName})`;

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {actions.includes("check-in") && (
        <Button size={size} onClick={() => setOpen("check-in")} aria-label={`Nhận phòng cho đơn ${who}`}>
          <DoorOpen className="size-4" aria-hidden="true" /> Nhận phòng
        </Button>
      )}
      {actions.includes("check-out") && (
        <Button size={size} variant="cta" onClick={() => setOpen("check-out")} aria-label={`Trả phòng cho đơn ${who}`}>
          <DoorClosed className="size-4" aria-hidden="true" /> Trả phòng
        </Button>
      )}
      {actions.includes("no-show") && (
        <Button size={size} variant="ghost" className="text-danger" onClick={() => setOpen("no-show")} aria-label={`Đánh dấu không đến cho đơn ${who}`}>
          <UserX className="size-4" aria-hidden="true" /> Không đến
        </Button>
      )}

      {open === "check-in" && (
        <CheckInDialog
          booking={booking}
          onClose={() => setOpen(null)}
          onDone={(b, room) => {
            setOpen(null);
            onChanged(b, `Đã nhận phòng ${room} cho đơn ${b.bookingCode}.`);
          }}
        />
      )}
      {open === "check-out" && (
        <ConfirmDialog
          title="Xác nhận trả phòng?"
          description={`Đơn ${who} · phòng ${booking.roomNumber ?? "—"}`}
          body="Đơn chuyển sang Đã trả phòng, hệ thống ghi nhận khoản chi trả cho khách sạn và mời khách đánh giá."
          confirmLabel="Xác nhận trả phòng"
          run={() => opsService.checkOut(booking.id)}
          onClose={() => setOpen(null)}
          onDone={(b) => {
            setOpen(null);
            onChanged(b, `Đã trả phòng cho đơn ${b.bookingCode}.`);
          }}
        />
      )}
      {open === "no-show" && (
        <ConfirmDialog
          title="Đánh dấu khách không đến?"
          description={`Đơn ${who} · nhận phòng ${formatStayDate(booking.checkIn)}`}
          body="Đơn chuyển sang Không đến và không hoàn tiền. Các đêm còn lại được trả về tồn phòng để bán tiếp."
          confirmLabel="Xác nhận không đến"
          danger
          run={() => opsService.noShow(booking.id)}
          onClose={() => setOpen(null)}
          onDone={(b) => {
            setOpen(null);
            onChanged(b, `Đã đánh dấu không đến cho đơn ${b.bookingCode}.`);
          }}
        />
      )}
    </div>
  );
}

function ConfirmDialog({
  title,
  description,
  body,
  confirmLabel,
  danger,
  run,
  onClose,
  onDone,
}: {
  title: string;
  description: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  run: () => Promise<BookingDto>;
  onClose: () => void;
  onDone: (b: BookingDto) => void;
}) {
  const m = useMutation(run);
  return (
    <Dialog
      open
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Quay lại
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            loading={m.pending}
            onClick={async () => {
              const res = await m.run();
              if (res) onDone(res);
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm">{body}</p>
      {m.error && (
        <Alert tone="error" className="mt-3">
          {m.error.message}
        </Alert>
      )}
    </Dialog>
  );
}

/** Chọn đủ số phòng trống đúng loại phòng của đơn rồi nhận phòng. */
function CheckInDialog({
  booking,
  onClose,
  onDone,
}: {
  booking: BookingDto;
  onClose: () => void;
  onDone: (b: BookingDto, roomNumbers: string) => void;
}) {
  const rooms = useApiQuery(`rooms-${booking.roomTypeId}`, () => opsService.rooms(booking.roomTypeId));
  const free = (rooms.data ?? []).filter((r) => r.active && !r.occupied);
  const need = Math.max(1, booking.roomsCount);
  const [single, setSingle] = useState("");
  const [multi, setMulti] = useState<number[]>([]);
  const m = useMutation((ids: number[]) => opsService.checkIn(booking.id, ids));
  const chosenIds = need === 1 ? (single ? [Number(single)] : []) : multi;
  const ready = chosenIds.length === need;
  const numbers = free
    .filter((r) => chosenIds.includes(r.id))
    .map((r) => r.roomNumber)
    .join(", ");

  return (
    <Dialog
      open
      onClose={onClose}
      title="Nhận phòng"
      description={`Đơn ${booking.bookingCode} · ${booking.guestName} · ${booking.roomTypeName} × ${need}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Quay lại
          </Button>
          <Button
            loading={m.pending}
            disabled={!ready}
            onClick={async () => {
              if (!ready) return;
              const res = await m.run(chosenIds);
              if (res) onDone(res, numbers);
            }}
          >
            Xác nhận nhận phòng
          </Button>
        </>
      }
    >
      {rooms.loading ? (
        <Spinner label="Đang tải phòng trống…" />
      ) : rooms.error ? (
        <Alert tone="error" title="Không tải được danh sách phòng">
          {rooms.error.message}
        </Alert>
      ) : free.length < need ? (
        <Alert tone="warning">
          Chỉ còn {free.length} phòng {booking.roomTypeName} trống, đơn cần {need} phòng. Hãy trả phòng cho khách cũ trước hoặc kiểm tra phòng bị tắt.
        </Alert>
      ) : need === 1 ? (
        <SelectField id="checkin-room" label="Số phòng trống" value={single} onChange={(e) => setSingle(e.target.value)} required>
          <option value="">— Chọn phòng —</option>
          {free.map((r) => (
            <option key={r.id} value={r.id}>
              Phòng {r.roomNumber}
            </option>
          ))}
        </SelectField>
      ) : (
        <fieldset>
          <legend className="text-sm font-medium text-ink">
            Chọn {need} phòng trống <span className="text-ink-soft">(đã chọn {multi.length})</span>
          </legend>
          <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {free.map((r) => {
              const id = `checkin-room-${r.id}`;
              const checked = multi.includes(r.id);
              return (
                <li key={r.id}>
                  <label htmlFor={id} className="flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 text-sm hover:bg-brand-soft">
                    <input
                      id={id}
                      type="checkbox"
                      className="size-4 accent-brand"
                      checked={checked}
                      disabled={!checked && multi.length >= need}
                      onChange={() => setMulti((ids) => (checked ? ids.filter((x) => x !== r.id) : [...ids, r.id]))}
                    />
                    Phòng {r.roomNumber}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}
      {m.error && (
        <Alert tone="error" className="mt-3">
          {m.error.message}
        </Alert>
      )}
    </Dialog>
  );
}
