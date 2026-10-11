// Example: a 14 s motion component for a fictional logistics company, "Lajur" (logo: examples/logos/lajur.svg).
//   0.0 Masuk    parcels drop onto the conveyor; each box carries the logo
//   3.4 Dipindai the scanner gate reads them as they pass; labels turn orange
//   7.0 Dimuat   boxes load into the truck, the truck pulls away along an arc of the road
//  11.2 end card
// Theme studio, accent orange. Chapters + pins + one lower-third: a "how it works" section.
import { ISO } from "../isostory.js";

const { body, prog, mix, ease, settle, arc, clamp } = ISO;
const N = 7;
const BELT = { y: 0, x0: -150, x1: 70 };
const GATE_X = -10;
const TRUCK = { x: 110, y: 0 };
const BED_TOP = 10.5;
const GLASS = "#1f2736", TYRE = "#2a2e37";

/** One truck part: a pose relative to the truck, moved by the drive-away and faded with it. */
const part = (id, pose) =>
  body(id, (t) => {
    const drive = prog(t, 9.0, 10.8, ease.in);
    const p = pose(t);
    return { r: 2, b: 0.8, ...p, x: TRUCK.x + p.x + drive * 170, y: TRUCK.y + p.y, opacity: 1 - prog(t, 10.4, 10.9) };
  });

function truckParts() {
  const wheels = [-24, -10, 40].flatMap((x, k) => [-17, 17].map((y, j) =>
    part(`wheel-${k}-${j}`, () => ({ shape: "cyl", axis: "y", x, y, z: 0, w: 12, d: 6, h: 12, color: TYRE, side: "#1b1e25", hub: 0.45, shadow: false,
      layer: y < 0 ? 1 : 2 })))); // far wheels sit under the chassis, near ones in front of it
  const rail = (id, x, y, w, d) => part(id, () => ({ x, y, z: BED_TOP, w, d, h: 7, r: 1, b: 0.5, color: "plate", side: "#c9d1df", shadow: false }));
  return [
    part("chassis", () => ({ x: 8, y: 0, z: 5, w: 90, d: 30, h: 4, r: 2, color: "ink", side: "#232833", layer: 1 })), // under the bed, always
    part("bed", () => ({ x: -6, y: 0, z: 9, w: 60, d: 38, h: 1.5, r: 2, color: "plate", side: "#c9d1df", shadow: false })),
    rail("rail-back", -35, 0, 2, 38),
    rail("rail-left", -6, -18, 60, 2),
    rail("rail-front", 23, 0, 2, 38),
    rail("rail-right", -6, 18, 60, 2),
    part("cab", () => ({ x: 36, y: 0, z: 9, w: 22, d: 34, h: 24, r: 5, b: 1.2, color: "accent", tone: "accent", decal: { w: 12, d: 12 } })),
    part("hood", () => ({ x: 51, y: 0, z: 9, w: 10, d: 30, h: 11, r: 3, b: 1, color: "accent", tone: "accent", shadow: false })),
    part("windshield", () => ({ x: 47.4, y: 0, z: 22, w: 0.8, d: 26, h: 9, r: 0.3, b: 0.2, color: GLASS, side: GLASS, shadow: false })),
    part("side-window", () => ({ x: 38, y: 17.4, z: 22, w: 13, d: 0.8, h: 8, r: 0.3, b: 0.2, color: GLASS, side: GLASS, shadow: false })),
    ...[-10, 10].map((y, k) => part(`light-${k}`, () => ({ x: 56.4, y, z: 13, w: 0.8, d: 5, h: 3, r: 0.3, b: 0.2, color: "#fff4c7", side: "#ffe38a", shadow: false }))),
    ...wheels,
  ];
}

