"use client";

import { useState } from "react";
import { FolderPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField, TextField } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { FACILITY_ICONS, FacilityIcon } from "@/components/shared/FacilityIcon";
import { PageHeader } from "@/components/shared/PageHeader";
import { useApiQuery, useMutation } from "@/lib/api/hooks";
import { cn } from "@/lib/utils/cn";
import type { FacilityCategoryDto, FacilityDto } from "@/types/domain";
import { adminService } from "../services/adminService";

type Deleting = { kind: "category"; item: FacilityCategoryDto } | { kind: "facility"; item: FacilityDto };

/** Danh mục tiện nghi + tiện nghi (FR-ROOM-007). Icon chọn từ danh sách lucide có sẵn. */
export function FacilityManager() {
  const q = useApiQuery("admin-facility-categories", adminService.facilityCategories);
  const [newCat, setNewCat] = useState("");
  const [catError, setCatError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<FacilityCategoryDto | null>(null);
  const [editing, setEditing] = useState<{ facility: FacilityDto | null; categoryId: number } | null>(null);
  const [deleting, setDeleting] = useState<Deleting | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const createCat = useMutation(adminService.createCategory);
  const del = useMutation((d: Deleting) => (d.kind === "category" ? adminService.deleteCategory(d.item.id) : adminService.deleteFacility(d.item.id)));

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newCat.trim();
    if (name.length < 2) {
      setCatError("Tên danh mục tối thiểu 2 ký tự.");
      return;
    }
    setCatError(null);
    const res = await createCat.run(name);
    if (res) {
      setNotice(`Đã thêm danh mục ${res.name}.`);
      setNewCat("");
      void q.reload();
    }
  }

  const done = (msg: string) => {
    setNotice(msg);
    void q.reload();
  };

  return (
    <div>
      <PageHeader title="Tiện nghi" description="Danh mục và tiện nghi dùng chung cho mọi khách sạn; chủ khách sạn gắn tiện nghi vào từng loại phòng." />
      <form onSubmit={addCategory} noValidate className="mb-4 flex flex-col gap-3 rounded-xl border border-line bg-white p-4 sm:flex-row sm:items-end">
        <TextField
          id="fc-new"
          label="Danh mục mới"
          placeholder="VD: Phòng tắm"
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          error={catError ?? createCat.error?.message}
          containerClassName="flex-1"
        />
        <Button type="submit" loading={createCat.pending}>
          <FolderPlus className="size-4" aria-hidden="true" /> Thêm danh mục
        </Button>
      </form>
      {notice && (
        <Alert tone="success" className="mb-4">
          {notice}
        </Alert>
      )}
      {q.loading && !q.data ? (
        <Spinner />
      ) : q.error ? (
        <ErrorState message={q.error.message} />
      ) : !q.data || q.data.length === 0 ? (
        <EmptyState title="Chưa có danh mục tiện nghi" />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {q.data.map((c) => (
            <li key={c.id} className="rounded-xl border border-line bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
                <h2 className="text-lg font-bold">{c.name}</h2>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setRenaming(c)} aria-label={`Đổi tên danh mục ${c.name}`}>
                    <Pencil className="size-4" aria-hidden="true" /> Đổi tên
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger"
                    onClick={() => {
                      del.reset();
                      setDeleting({ kind: "category", item: c });
                    }}
                    aria-label={`Xoá danh mục ${c.name}`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" /> Xoá
                  </Button>
                </div>
              </div>
              <ul className="mt-2 flex flex-col">
                {c.facilities.length === 0 && <li className="py-2 text-sm text-ink-soft">Chưa có tiện nghi.</li>}
                {c.facilities.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2 border-b border-line/60 py-1.5 last:border-0">
                    <span className="flex items-center gap-2 text-sm">
                      <FacilityIcon name={f.icon} className="text-brand" /> {f.name}
                      <code className="text-xs text-ink-soft">{f.icon}</code>
                    </span>
                    <span className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing({ facility: f, categoryId: c.id })} aria-label={`Sửa tiện nghi ${f.name}`}>
                        <Pencil className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        onClick={() => {
                          del.reset();
                          setDeleting({ kind: "facility", item: f });
                        }}
                        aria-label={`Xoá tiện nghi ${f.name}`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
              <Button size="sm" variant="secondary" className="mt-3" onClick={() => setEditing({ facility: null, categoryId: c.id })} aria-label={`Thêm tiện nghi vào ${c.name}`}>
                <Plus className="size-4" aria-hidden="true" /> Thêm tiện nghi
              </Button>
            </li>
          ))}
        </ul>
      )}

      {renaming && (
        <RenameCategoryDialog
          category={renaming}
          onClose={() => setRenaming(null)}
          onSaved={(c) => {
            setRenaming(null);
            done(`Đã đổi tên danh mục thành ${c.name}.`);
          }}
        />
      )}
      {editing && q.data && (
        <FacilityDialog
          facility={editing.facility}
          categoryId={editing.categoryId}
          categories={q.data}
          onClose={() => setEditing(null)}
          onSaved={(f) => {
            setEditing(null);
            done(editing.facility ? `Đã cập nhật ${f.name}.` : `Đã thêm tiện nghi ${f.name}.`);
          }}
        />
      )}
      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={deleting?.kind === "category" ? "Xoá danh mục?" : "Xoá tiện nghi?"}
        description={deleting?.item.name}
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
                const res = await del.run(deleting);
                if (res !== undefined) {
                  setDeleting(null);
                  done(`Đã xoá ${deleting.item.name}.`);
                }
              }}
            >
              Xác nhận xoá
            </Button>
          </>
        }
      >
        <p className="text-sm">
          {deleting?.kind === "category"
            ? "Chỉ xoá được danh mục không còn tiện nghi."
            : "Tiện nghi sẽ bị gỡ khỏi các loại phòng đang dùng (tuỳ backend có cho phép hay không)."}
        </p>
        {del.error && (
          <Alert tone="error" className="mt-3">
            {del.error.message}
          </Alert>
        )}
      </Dialog>
    </div>
  );
}

