// Scene props, all built at the origin (x, y on the floor, z up; the front faces +y).
import { k, G, P, at, S, L, D, planeOf, flat, circleFlat, onFace, byDepth, alongY, recess, halo } from "../engine/lib.js";

const ACCENT = "#0ea5c6";

// ---------------------------------------------------------------- shop counter
export const COUNTER = { plan: { x: -52, y: -16, w: 104, d: 32, r: 2 }, top: 48 };
export function counter() {
  const { plan, top } = COUNTER;
  const FRONT = plan.y + plan.d;
  const out = [halo(plan, 0, 6)];
  out.push(S(k.slabOf(k.insetPlan(plan, 2), 0, 5, P, 4), { tone: "lo" }));
  const seam = L(k.sideSeam(plan, 24, P, 4), { tone: "faint" });
  out.push(S(k.slabOf(plan, 5, top - 8, P, 4, 0.6), { tone: "mid", inner: seam, className: "ax-wood" }));
  // panels on the front face
  out.push(onFace(FRONT, L([-46, -15, 16].map((x) => flat(x, 9, x + 29, 20, 1.2, 4) + flat(x, 27, x + 29, 39, 1.2, 4)).join(""), { tone: "lo", className: "ax-wood-line" })));
  out.push(D([-46, -15, 16, 45].map((x) => at([x - 2, FRONT, 23.5])), { size: 0.4 }));
  // overhanging top + bevel
  const leaf = { x: plan.x - 3, y: plan.y - 2, w: plan.w + 6, d: plan.d + 5, r: 2.5 };
  out.push(S(k.slabOf(leaf, top - 3, 3, P, 6, 0.6), { tone: "hi", crease: "lo", className: "ax-leaf" }));
  out.push(L(k.planOutline(k.insetPlan(leaf, 3), top, P, 6), { tone: "faint" }));
  return out.join("");
}

// ---------------------------------------------------------------- cash register
const REG = { plan: { x: -15, y: -12, w: 30, d: 24, r: 2 }, h: 11 };
/** The drawer is out by `open` units along +y (rebuilt per frame). */
export function register(id, open = 0, amount = "85.000") {
  const { plan, h } = REG;
  const FRONT = plan.y + plan.d;
  const out = [halo(plan, 0, 4, 2)];
  out.push(S(k.slabOf(plan, 0, h, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(plan, 7.5, P, 4), { tone: "faint" }) }));
  // 3×4 keypad
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 3; c++) {
      const key = { x: -12 + c * 4.4, y: 1 + r * 2.6, w: 3.4, d: 1.9, r: 0.5 };
      out.push(S(k.slabOf(key, h, 0.8, P, 2), { tone: c === 2 && r === 3 ? "hi" : "mid", crease: "none" }));
    }
  // printer slot + receipt paper
  out.push(L(k.planOutline({ x: 3, y: 3, w: 10, d: 1.6, r: 0.6 }, h, P, 3), { tone: "lo" }));
  out.push(S(k.slabOf({ x: 3.8, y: 3.4, w: 8.4, d: 0.5, r: 0.2 }, h, 5, P, 2), { tone: "hi", className: "ax-paper", crease: "none" }));
  // customer display at the back
  const scr = { x: -11, y: -11, w: 22, d: 4, r: 1.2 };
  out.push(S(k.slabOf(scr, h, 13, P, 3, 0.4), { tone: "mid" }));
  const txt = `<text class="ax-lcd-text" x="0" y="${-(h + 4.8)}" font-size="4.6" text-anchor="middle">${amount}</text>`;
  out.push(recess(`${id}-scr`, { x0: -9.5, x1: 9.5, z0: h + 2, z1: h + 11, r: 0.8, depth: 0.6 }, scr.y + scr.d, txt, "ax-lcd"));
  // drawer: the part already out of the body + its front
  const o = Math.max(0, open);
  const drawer = { x: -13, y: FRONT, w: 26, d: o + 1.6, r: 0.6 };
  if (o > 0.3) {
    // inside: coin dividers and notes
    out.push(S(k.slabOf({ ...drawer, d: o }, 0.8, 5.2, P, 2), { tone: "lo" }));
    out.push(L(k.planOutline({ x: -12, y: FRONT, w: 24, d: o - 0.4, r: 0.4 }, 6, P, 2), { tone: "faint" }));
    for (const x of [-4, 4]) out.push(L(k.lineOnTop([x, FRONT], [x, FRONT + o - 0.4], 6, P), { tone: "faint" }));
    out.push(S(k.slabOf({ x: -11.5, y: FRONT + 0.4, w: 7, d: Math.min(o - 1, 9), r: 0.4 }, 5.4, 0.6, P, 2), { tone: "hi", className: "ax-bill", crease: "none" }));
  }
  out.push(S(k.slabOf({ x: -13.5, y: FRONT + o, w: 27, d: 1.6, r: 0.6 }, 0.6, 6, P, 2, 0.3), { tone: "mid", className: o > 0.3 ? "ax-amber" : "" }));
  out.push(onFace(FRONT + o + 1.6, L(flat(-4, 3, 4, 4.4, 0.7, 3), { tone: "lo" })));
  return out.join("");
}

