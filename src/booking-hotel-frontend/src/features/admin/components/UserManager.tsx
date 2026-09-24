"use client";

import { useState } from "react";
import { Lock, Search, Unlock, UserCog, UserPlus } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField, TextField } from "@/components/ui/Field";
import { ButtonPagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { useApiQuery, useMutation } from "@/lib/api/hooks";
import { useAuth } from "@/lib/auth/AuthProvider";
import { formatDate } from "@/lib/utils/format";
import { ROLE_LABEL, ROLES } from "@/lib/utils/labels";
import { zodFieldErrors } from "@/lib/utils/validation";
import type { Role, UserDto } from "@/types/domain";

/** Vai trò admin gán trực tiếp được (nhân viên khách sạn phải gắn khách sạn → tạo ở Hotel Portal). */
const ASSIGNABLE_ROLES: Role[] = ["CUSTOMER", "HOTEL_OWNER", "ADMIN"];
import { adminService } from "../services/adminService";
import { createUserSchema, type CreateUserValues } from "../validators/userSchemas";

export function UserManager() {
  const { user: me } = useAuth();
  const [kwInput, setKwInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserDto | null>(null);
  const [toggling, setToggling] = useState<UserDto | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const q = useApiQuery(`users-${keyword}-${role}-${page}`, () =>
    adminService.users({ keyword: keyword || undefined, role: role || undefined, page }),
  );
  const toggle = useMutation(adminService.setActive);

  async function confirmToggle() {
    if (!toggling) return;
    const res = await toggle.run(toggling.id, !toggling.active);
    if (res !== undefined) {
      setNotice(toggling.active ? `Đã khoá tài khoản ${toggling.email}.` : `Đã mở khoá tài khoản ${toggling.email}.`);
      setToggling(null);
      void q.reload();
    }
  }

  return (
    <div>
      <PageHeader
        title="Người dùng"
        description="Quản lý tài khoản và phân quyền. Nhân viên khách sạn do chủ khách sạn tạo trong Hotel Portal."
        actions={
          <Button onClick={() => setCreating(true)}>
            <UserPlus className="size-4" aria-hidden="true" /> Tạo người dùng
          </Button>
        }
      />
      <form
        className="mb-4 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setKeyword(kwInput.trim());
          setPage(0);
        }}
      >
        <TextField id="u-keyword" label="Tìm người dùng" placeholder="Tên hoặc email" value={kwInput} onChange={(e) => setKwInput(e.target.value)} />
        <SelectField
          id="u-role"
          label="Vai trò"
          value={role}
          onChange={(e) => {
            setRole(e.target.value as Role | "");
            setPage(0);
          }}
        >
          <option value="">Tất cả vai trò</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </SelectField>
        <Button type="submit">
          <Search className="size-4" aria-hidden="true" /> Tìm kiếm
        </Button>
      </form>
      {notice && <Alert tone="success" className="mb-4">{notice}</Alert>}

      {q.loading ? (
        <Spinner />
      ) : q.error ? (
        <ErrorState message={q.error.message} />
      ) : !q.data || q.data.content.length === 0 ? (
        <EmptyState title="Không có người dùng phù hợp" />
      ) : (
        <>
          <Table caption="Danh sách người dùng">
            <thead>
              <tr>
                <Th>Họ tên</Th>
                <Th>Email</Th>
                <Th>Điện thoại</Th>
                <Th>Vai trò</Th>
                <Th>Khách sạn</Th>
                <Th>Trạng thái</Th>
                <Th>Ngày tạo</Th>
                <Th className="text-right">Thao tác</Th>
              </tr>
            </thead>
            <tbody>
              {q.data.content.map((u) => {
                const isMe = u.id === me?.id;
                return (
                  <tr key={u.id}>
                    <Td className="font-semibold">
                      {u.fullName}
                      {isMe && <span className="ml-1 text-xs font-normal text-ink-soft">(bạn)</span>}
                    </Td>
                    <Td className="break-all">{u.email}</Td>
                    <Td>{u.phone ?? "—"}</Td>
                    <Td>{ROLE_LABEL[u.role]}</Td>
                    <Td>{u.hotelName ?? "—"}</Td>
                    <Td>{u.active ? <Badge tone="success">Hoạt động</Badge> : <Badge tone="danger">Đã khoá</Badge>}</Td>
                    <Td>{formatDate(u.createdAt)}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        {u.role !== "HOTEL_STAFF" && (
                          <Button size="sm" variant="ghost" onClick={() => setEditing(u)} aria-label={`Đổi vai trò ${u.email}`}>
                            <UserCog className="size-4" aria-hidden="true" /> Đổi vai trò
                          </Button>
                        )}
                        {!isMe && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className={u.active ? "text-danger" : ""}
                            onClick={() => setToggling(u)}
                            aria-label={`${u.active ? "Khoá" : "Mở khoá"} tài khoản ${u.email}`}
                          >
                            {u.active ? <Lock className="size-4" aria-hidden="true" /> : <Unlock className="size-4" aria-hidden="true" />}
                            {u.active ? "Khoá" : "Mở khoá"}
                          </Button>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <ButtonPagination page={q.data.page} totalPages={q.data.totalPages} onChange={setPage} />
        </>
      )}

      {creating && (
        <CreateUserDialog
          onClose={() => setCreating(false)}
          onCreated={(u) => {
            setCreating(false);
            setNotice(`Đã tạo tài khoản ${u.email}.`);
            void q.reload();
          }}
        />
      )}
      {editing && (
        <EditRoleDialog
          user={editing}
          isMe={editing.id === me?.id}
          onClose={() => setEditing(null)}
          onSaved={(u) => {
            setEditing(null);
            setNotice(`Đã cập nhật vai trò của ${u.email} thành ${ROLE_LABEL[u.role]}.`);
            void q.reload();
          }}
        />
      )}
      <Dialog
        open={!!toggling}
        onClose={() => {
          setToggling(null);
          toggle.reset();
        }}
        title={toggling?.active ? "Khoá tài khoản?" : "Mở khoá tài khoản?"}
        description={toggling?.email}
        footer={
          <>
            <Button variant="secondary" onClick={() => setToggling(null)}>
              Quay lại
            </Button>
            <Button variant={toggling?.active ? "danger" : "primary"} onClick={confirmToggle} loading={toggle.pending}>
              {toggling?.active ? "Xác nhận khoá" : "Xác nhận mở khoá"}
            </Button>
          </>
        }
      >
        <p className="text-sm">
          {toggling?.active ? "Người dùng sẽ bị đăng xuất khỏi mọi thiết bị và không đăng nhập được." : "Người dùng có thể đăng nhập lại."}
        </p>
        {toggle.error && <Alert tone="error" className="mt-3">{toggle.error.message}</Alert>}
      </Dialog>
    </div>
  );
}

function CreateUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (u: UserDto) => void }) {
  const [v, setV] = useState<Record<keyof CreateUserValues, string>>({ fullName: "", email: "", password: "", phone: "", role: "CUSTOMER" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation(adminService.createUser);
  const set = (k: keyof CreateUserValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((p) => ({ ...p, [k]: e.target.value }));

  async function submit() {
    const parsed = createUserSchema.safeParse(v);
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
      title="Tạo người dùng"
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
        <TextField id="cu-name" label="Họ và tên" value={v.fullName} onChange={set("fullName")} error={fe.fullName} required />
        <TextField id="cu-email" label="Email" type="email" value={v.email} onChange={set("email")} error={fe.email} required />
        <TextField id="cu-password" label="Mật khẩu" type="password" autoComplete="new-password" value={v.password} onChange={set("password")} error={fe.password} required />
        <TextField id="cu-phone" label="Số điện thoại" type="tel" value={v.phone ?? ""} onChange={set("phone")} error={fe.phone} />
        <SelectField id="cu-role" label="Vai trò" value={v.role} onChange={set("role")} error={fe.role} required>
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </SelectField>
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

function EditRoleDialog({ user, isMe, onClose, onSaved }: { user: UserDto; isMe: boolean; onClose: () => void; onSaved: (u: UserDto) => void }) {
  const [role, setRole] = useState<Role>(user.role);
  const m = useMutation(adminService.updateUser);

  async function save() {
    const res = await m.run(user.id, { fullName: user.fullName, phone: user.phone || undefined, role });
    if (res) onSaved(res);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Đổi vai trò"
      description={`${user.fullName} — ${user.email}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
          <Button onClick={save} loading={m.pending} disabled={role === user.role}>
            Lưu vai trò
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <SelectField id="er-role" label="Vai trò mới" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </SelectField>
        {isMe && <Alert tone="warning">Bạn không thể tự hạ quyền của chính mình.</Alert>}
        {m.error && <Alert tone="error">{m.error.message}</Alert>}
      </div>
    </Dialog>
  );
}