function RenameCategoryDialog({ category, onClose, onSaved }: { category: FacilityCategoryDto; onClose: () => void; onSaved: (c: FacilityCategoryDto) => void }) {
  const [name, setName] = useState(category.name);
  const m = useMutation((n: string) => adminService.updateCategory(category.id, n));
  async function save() {
    if (name.trim().length < 2) return;
    const res = await m.run(name.trim());
    if (res) onSaved(res);
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title="Đổi tên danh mục"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
          <Button onClick={save} loading={m.pending} disabled={name.trim().length < 2}>
            Lưu
          </Button>
        </>
      }
    >
      <TextField id="fc-rename" label="Tên danh mục" value={name} onChange={(e) => setName(e.target.value)} error={m.error?.message} />
    </Dialog>
  );
}

function FacilityDialog({
  facility,
  categoryId,
  categories,
  onClose,
  onSaved,
}: {
  facility: FacilityDto | null;
  categoryId: number;
  categories: FacilityCategoryDto[];
  onClose: () => void;
  onSaved: (f: FacilityDto) => void;
}) {
  const [name, setName] = useState(facility?.name ?? "");
  const [icon, setIcon] = useState(facility?.icon ?? "check");
  const [cat, setCat] = useState(String(facility?.categoryId ?? categoryId));
  const [error, setError] = useState<string | null>(null);
  const m = useMutation((p: { name: string; icon: string; categoryId: number }) =>
    facility ? adminService.updateFacility(facility.id, p) : adminService.createFacility(p),
  );

  async function save() {
    if (name.trim().length < 2) {
      setError("Tên tiện nghi tối thiểu 2 ký tự.");
      return;
    }
    setError(null);
    const res = await m.run({ name: name.trim(), icon, categoryId: Number(cat) });
    if (res) onSaved(res);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={facility ? `Sửa tiện nghi ${facility.name}` : "Thêm tiện nghi"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
          <Button onClick={save} loading={m.pending}>
            {facility ? "Lưu thay đổi" : "Thêm tiện nghi"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id="fa-name" label="Tên tiện nghi" value={name} onChange={(e) => setName(e.target.value)} error={error ?? m.fieldErrors.name} required />
        <SelectField id="fa-cat" label="Danh mục" value={cat} onChange={(e) => setCat(e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium text-ink">
            Biểu tượng <span className="text-ink-soft">(đang chọn: {FACILITY_ICONS[icon]?.label ?? icon})</span>
          </legend>
          <div className="mt-2 grid max-h-64 grid-cols-3 gap-1.5 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-4">
            {Object.entries(FACILITY_ICONS).map(([key, meta]) => {
              const id = `fa-icon-${key}`;
              const checked = icon === key;
              return (
                <label
                  key={key}
                  htmlFor={id}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-2 text-xs transition-colors duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand",
                    checked ? "border-brand bg-brand-soft font-semibold" : "border-transparent hover:bg-brand-soft",
                  )}
                >
                  <input id={id} type="radio" name="facility-icon" value={key} checked={checked} onChange={() => setIcon(key)} className="sr-only" />
                  <FacilityIcon name={key} className="size-5 text-brand" />
                  <span className="truncate">{meta.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        {m.error && !m.error.errors.length && (
          <Alert tone="error" className="sm:col-span-2">
            {m.error.message}
          </Alert>
        )}
      </div>
    </Dialog>
  );
}