// ---------------------------------------------------------------- receipt & banknote
export function receipt() {
  const plan = { x: -6, y: -8, w: 12, d: 16, r: 0.6 };
  const out = [S(k.slabOf(plan, 0, 0.5, P, 2), { tone: "hi", className: "ax-paper", crease: "none" })];
  const lines = [[-4, -5, 4], [-4, -2.6, 2], [-4, -0.2, 3.4], [-4, 2.2, 1]].map(([a, y, b]) => k.lineOnTop([a, y], [b, y], 0.5, P)).join("");
  out.push(L(lines, { tone: "mid", free: true, className: "ax-ink" }));
  out.push(L(k.lineOnTop([0.5, 5.6], [4, 5.6], 0.5, P), { tone: "hi", free: true, className: "ax-ink" }));
  return out.join("");
}
export function bill() {
  const plan = { x: -8, y: -4, w: 16, d: 8, r: 0.4 };
  return S(k.slabOf(plan, 0, 0.4, P, 2), { tone: "hi", className: "ax-bill", crease: "none" }) +
    L(k.planOutline(k.insetPlan(plan, 1), 0.4, P, 2) + k.ring(0, 0, 2.2, 0.4, P, 16), { tone: "lo", className: "ax-bill-line" });
}

// ---------------------------------------------------------------- laundry bag (+ tag)
export function bag(tint = "blue", tagged = 0) {
  const body = { x: -9, y: -8, w: 18, d: 16, r: 6.5 };
  const out = [halo(body, 0, 3, 2)];
  out.push(S(k.slabOf(body, 0, 13, P, 10, 0.6), { tone: "hi", crease: "lo", className: `ax-bag-${tint}`, inner: L(k.sideSeam(body, 4, P, 10), { tone: "faint" }) }));
  out.push(S(k.slabOf({ x: -6.5, y: -5.5, w: 13, d: 11, r: 5 }, 13, 2.2, P, 8), { tone: "hi", className: `ax-bag-${tint}` }));
  out.push(S(k.cylinder(0, 0, 2.6, 15.2, 2.4, P, 20), { tone: "hi", className: `ax-bag-${tint}`, inner: L(k.sideArc(0, 0, 2.6, 16.4, P, 16), { tone: "faint" }) }));
  out.push(S(G.sphereOf([0, 0, 18.6], 2.1, P), { tone: "hi", className: `ax-bag-${tint}` }));
  if (tagged > 0) {
    // a QR tag hanging on the front face: it scales in from its string
    const s = tagged;
    const FRONT = body.y + body.d;
    const qr = [];
    for (let i = 0; i < 9; i++) if ((i * 7) % 3 !== 1) qr.push(`M${-2.2 + (i % 3) * 1.6} ${-(8.6 - Math.floor(i / 3) * 1.6)}h1v1h-1z`);
    out.push(onFace(FRONT + 0.4,
      `<g transform="translate(0 ${-13}) scale(${s}) translate(0 13)">` +
      `<path class="iso-line" data-tone="lo" d="M0 -15.4L0 -11.6"/>` +
      `<path class="ax-tag" d="${flat(-3.6, 4.4, 3.6, 11.6, 0.8, 3)}"/>` +
      `<path class="ax-tag-qr" d="${qr.join("")}"/>` +
      `<circle class="ax-tag-hole" cx="0" cy="-10.6" r=".5"/></g>`));
  }
  return out.join("");
}

