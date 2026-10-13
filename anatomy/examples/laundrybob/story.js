// Example: LaundryBob, a 30 s ad for a laundry-management platform (Indonesian voice-over), 9:16 first.
//   0.0 hook    a laundry counter: receipts fly off and vanish            "Nota hilang lagi?"
//   4.0 leak    the cash drawer opens, notes fly out                      "Omzet bocor."
//   8.0 rivals  three branches, their phones' links break, WA is locked   "Aplikasi lain? Cuma kasir."
//  12.0 track   bags get a QR tag and hop washer → iron → shelf           "Setiap cucian terlacak."
//  17.0 branch  every branch wires into one dashboard                     "Semua cabang, satu layar."
//  21.6 GPS     the courier rides the route under a GPS pin; WA "Tiba ✓"  "Kurir terlacak lewat GPS."
//  26.2 end card
// Objects come from ./objects (washer, props, city); each scene returns items + a camera.
import { k, P, at, L, D, depth, basePlate, place } from "./engine/lib.js";
import { washer, washerFrame } from "./objects/washer.js";
import { counter, COUNTER, register, receipt, bill, bag, phone, oldScreen, customerScreen, tablet, dashboard, ironBoard, iron, rack, pin } from "./objects/props.js";
import { ruko, block, tree, scooter } from "./objects/city.js";
import { prog, mix, ease, settle, arc, jitter } from "./engine/ease.js";

/** Entrance: drop from above with a small bounce, fading in. */
const drop = (t, t0, o, h = 70) => {
  const p = prog(t, t0, t0 + 0.6, ease.lift);
  return { o: [o[0], o[1], o[2] + h * (1 - settle(p, 1.3))], opacity: prog(t, t0, t0 + 0.2) };
};

// ---------------------------------------------------------------- 1. the shop (0–8 s)
const W1 = washer("s1-w1", { towels: true });
const W2 = washer("s1-w2");
const PLATE1 = basePlate({ x: -125, y: -85, w: 250, d: 175, r: 8 });
const COUNTER_SVG = counter();
const RECEIPT = receipt(), BILL = bill();
const C1 = [22, 34, 0];
export function shop(t) {
  const items = [{ o: [0, 0, 0], svg: PLATE1, key: -1e9 }];
  items.push({ o: [-78, -48, 0], svg: washerFrame(W1, t * 90) });
  items.push({ o: [-12, -48, 0], svg: washerFrame(W2, t * 70 + 40) });
  items.push({ o: C1, svg: COUNTER_SVG });
  const top = COUNTER.top;
  // laundry bags land on the counter
  [["blue", -26, 30], ["rose", -10, 38], ["violet", -22, 46]].forEach(([tint, x, y], i) => {
    const d = drop(t, 0.1 + i * 0.15, [C1[0] + x, y, top]);
    items.push({ ...d, svg: bag(tint) });
  });
  // receipts: lying there, then flying off one by one (the 2nd and 5th stay)
  for (let i = 0; i < 6; i++) {
    const keep = i === 1 || i === 4;
    const t0 = 0.5 + i * 0.08, lost = 1.5 + Math.abs(i - 2.5) * 0.28;
    const p = prog(t, lost, lost + 1.2, ease.in);
    const base = [C1[0] + 4 + (i % 3) * 13 + jitter(i, 1) * 2, 26 + Math.floor(i / 3) * 18 + jitter(i, 2) * 2, top + 0.2];
    const fly = keep ? 0 : p;
    items.push({ o: [base[0] + fly * (60 + jitter(i, 3) * 30), base[1] + fly * (50 + jitter(i, 4) * 20), base[2] + arc(prog(t, t0, t0 + 0.5), 14) + fly * 70],
      svg: RECEIPT, opacity: prog(t, t0, t0 + 0.2) * (1 - fly) * (1 - (keep ? 0 : 0)) });
  }
  // register: the drawer opens at 4.4 s and notes fly out
  const open = 14 * settle(prog(t, 4.4, 5.0, ease.lift), 1.25);
  items.push({ o: [C1[0] + 30, 26, top], svg: register("s1-reg", open) });
  for (let i = 0; i < 7; i++) {
    const g0 = 5.0 + i * 0.18, p = prog(t, g0, g0 + 1.5, ease.out);
    if (p <= 0) continue;
    items.push({ o: [C1[0] + 30 + p * (60 + jitter(i, 5) * 25), 44 + p * (30 + jitter(i, 6) * 25), top + 4 + arc(p, 40) + p * 20],
      svg: BILL, opacity: prog(t, g0, g0 + 0.12) * (1 - prog(t, g0 + 1.0, g0 + 1.5)) });
  }
  const z = prog(t, 3.8, 4.8) * (1 - prog(t, 7.4, 8.0));
  return { items, cam: { c: [mix(-5, C1[0] + 10, z), mix(0, 15, z), mix(48, 72, z)], w: mix(330, 280, z), h: mix(280, 300, z) } };
}

