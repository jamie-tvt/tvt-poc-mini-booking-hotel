/** Bảng "DEMO · hướng dẫn" góc dưới trái: đổi vai trò 1 chạm, tra cứu đơn khách vãng lai, kịch bản demo, đặt lại dữ liệu. */
import { useEffect, useRef, useState } from "react";
import { FlaskConical, RotateCcw, SearchCheck, X } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { homePathForRole } from "@/lib/auth/roles";
import { ROLE_LABEL } from "@/lib/utils/labels";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/features/auth/components/DemoAccounts";
import { bookingHref } from "@/features/booking/services/bookingService";
import { navigate, useDemoLocationKey } from "./shims/navigation";
import { GUEST_CODE, GUEST_KEY, reset } from "./mock/db";

const SEEN_KEY = "hb.demo.panel-seen";
const NAMES: Record<string, string> = { "admin@example.com": "Quản trị viên" };

const SCRIPT: { title: string; steps: string[] }[] = [
  {
    title: "1 · Khách đặt phòng (không cần tài khoản)",
    steps: [
      "Trang chủ → chọn Cần Thơ + ngày nhận/trả → Tìm → mở Ninh Kiều Riverside",
      "Chọn loại phòng → điền họ tên, email, SĐT → Giữ phòng (đồng hồ 15 phút, giá đã gồm phí nền tảng)",
      "Thanh toán → cổng giả lập Thành công / Thất bại → đơn có mã HB-…; tra cứu lại ở “Tra cứu đơn” bằng mã + email",
    ],
  },
  {
    title: "2 · Lễ tân nhận / trả phòng",
    steps: [
      "Vào như Lễ tân Phạm Văn Lộc → Lễ tân hôm nay",
      "Đơn của Nguyễn Văn Hào nhận phòng hôm nay → Nhận phòng, chọn số phòng",
      "Đơn của Trần Thị Mai đang ở → Trả phòng → sinh khoản trả khách sạn (payout), khách được mời đánh giá",
    ],
  },
  {
    title: "3 · Chủ khách sạn & quản trị",
    steps: [
      "Chủ KS Trần Minh Khoa: loại phòng, phòng, giá theo ngày, nhân viên; Mekong Lotus đang chờ duyệt",
      "Quản trị: Duyệt khách sạn → Mekong Lotus hiện ở trang tìm kiếm; Payout → đánh dấu đã chuyển; Cài đặt → phí nền tảng",
      "Công cụ demo (trang Tổng quan): bấm “+15 phút” để thấy đơn chưa trả tiền tự hết hạn, trả phòng về tồn kho",
    ],
  },
];

export function DemoPanel() {
  const { login, logout, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const locKey = useDemoLocationKey();

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) {
        setOpen(true);
        localStorage.setItem(SEEN_KEY, "1");
      }
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Chuyển trang thì thu gọn (bỏ qua lần mount để bảng vẫn tự mở lần đầu)
  const firstLoc = useRef(locKey);
  useEffect(() => {
    if (locKey !== firstLoc.current) setOpen(false);
  }, [locKey]);

  async function switchTo(email: string) {
    setBusy(email);
    try {
      if (user) await logout();
      const u = await login(email, DEMO_PASSWORD);
      navigate(homePathForRole(u.role));
      setOpen(false);
    } finally {
      setBusy(null);
    }
  }

  async function resetData() {
    if (!window.confirm("Xoá mọi thao tác đã làm và nạp lại dữ liệu mẫu?")) return;
    await logout();
    try {
      localStorage.removeItem("hb.portal.hotelId");
    } catch {
      /* bỏ qua */
    }
    reset();
    navigate("/");
    window.location.reload();
  }

  const accounts = DEMO_ACCOUNTS.filter((a) => a.name || NAMES[a.email]);

  return (
    <div ref={ref} className="fixed bottom-3 left-3 z-[60] font-sans text-sm text-ink print:hidden">
      {open && (
        <div
          role="dialog"
          aria-label="Hướng dẫn demo"
          className="mb-2 max-h-[min(78vh,660px)] w-[min(390px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-line bg-white p-4 shadow-modal"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-heading text-base font-bold">Bản demo offline — Mekong Stay</p>
              <p className="mt-0.5 text-xs text-ink-soft">
                Giao diện thật của POC; máy chủ được giả lập ngay trong trình duyệt. Dữ liệu lưu ở trình duyệt này, không gửi đi đâu.
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Đóng" className="rounded-md p-1 text-ink-soft hover:bg-muted">
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">Vào nhanh theo vai trò</p>
          <ul className="mt-1.5 grid grid-cols-1 gap-1.5">
            {accounts.map((a) => {
              const current = user?.email === a.email;
              const name = a.name ?? NAMES[a.email];
              return (
                <li key={a.email}>
                  <button
                    type="button"
                    disabled={!!busy || current}
                    onClick={() => switchTo(a.email)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-bg px-3 py-2 text-left transition-colors hover:border-brand hover:bg-brand-soft disabled:cursor-default disabled:opacity-70"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{ROLE_LABEL[a.role]} · {name}</span>
                      <span className="block truncate text-xs text-ink-soft">{a.note ?? a.email}</span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-brand">{current ? "Đang dùng" : busy === a.email ? "…" : "Vào"}</span>
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={() => navigate(bookingHref(GUEST_CODE, GUEST_KEY))}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-dashed border-line px-3 py-2 text-left transition-colors hover:border-brand hover:bg-brand-soft"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-1 font-semibold">
                    <SearchCheck className="size-4" aria-hidden="true" /> Đơn khách vãng lai {GUEST_CODE}
                  </span>
                  <span className="block truncate text-xs text-ink-soft">Tra cứu: mã {GUEST_CODE} + guest@example.com</span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-brand">Mở</span>
              </button>
            </li>
          </ul>
          <p className="mt-1.5 text-xs text-ink-soft">
            Mật khẩu mọi tài khoản: <code className="rounded bg-muted px-1 font-semibold text-ink">{DEMO_PASSWORD}</code>. Khách đặt phòng không cần tài khoản.
          </p>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">Kịch bản gợi ý</p>
          {SCRIPT.map((s) => (
            <details key={s.title} className="mt-1.5 rounded-lg border border-line px-3 py-2">
              <summary className="cursor-pointer font-semibold">{s.title}</summary>
              <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs text-ink-soft">
                {s.steps.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ol>
            </details>
          ))}

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
            <span className="text-xs text-ink-soft">Thanh toán qua cổng giả lập, không trừ tiền thật.</span>
            <button
              type="button"
              onClick={resetData}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-danger px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-danger-soft"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" /> Đặt lại dữ liệu
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full bg-cta px-3.5 py-2 font-semibold text-white shadow-pop hover:bg-cta-hover"
      >
        <FlaskConical className="size-4" aria-hidden="true" /> DEMO · hướng dẫn
      </button>
    </div>
  );
}
