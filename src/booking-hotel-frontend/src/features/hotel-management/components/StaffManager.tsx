"use client";

import { useState } from "react";
import { Lock, Unlock, UserPlus, Users } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useApiQuery, useMutation } from "@/lib/api/hooks";
import { formatDate } from "@/lib/utils/format";
import { zodFieldErrors } from "@/lib/utils/validation";
import type { UserDto } from "@/types/domain";
import { portalHotelService, type StaffPayload } from "../services/portalHotelService";
import { staffSchema } from "../validators/hotelSchemas";

/** Nhân viên lễ tân của khách sạn (FR-USR-004/005): tạo tài khoản, khoá/mở. */
export function StaffManager({ hotelId }: { hotelId: number }) {
  const q = useApiQuery(`staff-${hotelId}`, () => portalHotelService.staff(hotelId));
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const toggle = useMutation((u: UserDto) => portalHotelService.setStaffActive(u.id, !u.active));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-soft">Nhân viên chỉ thấy khách sạn này và dùng màn Lễ tân để nhận/trả phòng.</p>
        <Button onClick={() => setCreating(true)}>
          <UserPlus className="size-4" aria-hidden="true" /> Tạo tài khoản nhân viên
        </Button>
      </div>
      {notice && <Alert tone="success">{notice}</Alert>}
      {toggle.error && <Alert tone="error">{toggle.error.message}</Alert>}
      {q.loading && !q.data ? (
        <Spinner />
      ) : q.error ? (
        <ErrorState message={q.error.message} />
      ) : !q.data || q.data.length === 0 ? (
        <EmptyState icon={Users} title="Chưa có nhân viên" />
      ) : (
        <Table caption="Nhân viên khách sạn">
          <thead>
            <tr>
              <Th>Họ tên</Th>
              <Th>Email</Th>
              <Th>Điện thoại</Th>
              <Th>Trạng thái</Th>
              <Th>Ngày tạo</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {q.data.map((u) => (
              <tr key={u.id}>
                <Td className="font-semibold">{u.fullName}</Td>
                <Td className="break-all">{u.email}</Td>
                <Td>{u.phone ?? "—"}</Td>
                <Td>{u.active ? <Badge tone="success">Hoạt động</Badge> : <Badge tone="danger">Đã khoá</Badge>}</Td>
                <Td>{formatDate(u.createdAt)}</Td>
                <Td className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className={u.active ? "text-danger" : ""}
                    disabled={toggle.pending}
                    onClick={async () => {
                      const res = await toggle.run(u);
                      if (res) {
                        setNotice(`${res.active ? "Đã mở khoá" : "Đã khoá"} tài khoản ${res.email}.`);
                        void q.reload();
                      }
                    }}
                    aria-label={`${u.active ? "Khoá" : "Mở khoá"} tài khoản ${u.email}`}
                  >
                    {u.active ? <Lock className="size-4" aria-hidden="true" /> : <Unlock className="size-4" aria-hidden="true" />}
                    {u.active ? "Khoá" : "Mở khoá"}
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {creating && (
        <CreateStaffDialog
          hotelId={hotelId}
          onClose={() => setCreating(false)}
          onCreated={(u) => {
            setCreating(false);
            setNotice(`Đã tạo tài khoản ${u.email}.`);
            void q.reload();
          }}
        />
      )}
    </div>
  );
}

function CreateStaffDialog({ hotelId, onClose, onCreated }: { hotelId: number; onClose: () => void; onCreated: (u: UserDto) => void }) {
  const [v, setV] = useState({ fullName: "", email: "", password: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation((p: StaffPayload) => portalHotelService.createStaff(hotelId, p));
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((p) => ({ ...p, [k]: e.target.value }));

  async function submit() {
    const parsed = staffSchema.safeParse(v);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    const res = await m.run(parsed.data);
    if (res) onCreated(res);
  }
  const fe = { ...m.fieldErrors, ...errors };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Tạo tài khoản nhân viên"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
          <Button onClick={submit} loading={m.pending}>
            Tạo tài khoản
          </Button>
        </>
      }
    >
      <form
        noValidate
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <TextField id="st-name" label="Họ và tên" value={v.fullName} onChange={set("fullName")} error={fe.fullName} required />
        <TextField id="st-email" label="Email" type="email" value={v.email} onChange={set("email")} error={fe.email} required />
        <TextField id="st-password" label="Mật khẩu" type="password" autoComplete="new-password" value={v.password} onChange={set("password")} error={fe.password} required hint="Tối thiểu 8 ký tự" />
        <TextField id="st-phone" label="Số điện thoại" type="tel" value={v.phone} onChange={set("phone")} error={fe.phone} />
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
