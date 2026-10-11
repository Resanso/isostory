// Example: a motion component / explainer. "Dari tumpukan lamaran ke satu keputusan", 19 s.
//   0.0 Masuk      résumés fall into the inbox tray and pile up
//   3.5 Dinilai    the pile is dealt onto the table; the AIDA bar sweeps it; the five best lift
//   7.8 Shortlist  the rest sink away; the five fold into cards on the board's first lane
//  11.2 Keputusan  cards move lane by lane, one fewer each time, until one is Hired
//  15.6 end card   logo, line, CTA
import { ISO } from "../isostory.js";

const { body, prog, mix, ease, settle, arc, jitter, clamp } = ISO;

const N = 24, COLS = 6;
const SHEET = { w: 24, d: 30, h: 1.2 }, CARD = { w: 34, d: 16, h: 1.6 };
const TRAY = { x: -215, y: -40 };
const TOP = [8, 14, 3, 21, 17]; // best first: rank 0 is the hire
const LANE_X = (k) => -92 + k * 46, SLOT_Y = (j) => -58 + j * 22, LANE_TOP = 1.2;
const LANES = ["Baru", "Screening", "Interview", "Offer", "Hired"];
const ADVANCE = [11.4, 12.2, 13.0, 13.8];
const SWEEP = [5.1, 7.3];

const gridOf = (i) => ({ x: -75 + (i % COLS) * 30, y: -54 + Math.floor(i / COLS) * 36 });
const pileOf = (i) => ({ x: TRAY.x + jitter(i, 1) * 3, y: TRAY.y + jitter(i, 2) * 3, z: 5 + i * 1.25, rot: jitter(i, 3) * 9 });
const scanX = (t) => mix(-108, 108, prog(t, SWEEP[0], SWEEP[1]));
const read = (t, x) => (t < SWEEP[0] ? 0 : clamp((scanX(t) - x) / 14, 0, 1));
const TINTS = ["paper", "paper", "blue", "paper", "amber", "paper"]; // a few résumés are not white

function cardPose(rank, t) {
  let lane = 0, from = 0, start = -1;
  ADVANCE.forEach((at, step) => {
    if (t >= at && rank < 4 - step) (from = lane), (lane = step + 1), (start = at + rank * 0.06);
  });
  const p = start < 0 ? 1 : prog(t, start, start + 0.6, ease.lift);
  const final = rank === 0 && lane === 4;
  const left = lane < ADVANCE.filter((at) => t >= at).length;
  return {
    x: mix(LANE_X(from), LANE_X(lane), p), y: SLOT_Y(rank), z: LANE_TOP + arc(p, 7) + (final ? 9 * settle(prog(t, 14.4, 15.0, ease.lift)) : 0),
    ...CARD, r: 2.6, b: 0.9, detail: "card",
    color: final && t >= 14.4 ? "accent" : "card",
    tone: final && t >= 14.4 ? "accent" : left ? "lo" : "hi",
  };
}

function sheet(i) {
  const rank = TOP.indexOf(i), pile = pileOf(i), grid = gridOf(i);
  const fall = 0.3 + i * 0.11, deal = 3.6 + (N - 1 - i) * 0.05;
  const tint = TINTS[i % TINTS.length];
  return body(`cv-${i}`, (t) => {
    if (t < deal) {
      const p = prog(t, fall, fall + 0.55, ease.lift);
      return { ...SHEET, x: pile.x, y: pile.y, z: mix(pile.z + 90, pile.z, p), rot: pile.rot + (1 - p) * 25, r: 1.6, b: 0.8, detail: "cv", color: tint, ground: 5, opacity: prog(t, fall, fall + 0.18) };
    }
    const p = prog(t, deal, deal + 0.8), r = read(t, grid.x);
    const base = {
      ...SHEET, x: mix(pile.x, grid.x, p), y: mix(pile.y, grid.y, p), z: mix(pile.z, 0, p) + arc(p, 28), rot: mix(pile.rot, 0, p),
      r: 1.6, b: 0.8, detail: "cv", color: r > 0.5 && rank >= 0 ? "accentSoft" : tint, tone: r > 0.5 ? (rank >= 0 ? "hi" : "lo") : "base",
    };
    if (rank < 0) {
      const go = 7.9 + ((i % COLS) + Math.floor(i / COLS)) * 0.04, q = prog(t, go, go + 0.7);
      return { ...base, y: base.y - 26 * q, z: base.z - 3 * q, opacity: 1 - q };
    }
    const up = 5 * settle(r), go = 8.6 + rank * 0.12, q = prog(t, go, go + 0.9);
    if (q <= 0) return { ...base, z: base.z + up };
    if (t >= ADVANCE[0]) return cardPose(rank, t);
    return {
      x: mix(grid.x, LANE_X(0), q), y: mix(grid.y, SLOT_Y(rank), q), z: mix(up, LANE_TOP, q) + arc(q, 22),
      w: mix(SHEET.w, CARD.w, q), d: mix(SHEET.d, CARD.d, q), h: mix(SHEET.h, CARD.h, q), r: mix(1.6, 2.6, q), b: 0.85,
      detail: q < 0.5 ? "cv" : "card", color: q < 0.5 ? "accentSoft" : "card", tone: "hi",
    };
  });
}

