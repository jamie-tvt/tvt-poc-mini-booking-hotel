// Build bản demo offline rồi nhúng JS/CSS vào MỘT file HTML (mở bằng file:// là chạy).
// Dùng: npm run build:offline  →  review-html/BookingHotel_Demo.html (ở gốc POC)
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, "dist");
const out = path.resolve(here, "../../../review-html/BookingHotel_Demo.html");

await build({ configFile: path.join(here, "vite.config.ts"), logLevel: "warn" });

let html = readFileSync(path.join(dist, "index.html"), "utf8");
html = html.replace(/<script type="module" crossorigin src="\.\/([^"]+)"><\/script>/g, (_, f) => {
  const js = readFileSync(path.join(dist, f), "utf8").replace(/<\/script/gi, "<\\/script");
  return `<script type="module">${js}</script>`;
});
html = html.replace(/<link rel="stylesheet" crossorigin href="\.\/([^"]+)">/g, (_, f) => `<style>${readFileSync(path.join(dist, f), "utf8")}</style>`);
if (/(src|href)="\.\/assets/.test(html)) throw new Error("Còn asset chưa nhúng: " + readdirSync(path.join(dist, "assets")).join(", "));

mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`Đã tạo ${path.relative(process.cwd(), out)} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
