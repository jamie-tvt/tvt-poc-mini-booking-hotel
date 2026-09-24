/**
 * Thay next/navigation: định tuyến bằng phần "#" của URL (#/tours/1?x=y) để chạy được qua file://.
 * Giữ đúng chữ ký hook mà code trong src/ đang dùng.
 */
import { useMemo, useSyncExternalStore } from "react";

export interface DemoLocation {
  pathname: string;
  search: string; // gồm dấu "?" hoặc rỗng
  anchor: string; // phần sau dấu # thứ hai (VD "reviews"), rỗng nếu không có
}

const listeners = new Set<() => void>();
let refreshTick = 0;

function readHash(): string {
  const h = window.location.hash;
  return h.startsWith("#/") ? h.slice(1) : "/";
}

export function parseHref(href: string): DemoLocation {
  let rest = href.startsWith("#") ? href.slice(1) : href;
  if (!rest.startsWith("/")) rest = "/" + rest;
  let anchor = "";
  const hashAt = rest.indexOf("#");
  if (hashAt >= 0) {
    anchor = rest.slice(hashAt + 1);
    rest = rest.slice(0, hashAt);
  }
  const q = rest.indexOf("?");
  const pathname = (q >= 0 ? rest.slice(0, q) : rest).replace(/\/+$/, "") || "/";
  const search = q >= 0 && rest.length > q + 1 ? rest.slice(q) : "";
  return { pathname, search, anchor };
}

export function currentLocation(): DemoLocation {
  return parseHref(readHash());
}

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Chuỗi đại diện cho "trang hiện tại" — đổi khi điều hướng hoặc router.refresh(). */
function snapshot(): string {
  return `${readHash()}|${refreshTick}`;
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", emit);
  window.addEventListener("hashchange", emit);
}

export function navigate(href: string, opts: { replace?: boolean; scroll?: boolean } = {}) {
  if (/^https?:\/\//.test(href)) {
    window.open(href, "_blank", "noopener");
    return;
  }
  const loc = parseHref(href);
  const target = `#${loc.pathname}${loc.search}${loc.anchor ? `#${loc.anchor}` : ""}`;
  if (target === window.location.hash) {
    if (loc.anchor) scrollToAnchor(loc.anchor);
    return;
  }
  if (opts.replace) history.replaceState(null, "", target);
  else history.pushState(null, "", target);
  emit();
  if (opts.scroll !== false && !loc.anchor) window.scrollTo({ top: 0 });
}

export function scrollToAnchor(id: string) {
  // Chờ trang render xong rồi mới cuộn tới mục
  let tries = 0;
  const tick = () => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else if (tries++ < 40) setTimeout(tick, 50);
  };
  tick();
}

export function useDemoLocationKey(): string {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function useDemoLocation(): DemoLocation {
  const key = useDemoLocationKey();
  return useMemo(() => currentLocation(), [key]);
}

// ------------------------------------------------------------------ API giống next/navigation

export function usePathname(): string {
  return useDemoLocation().pathname;
}

export function useSearchParams(): URLSearchParams {
  const { search } = useDemoLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function useParams(): Record<string, string> {
  return {};
}

const router = {
  push: (href: string, opts?: { scroll?: boolean }) => navigate(href, { scroll: opts?.scroll }),
  replace: (href: string, opts?: { scroll?: boolean }) => navigate(href, { replace: true, scroll: opts?.scroll }),
  back: () => history.back(),
  forward: () => history.forward(),
  refresh: () => {
    refreshTick++;
    emit();
  },
  prefetch: () => undefined,
};

export function useRouter() {
  return router;
}

export class NotFoundSignal extends Error {
  constructor() {
    super("NEXT_NOT_FOUND");
  }
}

export class RedirectSignal extends Error {
  constructor(public href: string) {
    super("NEXT_REDIRECT");
  }
}

export function notFound(): never {
  throw new NotFoundSignal();
}

export function redirect(href: string): never {
  throw new RedirectSignal(href);
}

export const permanentRedirect = redirect;
