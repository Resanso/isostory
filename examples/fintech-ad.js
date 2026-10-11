// Example: a 12 s square ad for a fictional payments app, "Arka Pay" (logo: examples/logos/arka.svg).
//   0.0 hook    invoices rain onto the desk: "Tagihan menumpuk?"
//   3.0 turn    one by one they fly into the phone and are paid; a counter runs
//   6.4 proof   the cash-flow bars rise: "Arus kas terlihat jelas."
//   9.6 CTA     end card
// Theme midnight, accent violet; the logo is printed on the phone and closes on the end card.
import { ISO } from "../isostory.js";

const { body, prog, mix, ease, settle, arc, jitter, stagger } = ISO;
const N = 12;
const PHONE = { x: 52, y: 18 };

/** An invoice: a header bar, three rows, and a heavier total line. */
const invoiceMarks = (top, P, p) => {
  const W = p.w / 2, D = p.d / 2;
  const L = (u0, v, u1) => ISO.HL.seg(top(u0, v), top(u1, v));
  return L(-W + 3, -D + 4, W - 3) + L(-W + 3, -D + 10, W - 9) + L(-W + 3, -D + 14, W - 6) + L(-W + 3, -D + 18, W - 11) + L(W - 14, D - 5, W - 3);
};

function invoice(i) {
  const fall = 0.1 + i * 0.16;
  const pay = 3.0 + i * 0.22; // each one leaves for the phone in turn
  const pile = { x: -40 + jitter(i, 1) * 6, y: -6 + jitter(i, 2) * 6, z: i * 1.3, rot: jitter(i, 3) * 14 };
  return body(`inv-${i}`, (t) => {
    const f = prog(t, fall, fall + 0.5, ease.lift);
    const q = prog(t, pay, pay + 0.75, ease.inOut);
    return {
      w: 22, d: 28, h: 1.1, r: 1.6, b: 0.7, marks: invoiceMarks,
      x: mix(pile.x, PHONE.x, q), y: mix(pile.y, PHONE.y, q), z: mix(pile.z + 70 * (1 - f), 9, q) + arc(q, 26),
      rot: mix(pile.rot + (1 - f) * 40, 0, q),
      color: q > 0.6 ? "accentSoft" : ["paper", "card", "paper", "amber"][i % 4],
      tone: q > 0.6 ? "accent" : "base",
      // shrinks into the phone as it is paid
      opacity: prog(t, fall, fall + 0.15) * (1 - prog(t, pay + 0.55, pay + 0.75)),
    };
  });
}

const bars = [0.35, 0.5, 0.45, 0.7, 0.92].map((v, k) =>
  body(`bar-${k}`, (t) => {
    const p = prog(t, 6.5 + stagger(k, 0.12), 7.4 + stagger(k, 0.12), ease.lift);
    return { x: -70 + k * 18, y: 46, z: 0, w: 12, d: 12, h: Math.max(0.6, 40 * v * settle(p, 1.2)), r: 2.5, b: 0.8,
      color: k === 4 ? "accent" : "violet", tone: k === 4 ? "accent" : "base", opacity: prog(t, 6.3, 6.6) * (1 - prog(t, 9.4, 9.7)) };
  }),
);

export default ISO.story({
  name: "fintech-ad",
  duration: 12,
  aspect: "1:1",
  theme: "midnight",
  backdrop: "grid",
  brand: { name: "Arka Pay", accent: "#7c5cff", watermark: false },
  bodies: [
    body("desk", (t) => ({ x: 0, y: 10, z: -5, w: 190, d: 150, h: 5, r: 14, b: 2, layer: 0, color: "ground", opacity: 1 - prog(t, 9.4, 9.7) })),
    body("phone", (t) => ({ x: PHONE.x, y: PHONE.y, z: 0, w: 34, d: 60, h: 6, r: 7, b: 1.4, detail: "phone", color: "plate", side: "#0b0e18",
      tone: t > 3.2 && t < 6.2 ? "accent" : "hi", decal: { w: 14, d: 14, v: -8 }, opacity: prog(t, 0.6, 1.0) * (1 - prog(t, 9.4, 9.7)) })),
    ...Array.from({ length: N }, (_, i) => invoice(i)),
    ...bars,
  ],
  camera: (t, { view }) => {
    const fit = Math.min(1, view.w / 470);
    return { S: mix(2.0, 1.7, prog(t, 5.8, 6.8)) * fit, focus: [mix(0, -20, prog(t, 5.8, 6.8)), mix(10, 26, prog(t, 5.8, 6.8)), 0], dy: 36 };
  },
  texts: [
    { t0: 0.2, t1: 2.9, text: "Tagihan menumpuk?", style: "big", at: "top", anim: "mask", emphasis: ["menumpuk"] },
    { t0: 3.3, t1: 6.2, text: "{n}", style: "stat", at: "top", group: "count", anim: "pop", count: { from: 0, to: 128, dur: 2.4 } },
    { t0: 3.6, t1: 6.2, text: "tagihan dibayar otomatis", style: "caption", group: "count", anim: "rise" },
    { t0: 6.6, t1: 9.4, text: "Arus kas\nterlihat jelas.", style: "title", at: "top", anim: "rise", emphasis: ["jelas"] },
  ],
  subtitles: [
    { t0: 0.3, t1: 2.9, text: "Tagihan datang terus, dari mana-mana." },
    { t0: 3.0, t1: 6.2, text: "Arka Pay membayarnya tepat waktu, otomatis." },
    { t0: 6.4, t1: 9.4, text: "Dan kamu selalu tahu posisi kasmu." },
  ],
  cards: [{ t0: 9.6, logo: true, title: "Bayar tagihan tanpa repot.", sub: "Arka Pay · contoh fiktif", cta: "Coba gratis 30 hari" }],
  poster: 8.6,
});
