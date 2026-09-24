/** Điểm vào bản demo offline: cài API giả lập → dựng khung giống src/app/layout.tsx → router theo #. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { installMockApi } from "./mock/server";
import { installImageMapping } from "./mock/images";
import { NotFoundSignal, RedirectSignal, navigate, currentLocation } from "./shims/navigation";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PUBLIC_API_URL } from "@/lib/config/env";
import { DemoRouter } from "./router";
import { DemoPanel } from "./DemoPanel";
import "@/styles/globals.css";

declare global {
  interface Window {
    __demoNavigate: (href: string) => void;
    __demoLocation: () => { pathname: string; search: string };
  }
}

installMockApi(PUBLIC_API_URL);
installImageMapping();

// Code trong src/ gọi window.location.assign(...) → đi qua router (vite.config.ts vá lúc build)
window.__demoNavigate = (href) => navigate(href);
window.__demoLocation = () => currentLocation();

// Link thường <a href="/..."> (không qua next/link) → cũng điều hướng bằng #
document.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as Element | null)?.closest?.("a");
  const href = a?.getAttribute("href");
  if (!a || !href || a.target === "_blank") return;
  if (href.startsWith("/") && !href.startsWith("//")) {
    e.preventDefault();
    navigate(href);
  } else if (href.startsWith("#") && !href.startsWith("#/")) {
    // Neo trong trang (#departures) — cuộn, không đổi route
    e.preventDefault();
    document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

if (!window.location.hash.startsWith("#/")) history.replaceState(null, "", "#/");

createRoot(document.getElementById("root")!, {
  // redirect()/notFound() là tín hiệu điều hướng (như Next), router đã xử lý — không log thành lỗi
  onCaughtError(error, info) {
    if (error instanceof RedirectSignal || error instanceof NotFoundSignal) return;
    console.error(error, info.componentStack);
  },
}).render(
  <StrictMode>
    <AuthProvider>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <DemoRouter />
      </main>
      <DemoPanel />
    </AuthProvider>
  </StrictMode>,
);
