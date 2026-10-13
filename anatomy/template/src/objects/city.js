// Shop-houses (branches), background blocks, trees and the courier scooter. All at the origin; front = +y.
import { k, G, P, at, S, L, D, planeOf, sideOf, flat, onFace, byDepth, recess, halo } from "../engine/lib.js";

// ---------------------------------------------------------------- shop-house (a branch)
export const RUKO = { plan: { x: -24, y: -20, w: 48, d: 40, r: 1.5 }, h: 64 };
/** `sign` is the signboard text; `tint` an extra class (e.g. `ax-home`). */
export function ruko(id, { sign = "LAUNDRY", tint = "" } = {}) {
  const { plan, h } = RUKO;
  const FRONT = plan.y + plan.d, SIDE = plan.x + plan.w;
  const out = [halo(plan, 0, 6)];
  out.push(S(k.slabOf(k.insetPlan(plan, -2), 0, 2.4, P, 3, 0.4), { tone: "lo" }));
  const seams = L(k.sideSeam(plan, 32, P, 3) + k.sideSeam(plan, 34, P, 3), { tone: "faint" });
  out.push(S(k.slabOf(plan, 2.4, h - 2.4, P, 3, 0.8), { tone: "mid", inner: seams, className: `ax-bldg ${tint}` }));
  // roof parapet + AC unit
  out.push(L(k.planOutline(k.insetPlan(plan, 2.4), h, P, 3), { tone: "lo" }));
  const ac = { x: -16, y: -14, w: 12, d: 10, r: 1 };
  out.push(S(k.slabOf(ac, h, 6, P, 2, 0.4), { tone: "mid" }));
  out.push(L(k.ring(-10, -9, 3.2, h + 6, P, 24) + k.ring(-10, -9, 1, h + 6, P, 12), { tone: "lo" }));
  // ground floor: glass shopfront + door in a recess
  out.push(recess(`${id}-shop`, { x0: -20, x1: 20, z0: 2.4, z1: 22, r: 0.8, depth: 2.4 }, FRONT,
    `<path class="iso-line" data-tone="faint" d="M-4 -2.4V-22M4 -2.4V-22M-20 -12H-4M4 -12H20"/>` +
    `<path class="ax-shopglass" d="${flat(-19, 3, -5, 21, 0.4, 2)}"/><path class="ax-shopglass" d="${flat(5, 3, 19, 21, 0.4, 2)}"/>` +
    `<path class="ax-door" d="${flat(-3.4, 2.4, 3.4, 19, 0.4, 2)}"/>`, "ax-shopback"));
  // awning + signboard
  out.push(S(k.slabOf({ x: -23, y: FRONT, w: 46, d: 7, r: 0.8 }, 23, 1.6, P, 3, 0.4), { tone: "hi", className: "ax-awning" }));
  out.push(S(k.slabOf({ x: -18, y: FRONT, w: 36, d: 1.2, r: 0.5 }, 25.5, 6.5, P, 2, 0.3), { tone: "hi", className: "ax-sign" }));
  out.push(k.faceTextSvg(planeOf(FRONT + 1.2), sign, { size: 3.6, tone: "hi", anchor: "middle" }).replace("<text", `<text x="0" y="-27.4"`));
  // upper floor: two recessed windows + sills
  for (const x of [-15, 5]) {
    out.push(recess(`${id}-w${x}`, { x0: x, x1: x + 10, z0: 40, z1: 54, r: 0.6, depth: 1.4 }, FRONT,
      `<path class="iso-line" data-tone="faint" d="M${x + 5} -40V-54M${x} -47H${x + 10}"/>`, "ax-window-glass"));
    out.push(S(k.slabOf({ x: x - 1, y: FRONT, w: 12, d: 1.6, r: 0.3 }, 38.6, 1.4, P, 2), { tone: "mid" }));
  }
  // side windows
  out.push(L([-12, 4].map((y) => k.pathOf([[y, 40], [y + 10, 40], [y + 10, 54], [y, 54]].map(([u, z]) => at([SIDE, u, z])), true)).join(""), { tone: "lo" }));
  return out.join("");
}

/** A simple background block (rows of windows) for maps. */
export function block(w = 30, d = 30, h = 40, cls = "") {
  const plan = { x: -w / 2, y: -d / 2, w, d, r: 1.2 };
  const out = [halo(plan, 0, 4, 2), S(k.slabOf(plan, 0, h, P, 3, 0.6), { tone: "mid", className: `ax-bldg ${cls}` })];
  out.push(L(k.planOutline(k.insetPlan(plan, 2), h, P, 3), { tone: "lo" }));
  const FRONT = d / 2, SIDE = w / 2;
  const rows = [];
  for (let z = 8; z < h - 6; z += 9) {
    for (let x = -w / 2 + 4; x < w / 2 - 6; x += 7) rows.push(flat(x, z, x + 4, z + 5, 0.4, 2));
  }
  out.push(onFace(FRONT, `<path class="ax-win" d="${rows.join("")}"/>`));
  const side = [];
  for (let z = 8; z < h - 6; z += 9)
    for (let y = -d / 2 + 4; y < d / 2 - 6; y += 7) side.push(k.pathOf([[y, z], [y + 4, z], [y + 4, z + 5], [y, z + 5]].map(([u, zz]) => at([SIDE, u, zz])), true));
  out.push(`<path class="ax-win ax-win-side" d="${side.join("")}"/>`);
  return out.join("");
}

