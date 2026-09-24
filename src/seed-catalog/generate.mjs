#!/usr/bin/env node
/**
 * Sinh catalog dữ liệu mẫu miền Tây (kết quả cố định — cùng đầu vào luôn ra cùng file).
 *   POC Tour:  node src/seed-catalog/generate.mjs tours  src/booking-tour-backend/src/main/resources/seed/mekong-catalog.json
 *   POC Hotel: node src/seed-catalog/generate.mjs hotels src/booking-hotel-backend/src/main/resources/seed/mekong-catalog.json
 * Backend (DemoDataSeeder) và bản demo offline (offline-demo/mock/db.ts) cùng đọc file JSON đó.
 * Ảnh: link CDN Unsplash (Unsplash License) đã duyệt tay theo chủ đề trong mekong-photos.json.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PLACES, PROVINCES } from "./mekong-places.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const PHOTOS = JSON.parse(readFileSync(join(here, "mekong-photos.json"), "utf8"));
const TARGET = 200;

// ------------------------------------------------------------------ tiện ích dùng chung
function hash(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}
function rng(seed) {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const between = (r, [lo, hi]) => lo + Math.floor(r() * (hi - lo + 1));
const pick = (r, list) => list[Math.floor(r() * list.length)];
const round10k = (n) => Math.round(n / 10_000) * 10_000;
/** Giá kiểu "…90.000đ" như bảng giá tour thật. */
const tourPrice = (n) => Math.max(390_000, Math.ceil(n / 100_000) * 100_000 - 10_000);
export const unsplashUrl = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=75`;

/** Chọn ảnh theo chủ đề, xoay vòng để các mục cùng chủ đề không trùng ảnh bìa; tránh trùng trong cùng 1 mục. */
const cursors = {};
const credits = {};
function photo(theme, taken) {
  const list = PHOTOS[theme];
  if (!list?.length) throw new Error(`Chủ đề ảnh không có: ${theme}`);
  cursors[theme] ??= hash(theme) % list.length;
  for (let i = 0; i < list.length; i++) {
    const p = list[(cursors[theme] + i) % list.length];
    if (!taken.has(p.id)) {
      cursors[theme] = (cursors[theme] + i + 1) % list.length;
      taken.add(p.id);
      credits[p.id] = p.by;
      return unsplashUrl(p.id);
    }
  }
  return null; // chủ đề đã dùng hết cho mục này
}
function gallery(themes, count) {
  const taken = new Set();
  const out = [];
  for (let i = 0; out.length < count && i < count * 3; i++) {
    const url = photo(themes[i % themes.length], taken);
    if (url) out.push(url);
  }
  return out;
}
const usedCredits = (urls) => Object.fromEntries([...new Set(urls)].map((u) => {
  const id = u.match(/photo-([0-9]+-[0-9a-f]+)/)[1];
  return [id, credits[id]];
}));

// ------------------------------------------------------------------ TOUR
async function tours() {
  const { ROUTES } = await import("./tour-routes.mjs");
  const placeNames = new Set(PLACES.map((p) => p[1]));
  const CAT = { "Sông nước miền Tây": "MT", "Văn hoá – Lịch sử": "VH", "Sinh thái – Nghỉ dưỡng": "ST", "Biển đảo": "BD",
    "Ẩm thực – Làng nghề": "AT", "Miệt vườn – Nông trại": "MV" };
  const NEAR_HCM = new Set(["Tiền Giang", "Bến Tre", "Long An", "Vĩnh Long"]);
  const TIPS = {
    "cho-noi": "Chợ đông nhất từ 5 giờ 30 đến 7 giờ sáng, nên ngủ sớm đêm trước.",
    "song-nuoc": "Khi đi xuồng luôn mặc áo phao và cất điện thoại trong túi chống nước.",
    "rung-tram": "Mang áo dài tay, kem chống muỗi; ống nhòm hoặc ống kính tele giúp ngắm chim rõ hơn.",
    "ngap-man": "Lịch ca nô phụ thuộc con nước, giờ khởi hành có thể xê dịch khoảng 30 phút.",
    "bien-dao": "Biển êm nhất từ tháng 11 đến tháng 4; tàu ra đảo có thể hoãn khi biển động.",
    "chua-khmer": "Khi vào chùa nên mặc áo có tay, quần dài và bỏ giày dép trước chánh điện.",
    "am-thuc": "Báo trước nếu bạn ăn chay hoặc dị ứng hải sản để bếp chuẩn bị món thay thế.",
    "trai-cay": "Trái cây rộ nhất từ tháng 5 đến tháng 8; ngoài mùa vẫn có bưởi, chuối, dừa, khóm.",
    "lang-que": "Mang nón rộng vành, kem chống nắng và dép dễ lội nước.",
    "lang-nghe": "Sản phẩm tự tay làm được đóng gói cẩn thận để khách mang về làm quà.",
    "hoang-hon": "Hoàng hôn đẹp nhất khoảng 17 giờ 30, nhớ sạc đầy pin máy ảnh.",
    "dien-gio-muoi": "Gió biển mạnh vào buổi chiều, nên mang áo khoác mỏng.",
    "sen-hoa": "Sen nở đẹp nhất trước 9 giờ sáng, nên đi sớm để chụp ảnh.",
    "dua": "Đừng quên thử nước dừa xiêm xanh và mua kẹo dừa tại lò làm quà.",
    "ruong-lua": "Mang dép dễ lội bùn nếu muốn xuống ruộng cùng nông dân.",
    "cho-que": "Chuẩn bị tiền lẻ khi đi chợ, nhiều người bán không nhận chuyển khoản.",
  };
  const VARIANT = {
    ghep: { title: (t) => t, price: (p) => p, guests: [20, 35], text: (r) => `Tour ghép đoàn khởi hành cố định trong tuần, đón khách tại ${PROVINCES[r.p].hub}.` },
    rieng: { title: (t) => `Tour riêng: ${t}`, price: (p) => p * 1.55, guests: [6, 12],
      text: () => "Tour riêng cho gia đình hoặc nhóm bạn: xe, xuồng và hướng dẫn viên chỉ phục vụ đoàn của bạn, giờ giấc linh hoạt." },
    hcm: { title: (t) => `${t} (từ TP.HCM)`, price: (p, d) => p + 450_000 * d, guests: [25, 40],
      text: (r) => `Xe đón tại trung tâm TP.HCM lúc 6 giờ sáng, đi cao tốc Trung Lương – Mỹ Thuận${NEAR_HCM.has(r.p) ? "" : " rồi xuôi về " + r.p}, trả khách về TP.HCM vào tối ngày cuối.` },
    homestay: { title: (t) => `${t} – nghỉ đêm nhà vườn`, price: (p) => p + 690_000, guests: [10, 20],
      text: () => "Chương trình có thêm một đêm ở nhà vườn của người dân: cùng chủ nhà nấu cơm chiều, nghe đờn ca tài tử bên hiên và thức dậy với tiếng gà gáy." },
    xedap: { title: (t) => `${t} – đạp xe khám phá`, price: (p) => p * 0.95, guests: [10, 20],
      text: () => "Phần lớn chặng đường đi bằng xe đạp trên đường làng rợp bóng dừa; xe đạp, mũ bảo hiểm và nước uống được chuẩn bị sẵn." },
    nuocnoi: { title: (t) => `Mùa nước nổi: ${t}`, price: (p) => p * 1.08, guests: [15, 30],
      text: () => "Khởi hành từ tháng 9 đến tháng 11 khi nước lũ tràn đồng: theo ghe đi giăng lưới, thăm lọp, hái bông điên điển và ăn lẩu cá linh." },
    traichin: { title: (t) => `Mùa trái chín: ${t}`, price: (p) => p * 1.05, guests: [15, 30],
      text: () => "Khởi hành mùa trái chín (tháng 5 – tháng 8): khách được ăn trái cây tại vườn thoả thích và mua giá tại vườn mang về." },
    sen: { title: (t) => `Mùa sen: ${t}`, price: (p) => p * 1.05, guests: [15, 30],
      text: () => "Khởi hành mùa sen (tháng 5 – tháng 8), khi đồng sen nở rộ và đẹp nhất vào sáng sớm." },
  };

  // Ghép (lộ trình × gói); thiếu thì bổ sung gói "rieng"/"xedap" cho lộ trình chưa có, thừa thì cắt đều theo tỉnh.
  let pairs = ROUTES.flatMap((r) => r.v.map((v) => [r, v]));
  for (const extra of ["rieng", "xedap", "homestay"]) {
    for (const r of ROUTES) {
      if (pairs.length >= TARGET) break;
      if (r.v.includes(extra) || (extra !== "rieng" && r.d > 1)) continue;
      r.v.push(extra);
      pairs.push([r, extra]);
    }
  }
  pairs = pairs.slice(0, TARGET);

  const seq = {};
  const titles = new Set();
  const out = pairs.map(([r, v], i) => {
    for (const name of r.pl) if (!placeNames.has(name)) throw new Error(`Thiếu địa điểm: ${name} (${r.t})`);
    const rand = rng(`${r.t}|${v}`);
    const V = VARIANT[v];
    const days = r.d + (v === "homestay" ? 1 : 0) + (v === "hcm" && r.d === 1 && !NEAR_HCM.has(r.p) ? 1 : 0);
    const prefix = `${CAT[r.c]}-${PROVINCES[r.p].abbr}`;
    seq[prefix] = (seq[prefix] ?? 100) + 1;
    const title = V.title(r.t);
    if (titles.has(title)) throw new Error(`Trùng tên tour: ${title}`);
    titles.add(title);
    const includes = days === 1
      ? "Giá đã gồm xe đưa đón, xuồng/đò theo chương trình, vé tham quan, bữa trưa đặc sản, nước suối và hướng dẫn viên."
      : `Giá đã gồm xe, ${days - 1} đêm nghỉ (2 khách/phòng), các bữa ăn theo chương trình, vé tham quan, hướng dẫn viên suốt tuyến và bảo hiểm du lịch.`;
    const maxGuests = Math.round(between(rand, V.guests) / 5) * 5 || V.guests[0];
    const first = 3 + ((i * 5) % 25);
    return {
      code: `${prefix}-${seq[prefix]}`,
      title,
      destination: r.dest ?? r.p,
      province: r.p,
      category: r.c,
      price: tourPrice(V.price(r.price, days)),
      durationDays: days,
      maxGuests,
      description: [r.intro, V.text(r), includes, TIPS[r.th[0]]].join(" "),
      places: r.pl,
      images: gallery(r.th, 4),
      departures: [first, first + 14, first + 35].map((daysAhead) => ({ daysAhead, capacity: maxGuests })),
    };
  });
  const cats = [...new Set(out.map((t) => t.category))];
  return {
    version: 1,
    note: "Sinh bởi src/seed-catalog/generate.mjs — không sửa tay. Ảnh: Unsplash License (credits: photo id → tác giả).",
    categories: cats,
    places: PLACES.map(([province, name, description]) => ({ province, name, description })),
    tours: out,
    credits: usedCredits(out.flatMap((t) => t.images)),
  };
}

// ------------------------------------------------------------------ HOTEL
async function hotels() {
  const { ZONES, TYPES, NICKS, GIVENS, WORDS, SEA_WORDS, OWNER_NAMES, EXTRA_FACILITIES } = await import("./hotel-templates.mjs");
  const HAMLETS = ["Tân Hòa", "Bình Thạnh", "Mỹ Phú", "An Hưng", "Phú Hòa", "Long Thạnh", "Tân Thuận", "Hòa Lợi", "Thạnh Phú", "An Lợi", "Phước Hậu", "Mỹ Ái"];
  const SEA = new Set(["Phú Quốc", "Hà Tiên", "Nam Du – Hòn Sơn"]);
  const owners = OWNER_NAMES.map((fullName, i) => ({
    fullName, email: `chunha${String(i + 1).padStart(2, "0")}@example.com`, phone: `09${String(10_000_000 + hash(fullName) % 89_999_999).slice(0, 8)}`,
  }));
  const names = new Set();
  const out = [];
  let idx = 0;
  for (const z of ZONES) {
    const zr = rng(`${z.p}|${z.label ?? ""}`);
    const kinds = Object.entries(z.mix).flatMap(([k, n]) => Array(n).fill(k));
    for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(zr() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
    const sea = SEA.has(z.label);
    for (const kind of kinds) {
      const T = TYPES[kind];
      const r = rng(`hotel-${idx}-${kind}`);
      const nick = pick(r, NICKS), given = pick(r, GIVENS);
      const rural = (T.rural || !z.urban.length) && z.rural.length ? z.rural : null;
      const place = rural ? pick(r, rural) : pick(r, z.urban);
      let address, locality, street = "";
      const near = place[place.length - 1];
      if (rural) {
        const [commune, district] = place;
        const plain = !/^(P\.|TT\.)|,/.test(commune);
        locality = plain ? `xã ${commune}, ${district}` : `${commune}, ${district}`;
        address = plain ? `Ấp ${pick(r, HAMLETS)}, xã ${commune}, ${district}` : `Tổ ${between(r, [1, 9])}, ${commune}, ${district}`;
      } else {
        const [st, ward, district] = place;
        street = st;
        locality = `${ward}, ${district}`;
        address = `${between(r, [2, 199])} ${st}, ${ward}, ${district}`;
      }
      const shortLoc = (rural ? place[1] : place[2]).replace(/^(H\.|Q\.|TP\.|TX\.)\s*/, "");
      const helper = {
        pick: (l) => pick(r, l), nick: () => nick, given: () => given,
        word: () => pick(r, WORDS), sea: () => pick(r, SEA_WORDS), shortLoc: () => shortLoc,
      };
      let name;
      for (let tries = 0; ; tries++) {
        name = T.names(helper);
        if (tries > 5) name = `${name} ${shortLoc}`;
        if (!names.has(name)) break;
      }
      names.add(name);
      const h = {
        name, host: `${pick(r, ["cô", "chú", "anh", "chị"])} ${nick} ${given}`, locality, near, street,
        minutes: between(r, rural ? [5, 20] : [3, 12]), mode: pick(r, ["đi xuồng", "đi xe máy", "đạp xe"]),
      };
      let intro = T.intro(h);
      if (kind === "bungalow" && sea) intro = `${name} gồm những căn bungalow mái lá dưới rặng dừa sát biển ở ${locality}, cách ${near} khoảng ${h.minutes} phút đi xe.`;
      const feats = [...T.features].sort(() => r() - 0.5).slice(0, between(r, [2, 3]));
      const stars = between(r, T.stars);
      // Loại phòng: bỏ bớt vài loại tuỳ hạng sao cho đỡ đồng loạt
      const tmpl = T.rooms.filter((rt, i) => {
        if (i < 2) return true;
        if (kind === "hotel" && rt[0].startsWith("Deluxe")) return stars >= 3;
        return r() < 0.55;
      });
      const roomTypes = tmpl.map((rt, i) => {
        let [rtName, rtDesc, capacity, bedInfo, area, price, policy, freeDays, count, theme, facilities] = rt;
        if (sea && rtName === "Deluxe hướng sông") { rtName = "Deluxe hướng biển"; rtDesc = "Phòng rộng, cửa kính lớn nhìn ra biển, có bồn tắm."; }
        return {
          name: rtName, description: rtDesc, capacity, bedInfo, areaM2: between(r, area), basePrice: round10k(between(r, price)),
          cancellationPolicy: policy, freeCancelDays: policy === "FREE_BEFORE_DATE" ? freeDays : null,
          imageUrl: photo(theme, new Set()), floor: i + 1, roomCount: between(r, count), facilities,
        };
      });
      const images = [photo(T.cover, new Set())];
      const taken = new Set(images.map((u) => u.match(/photo-([0-9]+-[0-9a-f]+)/)[1]));
      const galleryThemes = sea && kind !== "resortBien" ? ["bien-dao", ...T.gallery.slice(1)] : T.gallery;
      for (const th of galleryThemes.slice(0, 3)) { const u = photo(th, taken); if (u) images.push(u); }
      images.push(roomTypes[0].imageUrl);
      const area = PROVINCES[z.p].area;
      out.push({
        slug: `mt-${String(idx + 1).padStart(3, "0")}`,
        owner: owners[Math.floor((idx * owners.length) / TARGET)].email,
        kind: T.label,
        name,
        city: z.p,
        address,
        stars,
        phone: T.rural ? `09${String(hash(name) % 100_000_000).padStart(8, "0")}` : `${area}${3_800_000 + (hash(name) % 199_999)}`,
        checkIn: T.checkIn,
        checkOut: T.checkOut,
        status: idx % 37 === 36 ? "PENDING_APPROVAL" : "ACTIVE",
        description: [intro, ...feats, `Nhận phòng từ ${T.checkIn}, trả phòng trước ${T.checkOut}.`].join(" "),
        images: [...new Set(images)],
        roomTypes,
      });
      idx++;
    }
  }
  if (out.length !== TARGET) throw new Error(`Số chỗ nghỉ ${out.length} ≠ ${TARGET}`);
  return {
    version: 1,
    note: "Sinh bởi src/seed-catalog/generate.mjs — không sửa tay. Tên cơ sở là hư cấu; địa danh có thật. Ảnh: Unsplash License.",
    facilities: EXTRA_FACILITIES.map(([category, key, name, icon]) => ({ category, key, name, icon })),
    owners,
    hotels: out,
    credits: usedCredits(out.flatMap((h) => [...h.images, ...h.roomTypes.map((t) => t.imageUrl)])),
  };
}

const [kind, file] = process.argv.slice(2);
const data = kind === "tours" ? await tours() : kind === "hotels" ? await hotels() : null;
if (!data || !file) {
  console.error("Cách dùng: node generate.mjs tours|hotels <out.json>");
  process.exit(1);
}
writeFileSync(file, JSON.stringify(data, null, 1) + "\n");
const n = kind === "tours" ? data.tours.length : data.hotels.length;
console.log(`${file}: ${n} ${kind}, ${Object.keys(data.credits).length} ảnh Unsplash`);