// ---------------------------------------------------------------- 2. other apps (8–12 s)
const PLATE2 = basePlate({ x: -115, y: -55, w: 230, d: 125, r: 8 });
const RUKO2 = [-68, 0, 68].map((x, i) => ({ x, svg: ruko(`s2-k${i}`, { sign: "LAUNDRY" }) }));
const OLD = [0, 1, 2].map((i) => phone(`s2-p${i}`, oldScreen(), { dim: true }));
export function apps(t) {
  const items = [{ o: [0, 0, 0], svg: PLATE2, key: -1e9 }];
  const cut = prog(t, 9.6, 10.4, ease.lift);
  const dim = prog(t, 9.6, 10.4);
  RUKO2.forEach(({ x, svg }, i) => {
    items.push({ ...drop(t, 8.0 + i * 0.15, [x, -22, 0], 90), svg, dim });
    items.push({ ...drop(t, 8.4 + i * 0.15, [x + 6, 42, 0], 50), svg: OLD[i], dim, scale: 1.8 });
  });
  // links between phones: they grow, then break and turn red
  const links = [];
  for (let i = 0; i < 2; i++) {
    const a = at([-68 + i * 68 + 6, 42, 54]), b = at([-68 + (i + 1) * 68 + 6, 42, 54]);
    const g = prog(t, 8.7 + i * 0.2, 9.2 + i * 0.2);
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const half = (from) => {
      const len = g * (1 - cut * 0.6);
      return [from, [from[0] + (mid[0] - from[0]) * len, from[1] + (mid[1] - from[1]) * len]];
    };
    if (g > 0) for (const [p0, p1] of [half(a), half(b)])
      links.push(`<path class="${cut > 0.3 ? "ax-link-cut" : "ax-link"}" d="M${p0[0]} ${p0[1]}L${p1[0]} ${p1[1]}"/><circle class="ax-link-end" cx="${p0[0]}" cy="${p0[1]}" r="1.4"/>`);
  }
  // a padlock: the WhatsApp feature is paywalled (over the right phone)
  const lp = prog(t, 10.6, 11.1, ease.lift);
  const lockAt = at([74, 42, 64 + 30 * (1 - settle(lp, 1.3))]);
  const lock = lp > 0 ? `<g transform="translate(${lockAt[0]} ${lockAt[1]}) scale(1.6)" opacity="${prog(t, 10.6, 10.8)}">` +
    `<path class="ax-lock-shackle" d="M-3 -2V-5.4A3 3 0 0 1 3 -5.4V-2"/><rect class="ax-lock" x="-4.6" y="-2.4" width="9.2" height="7.4" rx="1.4"/>` +
    `<circle cx="0" cy="0.8" r="1" fill="#5a1f2a"/></g>` : "";
  return { items, overlay: links.join("") + lock, cam: { c: [0, 10, 36], w: 300, h: 245 } };
}

