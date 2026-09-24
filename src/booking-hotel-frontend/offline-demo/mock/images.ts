/**
 * Ảnh minh hoạ (public/images/hotels|rooms/*.svg) nhúng thẳng vào file HTML dưới dạng data URL.
 * Code trong src/ dùng đường dẫn "/images/..." — installImageMapping() đổi sang data URL ngay khi gán vào <img>,
 * nên không phải sửa file nguồn nào.
 */
const files = import.meta.glob<string>("../../public/images/**/*.svg", { eager: true, query: "?url", import: "default" });

const byPath: Record<string, string> = {};
for (const [file, url] of Object.entries(files)) byPath[file.replace(/^.*\/public/, "")] = url;

export function imageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  return byPath[url] ?? url;
}

export function installImageMapping() {
  const setAttr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name: string, value: string) {
    if (this instanceof HTMLImageElement && name === "src" && typeof value === "string" && value.startsWith("/images/")) {
      value = byPath[value] ?? value;
    }
    return setAttr.call(this, name, value);
  };
  const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
  if (desc?.set) {
    Object.defineProperty(HTMLImageElement.prototype, "src", {
      ...desc,
      set(v: string) {
        desc.set!.call(this, typeof v === "string" && v.startsWith("/images/") ? (byPath[v] ?? v) : v);
      },
    });
  }
}
