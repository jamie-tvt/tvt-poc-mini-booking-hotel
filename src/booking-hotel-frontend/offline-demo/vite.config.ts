/**
 * Bản demo offline: build CHÍNH giao diện Next.js (src/) thành 1 file HTML chạy bằng file://.
 * - next/link, next/navigation → shim điều hướng bằng #/đường-dẫn (offline-demo/shims)
 * - Backend Spring Boot → API giả lập trong trình duyệt (offline-demo/mock), dữ liệu lưu localStorage
 * Chạy: npm run build:offline  →  ../../review-html/BookingHotel_Demo.html
 */
import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/postcss";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, "..");
export const DEMO_API = "https://api.demo.local/api/v1";

/** Vá vài chỗ code gọi thẳng window.location (không đi qua router) để chạy được trên file://. */
function patchBrowserNavigation(): Plugin {
  return {
    name: "offline-demo-patch-navigation",
    enforce: "pre",
    transform(code, id) {
      if (!id.startsWith(path.join(frontend, "src"))) return null;
      let out = code.replace(/window\.location\.assign\(/g, "window.__demoNavigate(");
      if (id.endsWith(path.join("lib", "api", "client.ts"))) {
        out = out.replace("const { pathname, search } = window.location;", "const { pathname, search } = window.__demoLocation();");
      }
      return out === code ? null : { code: out, map: null };
    },
  };
}

export default defineConfig({
  root: here,
  base: "./",
  plugins: [patchBrowserNavigation(), react()],
  resolve: {
    alias: [
      { find: /^next\/link$/, replacement: path.join(here, "shims/link.tsx") },
      { find: /^next\/navigation$/, replacement: path.join(here, "shims/navigation.ts") },
      { find: /^next\/font\/google$/, replacement: path.join(here, "shims/font.ts") },
      { find: /^@\//, replacement: path.join(frontend, "src") + "/" },
    ],
  },
  define: {
    "process.env.NEXT_PUBLIC_API_URL": JSON.stringify(DEMO_API),
    "process.env.API_INTERNAL_URL": JSON.stringify(DEMO_API),
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  css: { postcss: { plugins: [tailwind({ base: frontend })] } },
  build: {
    outDir: path.join(here, "dist"),
    emptyOutDir: true,
    target: "es2020",
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