// ---------------------------------------------------------------- phone on a stand
export function phone(id, screen = "", { dim = false } = {}) {
  const out = [];
  const foot = { x: -6, y: -5, w: 12, d: 9, r: 2 };
  out.push(halo(foot, 0, 2, 2));
  out.push(S(k.slabOf(foot, 0, 1.6, P, 4, 0.3), { tone: "lo" }));
  out.push(S(k.slabOf({ x: -6.5, y: -1.4, w: 13, d: 2.8, r: 1.4 }, 1.6, 27, P, 4, 0.4), { tone: "mid" }));
  out.push(recess(`${id}-scr`, { x0: -5.4, x1: 5.4, z0: 4.2, z1: 26.4, r: 1, depth: 0.5 }, 1.4, screen, dim ? "ax-screen-off" : "ax-screen"));
  out.push(D([at([0, 1.4, 27.4])], { size: 0.4, tone: "lo" }));
  return out.join("");
}
/** A dull old-app screen: grey rows (face coordinates, x −5..5, z 4..26). */
export const oldScreen = () =>
  [8, 12.5, 17, 21.5].map((z) => `<path class="ax-row" d="${flat(-4.2, z, 4.2, z + 3, 0.8, 3)}"/>`).join("");
/** A customer's screen: logo + status row + a WhatsApp bubble (`wa` 0..1) reading `label`. */
export function customerScreen(wa = 0, label = "Tiba ✓") {
  const s = Math.max(0.001, wa);
  return [
    `<path class="ax-logo-bg" d="${flat(-1.6, 21.6, 1.6, 24.8, 0.7, 3)}"/>`,
    `<path class="ax-row" d="${flat(-4.2, 16, 4.2, 19.4, 0.8, 3)}"/>`,
    `<g transform="translate(0 ${-10.5}) scale(${s}) translate(0 10.5)" opacity="${Math.min(1, wa * 1.5)}">`,
    `<path class="ax-wa" d="${flat(-4.6, 7.6, 4.6, 13.6, 1.4, 4)}"/>`,
    `<text class="ax-wa-text" x="0" y="-9.6" font-size="2.8" text-anchor="middle">${label}</text></g>`,
  ].join("");
}