export default ISO.story({
  name: "hiring",
  duration: 19,
  theme: "paper",
  brand: { name: "AdaCareer Hire", accent: "#1b61ee", watermark: false },
  bodies: [
    // the table carries the logo, printed on its near corner
    body("table", (t) => ({ x: 0, y: 0, z: -6, w: 250, d: 176, h: 6, r: 10, b: 2.2, layer: 0, color: "plate", side: "tray", opacity: prog(t, 3.9, 4.5),
      decal: { w: 26, d: 26, u: 104, v: 70 } })), // no href: the brand logo
    body("tray", (t) => ({ x: TRAY.x, y: TRAY.y, z: 0, w: 40, d: 46, h: 5, r: 4, b: 1.6, layer: 1, color: "tray", opacity: 1 - prog(t, 7.9, 8.5) })),
    ...LANES.map((_, k) => body(`lane-${k}`, (t) => {
      const p = prog(t, 8.3 + k * 0.08, 8.9 + k * 0.08, ease.lift);
      return { x: LANE_X(k), y: 0, z: mix(-1.2, 0, p), w: 40, d: 160, h: LANE_TOP, r: 5, b: 1, detail: "lane", layer: 1, shadow: false,
        color: k === 4 && t >= 13.8 ? "accentSoft" : "lane", tone: k === 4 && t >= 13.8 ? "accent" : "base", opacity: p };
    })),
    body("aida-bar", (t) => ({ x: scanX(t), y: 0, z: 12, w: 4, d: 156, h: 2, r: 1.5, b: 0.6, layer: 3, color: "accent", tone: "accent",
      opacity: prog(t, 4.8, 5.1) * (1 - prog(t, 7.35, 7.7)) })),
    ...Array.from({ length: N }, (_, i) => sheet(i)),
  ],
  camera: (t, { view }) => {
    const a = prog(t, 3.3, 4.7), b = prog(t, 7.7, 8.9), c = prog(t, 13.9, 15.2);
    const fit = Math.min(1, view.w / 600); // the board spans ~600 units at full scale: narrow views pull back
    return {
      S: mix(mix(mix(2.7, 1.3, a), 1.55, b), 1.75 * (fit < 1 ? 0.9 : 1), c) * fit,
      focus: [mix(mix(mix(TRAY.x, -45, a), 0, b), 34, c), mix(mix(mix(TRAY.y, -8, a), 0, b), -22, c), 0],
    };
  },
  pins: (t) => [
    { id: "aida", at: [scanX(t), -80, 14], text: "AIDA", show: t > 5.0 && t < 7.4, tone: "accent" },
    { id: "hire", at: [LANE_X(4), SLOT_Y(0), LANE_TOP + 16], text: "Caecarryo · UI/UX Designer · 92% cocok", show: t > 14.7, tone: "accent" },
    ...LANES.map((name, k) => ({ id: `lane-${k}`, at: [LANE_X(k), -80, LANE_TOP], text: name, show: t > 9.0, tone: k === 4 && t >= 13.8 ? "accent" : "plain" })),
  ],
  chapters: [
    { t: 0, eyebrow: "01 · Masuk", title: "Ratusan lamaran untuk satu posisi." },
    { t: 3.5, eyebrow: "02 · Dinilai", title: "AIDA membaca dan menilai setiap profil." },
    { t: 7.8, eyebrow: "03 · Shortlist", title: "Lima terbaik naik ke shortlist." },
    { t: 11.2, eyebrow: "04 · Keputusan", title: "Satu kandidat, siap kamu putuskan." },
  ],
  cards: [{ t0: 15.8, logo: true, title: "Rekrut yang tepat, lebih cepat.", sub: "AdaCareer Hire · AI recruiter untuk tim HR Indonesia", cta: "Coba gratis" }],
  poster: 15.2,
});
