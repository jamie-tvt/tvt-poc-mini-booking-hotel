"use client";

import { useState } from "react";
import { DoorOpen, Plus, Power, PowerOff } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useApiQuery, useMutation } from "@/lib/api/hooks";
import type { RoomDto, RoomTypeDto } from "@/types/domain";
import { portalHotelService } from "../services/portalHotelService";
import { RoomTypePicker } from "./RoomTypePicker";

/** Số phòng của từng loại: thêm phòng, bật/tắt (thay đổi tồn phòng các đêm tương lai). */
export function RoomManager({ roomTypes, loading }: { roomTypes: RoomTypeDto[]; loading: boolean }) {
  const [picked, setPicked] = useState<number | null>(null);
  const roomTypeId = picked ?? roomTypes[0]?.id ?? null;
  const rooms = useApiQuery(`rooms-${roomTypeId}`, () => portalHotelService.rooms(roomTypeId!), roomTypeId !== null);
  const [number, setNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const add = useMutation((n: string) => portalHotelService.createRoom(roomTypeId!, n));
  const toggle = useMutation((r: RoomDto) => portalHotelService.updateRoom(r.id, { roomNumber: r.roomNumber, active: !r.active }));

  if (loading && roomTypes.length === 0) return <Spinner />;
  if (roomTypes.length === 0) return <EmptyState icon={DoorOpen} title="Chưa có loại phòng" description="Tạo loại phòng trước, sau đó thêm số phòng." />;

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const n = number.trim();
    if (!/^[A-Za-z0-9-]{1,10}$/.test(n)) {
      setError("Số phòng gồm chữ/số, tối đa 10 ký tự (VD 101, A12).");
      return;
    }
    setError(null);
    const res = await add.run(n);
    if (res) {
      setNotice(`Đã thêm phòng ${res.roomNumber}.`);
      setNumber("");
      void rooms.reload();
    }
  }

  const err = add.error ?? toggle.error;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4 sm:flex-row sm:items-end">
        <RoomTypePicker id="rm-type" roomTypes={roomTypes} value={roomTypeId} onChange={setPicked} />
        <form onSubmit={onAdd} noValidate className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
          <TextField id="rm-number" label="Số phòng mới" placeholder="VD 101" value={number} onChange={(e) => setNumber(e.target.value)} error={error ?? undefined} />
          <Button type="submit" loading={add.pending}>
            <Plus className="size-4" aria-hidden="true" /> Thêm phòng
          </Button>
        </form>
      </div>
      {notice && <Alert tone="success">{notice}</Alert>}
      {err && <Alert tone="error">{err.message}</Alert>}
      {rooms.loading && !rooms.data ? (
        <Spinner />
      ) : rooms.error ? (
        <ErrorState message={rooms.error.message} />
      ) : !rooms.data || rooms.data.length === 0 ? (
        <EmptyState icon={DoorOpen} title="Loại phòng này chưa có phòng" description="Thêm số phòng để mở bán — mỗi phòng hoạt động tăng tồn phòng các đêm tương lai." />
      ) : (
        <Table caption="Danh sách phòng">
          <thead>
            <tr>
              <Th>Số phòng</Th>
              <Th>Hoạt động</Th>
              <Th>Tình trạng</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {rooms.data.map((r) => (
              <tr key={r.id}>
                <Td className="font-semibold">{r.roomNumber}</Td>
                <Td>{r.active ? <Badge tone="success">Đang bán</Badge> : <Badge tone="neutral">Đã tắt</Badge>}</Td>
                <Td>{r.occupied ? <Badge tone="info">Có khách</Badge> : <span className="text-ink-soft">Trống</span>}</Td>
                <Td className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className={r.active ? "text-danger" : ""}
                    onClick={async () => {
                      const res = await toggle.run(r);
                      if (res) {
                        setNotice(`${res.active ? "Đã bật" : "Đã tắt"} phòng ${res.roomNumber}.`);
                        void rooms.reload();
                      }
                    }}
                    disabled={toggle.pending}
                    aria-label={`${r.active ? "Tắt" : "Bật"} phòng ${r.roomNumber}`}
                  >
                    {r.active ? <PowerOff className="size-4" aria-hidden="true" /> : <Power className="size-4" aria-hidden="true" />}
                    {r.active ? "Tắt" : "Bật"}
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