// ---------------------------------------------------------------- dashboard tablet on a stand
export const TABLET = { w: 76, h: 50, z0: 14 };
/** `screen` is drawn in front-face coordinates: x −34..34, z 18..60. */
export function tablet(id, screen = "") {
  const { w, h, z0 } = TABLET;
  const out = [];
  const base = { x: -26, y: -14, w: 52, d: 20, r: 4 };
  out.push(halo(base, 0, 3, 3));
  out.push(S(k.slabOf(base, 0, 2.4, P, 6, 0.6), { tone: "lo" }));
  // stand post + hinge
  out.push(S(k.slabOf({ x: -4, y: -10, w: 8, d: 6, r: 1.4 }, 2.4, z0 + 8, P, 3, 0.4), { tone: "mid" }));
  out.push(S(G.disc(-5, 5, 2.4, G.frameAlong([0, -5, z0 + 10], [1, 0, 0]), P), { tone: "mid" }));
  // upright tablet body
  const bodyPlan = { x: -w / 2, y: -4, w, d: 3.4, r: 3 };
  out.push(S(k.slabOf(bodyPlan, z0, h, P, 6, 0.6), { tone: "mid" }));
  out.push(recess(`${id}-scr`, { x0: -w / 2 + 3, x1: w / 2 - 3, z0: z0 + 3, z1: z0 + h - 3, r: 1.6, depth: 0.5 }, -0.6, screen, "ax-screen"));
  out.push(D([at([0, -0.6, z0 + h - 1.5])], { size: 0.45, tone: "lo" }));
  return out.join("");
}
/** Dashboard: logo, revenue, status rows, rising bars (`grow` 0..1), branch dots lighting up (`live`). */
export function dashboard(grow = 1, live = 0, gps = 0) {
  const z = (v) => -v;
  const bars = [0.35, 0.5, 0.45, 0.72, 0.95].map((v, i) => {
    const hgt = 14 * v * Math.min(1, Math.max(0, grow * 1.6 - i * 0.15));
    return `<path class="${i === 4 ? "ax-bar-hi" : "ax-bar"}" d="${flat(6 + i * 5.4, 22, 9.6 + i * 5.4, 22 + Math.max(0.3, hgt), 0.6, 2)}"/>`;
  }).join("");
  const rows = ["Cuci", "Setrika", "Siap"].map((label, i) =>
    `<path class="ax-row" d="${flat(-31, 33 - i * 6, -4, 37.4 - i * 6, 1, 3)}"/><circle class="ax-dot-${i}" cx="-28.4" cy="${z(35.2 - i * 6)}" r="1"/>` +
    `<text class="ax-screen-text" x="-25.6" y="${z(34.2 - i * 6)}" font-size="2.8">${label}</text>`).join("");
  const branches = [0, 1, 2].map((i) => `<circle class="ax-live" cx="${8 + i * 9}" cy="${z(53)}" r="1.3" opacity="${Math.min(1, Math.max(0.25, live * 3 - i))}"/>`).join("");
  return [
    `<path class="ax-logo-bg" d="${flat(-31, 51, -26, 56, 1.2, 3)}"/>`,
    `<text class="ax-screen-text ax-strong" x="-24" y="${z(52.2)}" font-size="3.8">LaundryBob</text>`,
    `<text class="ax-screen-text" x="-31" y="${z(46)}" font-size="2.6">Semua cabang · hari ini</text>`,
    `<text class="ax-screen-text ax-strong" x="-31" y="${z(41.2)}" font-size="4.2">Rp 4.820.000</text>`,
    rows,
    `<path class="ax-panel" d="${flat(2, 19.4, 33, 47, 1.4, 3)}"/>`,
    bars,
    `<text class="ax-screen-text" x="4" y="${z(43.4)}" font-size="2.4">Omzet 5 hari</text>`,
    branches,
    gps > 0 ? `<g opacity="${gps}"><path class="ax-map" d="${flat(2, 19.4, 33, 47, 1.4, 3)}"/>` +
      `<path class="ax-route" d="M6 ${z(24)}C14 ${z(26)} 14 ${z(38)} 22 ${z(40)}S30 ${z(44)} 30 ${z(44)}"/>` +
      `<circle class="ax-live" cx="${6 + 24 * gps}" cy="${z(24 + 20 * gps)}" r="1.6"/></g>` : "",
  ].join("");
}