// ---------------------------------------------------------------- 3. tracking (12–17 s)
const PLATE3 = basePlate({ x: -122, y: -75, w: 240, d: 160, r: 8 });
const W3 = washer("s3-w");
const BOARD = ironBoard(), IRON = iron(), RACK = rack();
const STOPS = [-104, -62, 6, 74];
function lane(t) {
  const plan = { x: -116, y: 2, w: 222, d: 18, r: 2 };
  const out = [k.solidSvg(k.slabOf(plan, 0, 4, P, 3, 0.5), { tone: "mid" })];
  const shift = (t * 14) % 10;
  const ticks = [];
  for (let x = plan.x + 2 + shift; x < plan.x + plan.w - 2; x += 10) ticks.push(k.lineOnTop([x, plan.y + 1.5], [x, plan.y + plan.d - 1.5], 4, P));
  out.push(L(ticks.join(""), { tone: "lo" }));
  out.push(D(STOPS.slice(1).map((x) => at([x, plan.y + plan.d + 3, 0])), { size: 1.2, tone: "lit" }));
  return out.join("");
}
export function flow(t) {
  const items = [{ o: [0, 0, 0], svg: PLATE3, key: -1e9 }];
  items.push({ ...drop(t, 12.0, [STOPS[1], -42, 0]), svg: washerFrame(W3, t * 220) });
  items.push({ ...drop(t, 12.1, [STOPS[2], -38, 0]), svg: BOARD });
  items.push({ ...drop(t, 12.15, [STOPS[2] - 6 + Math.sin(t * 5) * 8, -38, 32.6]), svg: IRON });
  items.push({ ...drop(t, 12.2, [STOPS[3], -40, 0]), svg: RACK });
  items.push({ o: [0, 0, 0], svg: lane(t), key: depth([0, 2, 0]), opacity: prog(t, 12.2, 12.5) });
  ["blue", "violet", "rose"].forEach((tint, i) => {
    const t0 = 12.6 + i * 0.35;
    let x = STOPS[0], hop = 0;
    for (let s = 1; s < STOPS.length; s++) {
      const a = t0 + 0.6 + (s - 1) * 0.95, q = prog(t, a, a + 0.7);
      if (q > 0) { x = mix(STOPS[s - 1], STOPS[s], q) + (i - 1) * 9 * q; hop = arc(q, 14); }
    }
    const tagged = settle(prog(t, t0 + 0.35, t0 + 0.65, ease.lift), 1.5);
    const done = x > STOPS[3] - 14;
    const enter = prog(t, t0, t0 + 0.5, ease.lift);
    items.push({ o: [x, 11, 4 + hop + 40 * (1 - enter)], svg: bag(done ? "green" : tint, tagged), opacity: prog(t, t0, t0 + 0.2) });
  });
  items.push({ ...drop(t, 12.3, [0, 62, 0], 60), svg: tablet("s3-tab", dashboard(1, 0, 0)) });
  return { items, cam: { c: [-6, 8, 42], w: 285, h: 265 } };
}

// ---------------------------------------------------------------- 4. every branch (17–21.6 s)
const PLATE4 = basePlate({ x: -125, y: -95, w: 250, d: 185, r: 8 });
const RUKO4 = [[-80, -50], [0, -68], [80, -50]].map(([x, y], i) => ({ x, y, svg: ruko(`s4-k${i}`) }));
export function net(t) {
  const items = [{ o: [0, 0, 0], svg: PLATE4, key: -1e9 }];
  RUKO4.forEach(({ x, y, svg }, i) => items.push({ ...drop(t, 17.1 + i * 0.15, [x, y, 0], 80), svg }));
  const grow = prog(t, 17.9, 19.2);
  items.push({ ...drop(t, 17.0, [0, 48, 0], 60), svg: tablet("s4-tab", dashboard(grow, prog(t, 18.6, 20.0), 0)) });
  // a data line from each branch to the tablet: it grows, then packets flow
  const links = RUKO4.map(({ x, y }, i) => {
    const a = [x, y + 20, 30], b = [0, 46, 64], m = [(x + 0) / 2, (y + 46) / 2, 95];
    const pts = Array.from({ length: 33 }, (_, j) => {
      const u = j / 32;
      return at([0, 1, 2].map((c) => (1 - u) * (1 - u) * a[c] + 2 * u * (1 - u) * m[c] + u * u * b[c]));
    });
    const g = prog(t, 17.8 + i * 0.15, 18.6 + i * 0.15);
    const n = Math.max(2, Math.round(g * 32) + 1);
    const d = "M" + pts.slice(0, n).map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("L");
    const u = (((t - 18.6) * 0.6 + i * 0.33) % 1 + 1) % 1;
    const pk = pts[Math.round(u * 32)];
    return g > 0 ? `<path class="ax-data" d="${d}"/><circle class="ax-link-end" cx="${pts[0][0]}" cy="${pts[0][1]}" r="1.6"/>` +
      (t > 18.7 ? `<circle class="ax-packet" cx="${pk[0]}" cy="${pk[1]}" r="2.2"/>` : "") : "";
  });
  return { items, overlay: links.join(""), cam: { c: [0, -5, 45], w: 300, h: 255 } };
}