function parcel(i) {
  const drop = 0.2 + i * 0.32;
  const start = 2.2 + i * 0.42; // the belt carries them off one after another
  const x0 = BELT.x0 + 14 + (i % 4) * 30, y0 = i < 4 ? -12 : 12;
  // three columns by two rows inside the bed; the seventh rides on top
  const slot = { x: TRUCK.x - 24 + (i % 3) * 18, y: i % 6 < 3 ? -8 : 8, z: BED_TOP + Math.floor(i / 6) * 12 };
  return body(`box-${i}`, (t) => {
    const f = prog(t, drop, drop + 0.5, ease.lift);
    const run = clamp((t - start) / 4.2, 0, 1); // belt speed is constant: linear on purpose
    const bx = mix(x0, BELT.x1, run);
    const scanned = bx > GATE_X;
    const load = prog(t, 6.6 + i * 0.12, 7.3 + i * 0.12, ease.inOut);
    const drive = prog(t, 9.0, 10.8, ease.in) * 170;
    return {
      w: 18, d: 16, h: 12, r: 2.5, b: 0.9, decal: { w: 9, d: 9 },
      x: mix(bx, slot.x, load) + drive, y: mix(mix(y0, BELT.y, prog(t, start, start + 0.5)), slot.y, load),
      z: mix(3 + 60 * (1 - f), slot.z, load) + arc(load, 14),
      color: scanned ? "accentSoft" : "tray", tone: scanned ? "accent" : "base",
      opacity: prog(t, drop, drop + 0.15) * (1 - prog(t, 10.4, 10.9)),
      ground: load > 0.5 ? BED_TOP : 3,
    };
  });
}

export default ISO.story({
  name: "logistics",
  duration: 14,
  theme: "studio",
  brand: { name: "Lajur", accent: "#ff6a3d" },
  bodies: [
    body("floor", () => ({ x: -10, y: 0, z: -4, w: 330, d: 120, h: 4, r: 12, b: 2, layer: 0, color: "ground" })),
    body("belt", () => ({ x: (BELT.x0 + BELT.x1) / 2, y: BELT.y, z: 0, w: BELT.x1 - BELT.x0, d: 34, h: 3, r: 4, b: 1, layer: 1, detail: "lane", color: "ink", side: "#2b3140", shadow: false })),
    // the scanner gate: two posts and a beam
    ...[-24, 24].map((y, k) => body(`post-${k}`, () => ({ x: GATE_X, y, z: 0, w: 4, d: 4, h: 26, r: 1.5, b: 0.6, layer: 2, color: "plate", side: "#c3cad8" }))),
    body("gate", (t) => ({ x: GATE_X, y: 0, z: 26, w: 6, d: 52, h: 3, r: 1.5, layer: 3, color: "accent", tone: t > 3.3 && t < 9 ? "accent" : "base" })),
    // the truck, built from the parts that make it read as one: chassis, six wheels, an open bed with rails,
    // a cab with a hood, glass and headlights. Every part rides the same `drive` offset.
    ...truckParts(),
    ...Array.from({ length: N }, (_, i) => parcel(i)),
  ],
  camera: (t, { view }) => {
    const fit = Math.min(1, view.w / 700);
    return { S: mix(1.55, 1.7, prog(t, 6.4, 8.0)) * fit, focus: [mix(-20, 20, prog(t, 6.2, 8.4)), 0, 0], dy: 40 };
  },
  pins: (t) => [
    { id: "gate", at: [GATE_X, -26, 30], text: "Scan otomatis", show: t > 3.6 && t < 6.6, tone: "accent" },
    { id: "truck", at: [TRUCK.x + 36, 0, 46], text: "Truk 07 · Cikarang → Bandung", show: t > 7.6 && t < 9.0, tone: "plain" },
  ],
  chapters: [
    { t: 0, eyebrow: "01 · Masuk", title: "Paket masuk gudang." },
    { t: 3.4, eyebrow: "02 · Dipindai", title: "Setiap paket terbaca otomatis." },
    { t: 7.0, eyebrow: "03 · Dimuat", title: "Langsung ke truk yang tepat." },
  ],
  texts: [{ t0: 7.8, t1: 10.6, text: "Berangkat 08:00 · tiba hari ini", style: "lower", anim: "slide" }],
  cards: [{ t0: 11.2, logo: true, title: "Kirim hari ini, sampai hari ini.", sub: "Lajur Logistics · contoh fiktif", cta: "Hitung ongkir" }],
  poster: 8.4,
});