export function tree(h = 22) {
  return S(k.cylinder(0, 0, 1.4, 0, h * 0.45, P, 12), { tone: "mid", className: "ax-trunk" }) +
    S(G.sphereOf([0, 0, h * 0.62], h * 0.3, P), { tone: "hi", className: "ax-leaf-g" }) +
    S(G.sphereOf([h * 0.12, h * 0.1, h * 0.8], h * 0.2, P), { tone: "hi", className: "ax-leaf-g" });
}

// ---------------------------------------------------------------- courier scooter
/**
 * A courier scooter with a delivery box, facing `heading` (radians, 0 = +x).
 * Rebuilt per frame while it turns; its parts are sorted by depth.
 */
export function scooter(heading = 0, wheelTurn = 0) {
  const c = Math.cos(heading), s = Math.sin(heading);
  const rot = ([x, y, z]) => [x * c - y * s, x * s + y * c, z];
  const frame = (o, a, u, v) => G.frameOf(rot(o), rot(a), rot(u), rot(v));
  // side profile plane (x forward, z up), width along y
  const side = (y) => frame([0, y, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const parts = [];
  const put = (centre, svg) => parts.push({ d: k.depthOf(rot(centre), P), svg });
  // wheels: tyre + rim, axle along y
  for (const x of [-15, 14]) {
    const F = frame([x, -2.2, 5.2], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    const tyre = S(G.ringBand(0, 4.4, 2.6, 5.2, F, P), { tone: "lo", className: "ax-tyre" }) +
      S(G.disc(0.6, 3.8, 2.6, F, P), { tone: "mid" }) +
      L(G.spokesOf(F, 3.8, 0.6, 2.4, 5, P, { phase: wheelTurn }), { tone: "lo" });
    put([x, 0, 5.2], tyre);
  }
  // deck, rear body, seat, leg shield, handlebar, headlight
  put([-2, 0, 7], S(G.prismOf(side(-5), [[-9, 6], [8, 6], [9, 8.4], [-9, 8.4]], 0, 10, P), { tone: "mid", className: "ax-scooter" }));
  put([-14, 0, 12], S(G.prismOf(side(-5.5), [[-22, 8], [-6, 8], [-5, 15], [-12, 19], [-21, 17]], 0, 11, P), { tone: "hi", className: "ax-scooter" }));
  put([-13, 0, 20], S(G.prismOf(side(-4.5), [[-20, 18.4], [-6, 18.4], [-5, 20.6], [-19, 21.4]], 0, 9, P), { tone: "mid", className: "ax-seat" }));
  put([10, 0, 16], S(G.prismOf(side(-4.5), [[7, 6], [11, 6], [16, 28], [12, 28]], 0, 9, P), { tone: "hi", className: "ax-scooter" }));
  put([15, 0, 28], S(G.disc(-7, 7, 0.9, frame([15.4, 0, 29], [0, 1, 0], [1, 0, 0], [0, 0, 1]), P), { tone: "mid" }));
  put([17, 0, 24], S(G.disc(0, 1.2, 2, frame([16.2, 0, 24], [1, 0, 0], [0, 1, 0], [0, 0, 1]), P), { tone: "hi", className: "ax-amber" }));
  // delivery box behind the seat
  const boxF = frame([-27, -7, 21], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  put([-20, 0, 29], S(G.prismOf(boxF, [[0, 0], [15, 0], [15, 15], [0, 15]], 0, 14, P), { tone: "hi", className: "ax-box" }));
  // rider: torso, arms, helmet with visor
  put([-8, 0, 30], S(G.prismOf(side(-3.6), [[-13, 21], [-5, 21], [-3, 35], [-10, 37]], 0, 7.2, P), { tone: "hi", className: "ax-jacket" }));
  put([-1, 0, 32], S(G.prismOf(side(-4.4), [[-7, 33], [-4, 35], [13, 30], [12, 28]], 0, 1.8, P), { tone: "mid", className: "ax-jacket" }) +
    S(G.prismOf(side(2.6), [[-7, 33], [-4, 35], [13, 30], [12, 28]], 0, 1.8, P), { tone: "mid", className: "ax-jacket" }));
  put([-6.5, 0, 41], S(G.sphereOf(rot([-6.5, 0, 41]), 4.4, P), { tone: "hi", className: "ax-helmet" }) +
    S(G.sphereOf(rot([-3.4, 0, 41]), 2.4, P), { tone: "lo", className: "ax-visor" }));
  parts.sort((a, b) => a.d - b.d);
  const shadow = `<ellipse class="iso-halo" cx="${at([0, 0, 0])[0]}" cy="${at([0, 0, 0])[1]}" rx="22" ry="9" style="filter:blur(3px)"/>`;
  return shadow + parts.map((p) => p.svg).join("");
}