// ---------------------------------------------------------------- 5. courier GPS (21.6–26 s)
const PLATE5 = basePlate({ x: -145, y: -105, w: 290, d: 210, r: 8 });
const ROADS = [
  { x: -135, y: -38, w: 270, d: 22, r: 1 },
  { x: -32, y: -95, w: 22, d: 190, r: 1 },
  { x: -32, y: 34, w: 167, d: 22, r: 1 },
];
const ROAD_SVG = ROADS.map((r) => k.solidSvg(k.slabOf(r, 0, 0.6, P, 2), { tone: "lo", crease: "none", className: "ax-roadslab" }) +
  L(k.lineOnTop(r.w > r.d ? [r.x + 4, r.y + r.d / 2] : [r.x + r.w / 2, r.y + 4], r.w > r.d ? [r.x + r.w - 4, r.y + r.d / 2] : [r.x + r.w / 2, r.y + r.d - 4], 0.6, P), { tone: "faint", dashed: true })).join("");
const ORIGIN5 = ruko("s5-k0");
const HOME = ruko("s5-home", { sign: "RUMAH", tint: "ax-home" });
const BLOCKS5 = [[-95, 70, 34, 30, 52], [50, -75, 40, 30, 70], [100, -72, 26, 26, 40], [-120, -10, 22, 22, 30]].map(([x, y, w, d, h]) => ({ o: [x, y, 0], svg: block(w, d, h) }));
const TREES5 = [[-50, 10], [10, 10], [40, 10], [-55, 75], [20, 80]].map(([x, y], i) => ({ o: [x, y, 0], svg: tree(18 + (i % 3) * 4) }));
const ROUTE = [[-82, -27], [-21, -27], [-21, 45], [86, 45]];
const SEGL = ROUTE.slice(1).map((p, i) => Math.hypot(p[0] - ROUTE[i][0], p[1] - ROUTE[i][1]));
const TOTAL = SEGL.reduce((a, b) => a + b, 0);
function along(u) {
  let d = u * TOTAL;
  for (let i = 0; i < SEGL.length; i++) {
    if (d <= SEGL[i] || i === SEGL.length - 1) {
      const a = ROUTE[i], b = ROUTE[i + 1], q = Math.min(1, d / SEGL[i]);
      return { p: [mix(a[0], b[0], q), mix(a[1], b[1], q)], h: Math.atan2(b[1] - a[1], b[0] - a[0]), i, q };
    }
    d -= SEGL[i];
  }
}
export function gps(t) {
  const items = [{ o: [0, 0, 0], svg: PLATE5, key: -1e9 }];
  items.push({ o: [0, 0, 0], svg: ROAD_SVG, key: -1e8, opacity: prog(t, 21.6, 21.9) });
  items.push({ ...drop(t, 21.7, [-82, -68, 0], 70), svg: ORIGIN5 });
  items.push({ ...drop(t, 21.85, [106, 2, 0], 70), svg: HOME });
  BLOCKS5.forEach((b, i) => items.push({ ...drop(t, 21.75 + i * 0.06, b.o, 60), svg: b.svg }));
  TREES5.forEach((b, i) => items.push({ ...drop(t, 21.9 + i * 0.05, b.o, 30), svg: b.svg }));
  // the ride: leaves at 22.4, arrives at 24.7; the heading blends at corners
  const u = prog(t, 22.4, 24.7, ease.inOut);
  const now = along(u);
  const ahead = along(Math.min(1, u + 0.03));
  let h = now.h;
  if (ahead.i !== now.i) h = mix(now.h, ahead.h, 0.5);
  // route trail: dots on the road, lit once passed
  const trail = [];
  for (let j = 0; j <= 40; j++) {
    const s = along(j / 40), shown = prog(t, 21.9 + (j / 40) * 0.5, 22.1 + (j / 40) * 0.5);
    if (shown <= 0) continue;
    const q = at([s.p[0], s.p[1], 0.8]);
    trail.push(`<circle class="${j / 40 <= u ? "ax-trail-on" : "ax-trail"}" cx="${q[0]}" cy="${q[1]}" r="${j / 40 <= u ? 1.5 : 1.1}" opacity="${shown}"/>`);
  }
  items.push({ o: [0, 0, 0.8], svg: trail.join(""), key: -1e7 });
  const enter = prog(t, 22.0, 22.4, ease.lift);
  items.push({ o: [now.p[0], now.p[1], 30 * (1 - enter)], svg: scooter(h, t * 8), opacity: prog(t, 22.0, 22.2) });
  const pulse = ((t - 22) * 1.1) % 1;
  items.push({ o: [now.p[0], now.p[1], 56 + Math.sin(t * 6) * 1.5], svg: pin(pulse), opacity: enter, key: 1e8 });
  // the customer's phone by the house + the WhatsApp ping on arrival
  const wa = settle(prog(t, 24.8, 25.3, ease.lift), 1.4);
  items.push({ ...drop(t, 22.2, [112, 78, 0], 40), svg: phone("s5-ph", customerScreen(wa)), scale: 1.7 });
  const follow = prog(t, 22.2, 24.7);
  return { items, cam: { c: [mix(-10, 20, follow), mix(-5, 15, follow), 20], w: 330, h: 275 } };
}