// ---------------------------------------------------------------- ironing board + iron
export function ironBoard() {
  const out = [];
  const Z = 30;
  // crossed legs (slanted prisms in the x–z plane)
  for (const y of [-6, 4]) {
    const F = G.frameOf([0, y, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    out.push(S(G.prismOf(F, [[-16, 0], [-13, 0], [15, Z - 1], [12, Z - 1]], 0, 1.4, P), { tone: "lo" }));
    out.push(S(G.prismOf(F, [[13, 0], [16, 0], [-12, Z - 1], [-15, Z - 1]], 0, 1.4, P), { tone: "mid" }));
  }
  // the board, pointed at one end
  const ring = [[-26, -7], [16, -7], [24, -4], [27, 0], [24, 4], [16, 7], [-26, 7], [-27.5, 5.5], [-27.5, -5.5]];
  out.push(S(k.extrude(ring, Z - 1, 2.4, P, { bevel: 0.5 }), { tone: "hi", crease: "lo", className: "ax-cover" }));
  out.push(L(k.onTop(ring.map(([x, y]) => [x * 0.94, y * 0.8]), Z + 1.4, P, true), { tone: "faint" }));
  // a folded shirt on the board
  out.push(S(k.slabOf({ x: -22, y: -5, w: 16, d: 10, r: 1.6 }, Z + 1.4, 1.8, P, 4, 0.3), { tone: "hi", className: "ax-towel-a" }));
  return out.join("");
}
/** The iron (moves on the board). */
export function iron() {
  const ring = [[-6, -4], [3, -4], [7, 0], [3, 4], [-6, 4]];
  const out = [S(k.extrude(ring, 0, 2.4, P, { bevel: 0.4 }), { tone: "mid" })];
  out.push(S(k.extrude(ring.map(([x, y]) => [x * 0.8 - 0.6, y * 0.75]), 2.4, 1.6, P), { tone: "hi", className: "ax-amber" }));
  const F = G.frameAlong([-4, 0, 6.2], [1, 0, 0]);
  out.push(S(G.disc(0, 6.6, 1.3, F, P), { tone: "mid" }));
  for (const x of [-3.6, 2]) out.push(S(k.cylinder(x, 0, 1, 4, 2.2, P, 12), { tone: "mid" }));
  return out.join("");
}

// ---------------------------------------------------------------- ready-for-pickup shelf
export function rack(tints = ["a", "b", "a", "b", "a", "b"]) {
  const out = [];
  const plan = { x: -22, y: -10, w: 44, d: 20, r: 1 };
  out.push(halo(plan, 0, 3, 2));
  const posts = byDepth(k.corners(plan, 2));
  const back = posts.slice(0, 2), front = posts.slice(2);
  for (const [x, y] of back) out.push(S(k.cylinder(x, y, 1.2, 0, 58, P, 14), { tone: "mid", crease: "none" }));
  [4, 24, 44].forEach((z, i) => {
    out.push(S(k.slabOf(plan, z, 1.6, P, 2, 0.3), { tone: "mid", className: "ax-wood" }));
    for (let j = 0; j < 2; j++) {
      const tint = tints[i * 2 + j];
      const st = { x: -19 + j * 20, y: -7, w: 17, d: 14, r: 1.4 };
      out.push(S(k.slabOf(st, z + 1.6, 4, P, 4, 0.3), { tone: "hi", className: `ax-towel-${tint}`, inner: L(k.sideSeam(st, z + 3.6, P, 4), { tone: "faint" }) }));
      out.push(S(k.slabOf({ ...st, x: st.x + 1, w: st.w - 2 }, z + 5.6, 3.4, P, 4, 0.3), { tone: "hi", className: `ax-towel-${tint === "a" ? "b" : "a"}` }));
    }
  });
  for (const [x, y] of front) out.push(S(k.cylinder(x, y, 1.2, 0, 58, P, 14), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: -10, y: 10, w: 20, d: 0.8, r: 0.3 }, 51, 6, P, 2), { tone: "hi", className: "ax-awning" }));
  return out.join("");
}

// ---------------------------------------------------------------- GPS pin
export function pin(pulse = 0) {
  const out = [];
  const r0 = 4 + pulse * 14;
  out.push(`<g opacity="${(1 - pulse) * 0.9}">${L(k.ring(0, 0, r0, 0.2, P, 48), { tone: "lit", className: "ax-pulse" })}</g>`);
  out.push(L(k.ring(0, 0, 3, 0.2, P, 32), { tone: "lit", className: "ax-pulse" }));
  const F = G.frameAlong([0, 0, 14], [0, 0, -1]);
  out.push(S(G.solidOf([[0, 4.2, 1], [3, 3.4, 1], [6, 2, 1], [9, 0.6, 1], [10, 0]], F, P), { tone: "hi", lit: true, className: "ax-pin" }));
  out.push(S(G.sphereOf([0, 0, 17], 5.2, P), { tone: "hi", lit: true, className: "ax-pin" }));
  out.push(S(G.sphereOf([1.2, 1.6, 18.4], 1.9, P), { tone: "hi", className: "ax-pin-dot" }));
  return out.join("");
}

export { ACCENT };
