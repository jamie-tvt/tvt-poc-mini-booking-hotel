/**
 * Router cho bản offline: đọc cấu trúc App Router của Next (src/app/**) lúc build,
 * khớp #/đường-dẫn → page.tsx + chuỗi layout.tsx (bỏ route group "(...)").
 * Page async (Server Component) được gọi như hàm rồi render kết quả.
 */
import { Component, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { APP_NAME } from "@/lib/config/env";
import NotFoundPage from "@/app/not-found";
import {
  NotFoundSignal,
  RedirectSignal,
  navigate,
  scrollToAnchor,
  useDemoLocation,
  useDemoLocationKey,
} from "./shims/navigation";

type PageModule = { default: ComponentType<any>; metadata?: { title?: unknown } };
type LayoutModule = { default: ComponentType<{ children: ReactNode }> };

const pages = import.meta.glob<PageModule>("../src/app/**/page.tsx", { eager: true });
const layouts = import.meta.glob<LayoutModule>("../src/app/**/layout.tsx", { eager: true });

interface Route {
  segments: string[]; // "tours", ":id"
  module: PageModule;
  layoutChain: LayoutModule[];
  score: number;
}

const PREFIX = "../src/app";

function buildRoutes(): Route[] {
  const routes: Route[] = [];
  for (const [file, module] of Object.entries(pages)) {
    const dir = file.slice(PREFIX.length).replace(/\/page\.tsx$/, ""); // "/(public)/tours/[id]"
    const rawSegs = dir.split("/").filter(Boolean);
    const segments = rawSegs.filter((s) => !/^\(.*\)$/.test(s)).map((s) => (s.startsWith("[") ? `:${s.slice(1, -1)}` : s));
    // Layout từ ngoài vào trong; bỏ layout gốc (src/app/layout.tsx) vì offline-demo tự dựng khung <html>.
    const layoutChain: LayoutModule[] = [];
    for (let i = 1; i <= rawSegs.length; i++) {
      const l = layouts[`${PREFIX}/${rawSegs.slice(0, i).join("/")}/layout.tsx`];
      if (l) layoutChain.push(l);
    }
    const score = segments.reduce((acc, s) => acc * 3 + (s.startsWith(":") ? 1 : 2), 1);
    routes.push({ segments, module, layoutChain, score });
  }
  return routes.sort((a, b) => b.segments.length - a.segments.length || b.score - a.score);
}

const ROUTES = buildRoutes();

function match(pathname: string): { route: Route; params: Record<string, string> } | null {
  const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  for (const route of ROUTES) {
    if (route.segments.length !== parts.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < parts.length; i++) {
      const s = route.segments[i];
      if (s.startsWith(":")) params[s.slice(1)] = parts[i];
      else if (s !== parts[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return { route, params };
  }
  return null;
}

function setTitle(meta: unknown) {
  const t = typeof meta === "string" ? meta : null;
  document.title = t ? `${t} | ${APP_NAME}` : `${APP_NAME} — Đặt phòng miền Tây (bản demo)`;
}

function isAsync(fn: unknown): boolean {
  return typeof fn === "function" && fn.constructor?.name === "AsyncFunction";
}

/** Chạy Server Component async ở phía trình duyệt. */
function AsyncPage({ page, props }: { page: (p: unknown) => Promise<ReactNode>; props: unknown }) {
  const [state, setState] = useState<{ node?: ReactNode; error?: unknown }>({});
  useEffect(() => {
    let alive = true;
    page(props).then(
      (node) => alive && setState({ node }),
      (error) => alive && setState({ error }),
    );
    return () => {
      alive = false;
    };
  }, [page, props]);
  if (state.error) throw state.error;
  if (state.node === undefined) return <Spinner label="Đang tải…" />;
  return <>{state.node}</>;
}

class Boundary extends Component<{ children: ReactNode; resetKey: string }, { error: unknown }> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  componentDidCatch(error: unknown) {
    if (error instanceof RedirectSignal) setTimeout(() => navigate(error.href, { replace: true }), 0);
  }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (error instanceof RedirectSignal) return <Spinner label="Đang chuyển trang…" />;
    if (error instanceof NotFoundSignal) return <NotFoundPage />;
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Đã có lỗi xảy ra</h1>
        <p className="mt-2 text-ink-soft">{error instanceof Error ? error.message : String(error)}</p>
        <button type="button" className="mt-4 font-semibold text-brand underline" onClick={() => navigate("/")}>
          Về trang chủ
        </button>
      </div>
    );
  }
}

export function DemoRouter() {
  const key = useDemoLocationKey();
  const loc = useDemoLocation();
  const found = match(loc.pathname);

  useEffect(() => {
    setTitle(found?.route.module.metadata?.title);
    if (loc.anchor) scrollToAnchor(loc.anchor);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const props = useMemo(
    () => ({
      params: Promise.resolve(found?.params ?? {}),
      searchParams: Promise.resolve(Object.fromEntries(new URLSearchParams(loc.search))),
    }),
    [key], // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!found) return <NotFoundPage />;
  const { route } = found;
  const Page = route.module.default;

  let node: ReactNode = isAsync(Page) ? (
    <AsyncPage key={key} page={Page as unknown as (p: unknown) => Promise<ReactNode>} props={props} />
  ) : (
    <Page key={key} {...props} />
  );
  for (let i = route.layoutChain.length - 1; i >= 0; i--) {
    const Layout = route.layoutChain[i].default;
    node = <Layout>{node}</Layout>;
  }
  return <Boundary resetKey={key}>{node}</Boundary>;
}