const TEXTS = [
  { t0: 0.3, t1: 3.8, text: "Nota hilang lagi?", style: "big", emphasis: ["hilang"] },
  { t0: 4.2, t1: 7.7, text: "Omzet bocor.", style: "big", emphasis: ["bocor"], group: "bocor" },
  { t0: 4.9, t1: 7.7, text: "dan kamu tidak tahu", style: "caption", group: "bocor" },
  { t0: 8.3, t1: 11.8, text: "Aplikasi lain?", style: "title", group: "lain" },
  { t0: 9.0, t1: 11.8, text: "Cuma kasir.", style: "big", emphasis: ["kasir"], group: "lain" },
  { t0: 12.4, t1: 16.8, text: "Setiap cucian\nterlacak.", style: "title", emphasis: ["terlacak"] },
  { t0: 17.4, t1: 21.5, text: "Semua cabang,\nsatu layar.", style: "title", emphasis: ["satu"] },
  { t0: 21.9, t1: 25.8, text: "Kurir terlacak\nlewat GPS.", style: "title", emphasis: ["GPS"] },
];

const SUBTITLES = [
  { t0: 0.3, t1: 3.9, text: "Nota hilang, cucian tertukar, pelanggan marah." },
  { t0: 4.0, t1: 7.9, text: "Uang tunai di tangan karyawan, omzet harian tak terpantau." },
  { t0: 8.0, t1: 12.2, text: "Aplikasi lain: cabang tak sinkron, WA dikunci." },
  { t0: 12.3, t1: 16.9, text: "LaundryBob mencatat tiap cucian, dari masuk sampai diambil." },
  { t0: 17.1, t1: 21.6, text: "Omzet, stok, karyawan, semua cabang terpantau real-time." },
  { t0: 21.8, t1: 26.1, text: "Kurir terpantau GPS, pelanggan dapat notifikasi WA." },
  { t0: 26.4, t1: 29.7, text: "LaundryBob. Daftar sekarang lewat WhatsApp." },
];

const CARD = { t0: 26.2, title: "Laundry rapi, omzet terpantau.", sub: "LaundryBob · platform manajemen laundry", cta: "Daftar via WhatsApp" };

// what the voice says (the brand name spelled for Indonesian pronunciation); timed like the subtitles
const VOICE = SUBTITLES.map((c) => ({ ...c, text: c.text.replaceAll("LaundryBob", "Laundri Bob") }));

export default {
  name: "laundrybob",
  duration: 30,
  aspects: ["9:16", "1:1", "16:9"],
  brand: { name: "LaundryBob", accent: "#0ea5c6", logo: "logo.svg" },
  audio: "voiceover.mp3",
  language: "id",
  voiceId: "1k39YpzqXZn52BgyLyGO",
  poster: 20.4,
  scenes: [
    { from: 0, to: 8.0, build: shop },
    { from: 8.0, to: 12.0, build: apps },
    { from: 12.0, to: 17.0, build: flow },
    { from: 17.0, to: 21.6, build: net },
    { from: 21.6, to: 26.2, build: gps },
  ],
  texts: TEXTS,
  subtitles: SUBTITLES,
  voice: VOICE,
  card: CARD,
};
