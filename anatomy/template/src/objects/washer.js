// A front-loading washing machine, built at the origin.
// Layers: back (body, panel), drum (turns in the door plane), front (glass, ring, handle, towels). Use washerFrame().
import { k, G, P, at, S, L, D, planeOf, flat, circleFlat, onFace, byDepth, alongY, recess, halo } from "../engine/lib.js";
import { tubePieces, tubeSvg } from "../kit/tube.mjs";

const CASE = { x: -30, y: -28, w: 60, d: 56, r: 3 };
const FRONT = CASE.y + CASE.d, SIDE = CASE.x + CASE.w;
const BODY_Z = 7, TOP = 88, KICK = 17, PANEL = 72;
const DOOR = { x: 0, z: 44, r: 21, glass: 14.2 };
const KNOB = { x: 22.5, z: 79.5, r: 4.4 };
const DRUM_DEPTH = 7;
export const WASHER = { CASE, TOP, FRONT, SIDE, footprint: { x: -31, y: -29, w: 62, d: 58, r: 3 } };

export function washer(id, { towels = false, hose = null, lcd = "0:42" } = {}) {
  const out = [halo(CASE, 0, 6)];
  for (const [x, y] of byDepth(k.corners(CASE, 5))) {
    out.push(S(k.cylinder(x, y, 2.8, 0, 1.2, P, 20), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 1.8, 1.2, BODY_Z - 1.2, P, 16), { tone: "mid", crease: "none" }));
  }
  const seams = L(k.sideSeam(CASE, KICK, P, 6) + k.sideSeam(CASE, PANEL, P, 6), { tone: "faint" });
  out.push(S(k.slabOf(CASE, BODY_Z, TOP - BODY_Z, P, 6, 1.2), { tone: "mid", inner: seams }));
  out.push(L(k.planOutline(k.insetPlan(CASE, 2.4), TOP, P, 6), { tone: "faint" }));
  out.push(D([[-24, -24], [24, -24]].map(([x, y]) => at([x, y, TOP])), { size: 0.45 }));
  const slot = (y, z0, z1, half = 0.7) => k.pathOf(k.roundedPlan({ x: y - half, y: z0, w: half * 2, d: z1 - z0, r: half }, 4).map(([u, z]) => at([SIDE, u, z])), true);
  out.push(L(Array.from({ length: 8 }, (_, i) => slot(-22 + i * 2.8, 62, 80)).join(""), { tone: "faint" }));
  const spec = k.pathOf(k.roundedPlan({ x: 4, y: 40, w: 16, d: 12, r: 1 }, 4).map(([u, z]) => at([SIDE, u, z])), true);
  const rule = (y0, y1, z) => k.segment([SIDE, y0, z], [SIDE, y1, z], P);
  out.push(L(spec, { tone: "lo" }), L(rule(6.5, 17, 48.5) + rule(6.5, 14, 45.5) + rule(6.5, 15.5, 42.5), { tone: "faint", free: true }));
  // front panel
  out.push(S(k.slabOf({ x: -26.5, y: FRONT, w: 17, d: 2.2, r: 0.8 }, 75, 8.5, P, 3, 0.4), { tone: "mid" }));
  out.push(onFace(FRONT + 2.2, L(flat(-24.5, 77.4, -18.5, 79.6, 1.1, 4), { tone: "lo" })));
  const LCD = { x0: -5, x1: 12, z0: 75.5, z1: 83, r: 1.2, depth: 1 };
  const digits = `<text class="ax-lcd-text" data-part="lcd" x="${(LCD.x0 + LCD.x1) / 2}" y="${-(LCD.z0 + 1.9)}" font-size="5.4" text-anchor="middle">${lcd}</text>`;
  out.push(recess(`${id}-lcd`, LCD, FRONT, digits, "ax-lcd"));
  for (const z of [77, 81.2]) out.push(S(G.disc(0, 0.9, 1.4, alongY(15.6, z, FRONT), P), { tone: "mid" }));
  const ticks = [];
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (1.25 - (i / 8) * 1.5), c = Math.cos(a), s = Math.sin(a), r1 = i % 4 ? 6.8 : 7.4;
    ticks.push(`M${(KNOB.x + c * 5.8).toFixed(2)} ${(-(KNOB.z + s * 5.8)).toFixed(2)}L${(KNOB.x + c * r1).toFixed(2)} ${(-(KNOB.z + s * r1)).toFixed(2)}`);
  }
  out.push(onFace(FRONT, `<path class="iso-line" data-tone="lo" d="${ticks.join("")}"/>`));
  const KF = alongY(KNOB.x, KNOB.z, FRONT);
  out.push(S(G.disc(0, 0.8, KNOB.r + 0.9, KF, P), { tone: "lo" }));
  const knob = G.solidOf([[0.8, KNOB.r], [3.6, KNOB.r], [4.2, KNOB.r - 0.5, 1], [4.4, KNOB.r - 1.2, 1]], KF, P);
  out.push(S(knob, { tone: "mid", inner: k.fadedSvg(G.ribsOf(KF, 0.8, 3.6, KNOB.r, 30, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }) }));
  const pa = Math.PI * 0.75;
  out.push(onFace(FRONT + 4.4, `<path class="iso-line" data-tone="hi" data-free="end" d="M${KNOB.x} ${-KNOB.z}L${(KNOB.x + Math.cos(pa) * 2.6).toFixed(2)} ${(-(KNOB.z + Math.sin(pa) * 2.6)).toFixed(2)}" style="stroke-width:1"/>`));
  out.push(k.faceTextSvg(planeOf(FRONT), "LAUNDRYBOB", { size: 2.4, tone: "lo" }).replace("<text", `<text x="-26.5" y="${-(PANEL - 3.4)}"`));
  out.push(recess(`${id}-flap`, { x0: 15, x1: 25.5, z0: 9.5, z1: 14.5, r: 1, depth: 0.6 }, FRONT, `<path class="iso-line" data-tone="lo" d="M17.5 -12H23"/>`));
  out.push(onFace(FRONT, L(Array.from({ length: 7 }, (_, i) => flat(-25 + i * 2.6, 10, -24 + i * 2.6, 14.5, 0.5, 4)).join(""), { tone: "faint" })));
  // door window: the inner wall
  const win = `${id}-window`;
  out.push(`<clipPath id="${win}"><path transform="${planeOf(FRONT)}" d="${circleFlat(DOOR.x, DOOR.z, DOOR.glass)}"/></clipPath>`);
  out.push(`<g clip-path="url(#${win})">${onFace(FRONT, `<path class="ax-wall" d="${circleFlat(DOOR.x, DOOR.z, DOOR.glass + 1)}"/>`)}</g>`);
  const back = out.join("");

  // the drum
  const R = DOOR.glass;
  const drum = [`<path class="ax-drum" d="${circleFlat(DOOR.x, DOOR.z, R + 1)}"/>`];
  const holes = [];
  for (const [rr, n] of [[4, 8], [7.5, 14], [11, 20], [14, 26]])
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2 + rr;
      holes.push(`M${(DOOR.x + Math.cos(t) * rr).toFixed(2)} ${(-(DOOR.z + Math.sin(t) * rr)).toFixed(2)}h.01`);
    }
  drum.push(`<path class="ax-holes" d="${holes.join("")}"/>`);
  for (let i = 0; i < 3; i++) {
    const t = (i / 3) * Math.PI * 2, px = DOOR.x + Math.cos(t) * (R - 1.4), pz = DOOR.z + Math.sin(t) * (R - 1.4);
    drum.push(`<path class="ax-paddle" transform="rotate(${(-t * 180) / Math.PI} ${px} ${-pz})" d="${flat(px - 3.2, pz - 1.6, px + 3.2, pz + 1.6, 1.4, 4)}"/>`);
  }
  const cloth = (cx, cz, rx, rz, rot, cls) => `<ellipse class="${cls}" cx="${cx}" cy="${-cz}" rx="${rx}" ry="${rz}" transform="rotate(${rot} ${cx} ${-cz})"/>`;
  drum.push(cloth(DOOR.x - 5, DOOR.z - 8, 7, 4, -18, "ax-cloth-a"), cloth(DOOR.x + 5, DOOR.z - 7.5, 6.4, 3.8, 24, "ax-cloth-b"),
    cloth(DOOR.x, DOOR.z - 11, 7.5, 3, 4, "ax-cloth-c"), cloth(DOOR.x - 9.5, DOOR.z - 2, 4, 2.6, -60, "ax-cloth-b"), cloth(DOOR.x + 9.5, DOOR.z - 1, 3.6, 2.4, 55, "ax-cloth-c"));

  // front: glass, hinges, ring (with its hole cut out), handle
  const f = [];
  f.push(onFace(FRONT + 1.6, `<path class="ax-glass" d="${circleFlat(DOOR.x, DOOR.z, DOOR.glass)}"/>` +
    `<path class="ax-sheen" d="M${DOOR.x - 10} ${-(DOOR.z + 5)}A11.5 11.5 0 0 1 ${DOOR.x + 1} ${-(DOOR.z + 11.4)}"/>` +
    `<path class="ax-sheen" style="stroke-width:.7;opacity:.5" d="M${DOOR.x + 8} ${-(DOOR.z - 6)}A10 10 0 0 1 ${DOOR.x + 3.5} ${-(DOOR.z - 9.4)}"/>`));
  for (const z of [DOOR.z + 9, DOOR.z - 13]) {
    f.push(S(k.slabOf({ x: -25.5, y: FRONT, w: 6, d: 2.6, r: 0.8 }, z, 4.2, P, 3, 0.3), { tone: "mid" }));
    f.push(D([at([-23.6, FRONT + 2.6, z + 2.1])], { size: 0.4 }));
  }
  const DF = alongY(DOOR.x, DOOR.z, FRONT);
  const hole = Array.from({ length: 96 }, (_, i) => {
    const t = (i / 96) * Math.PI * 2;
    return at([DOOR.x + Math.cos(t) * DOOR.glass, FRONT + 3.4, DOOR.z + Math.sin(t) * DOOR.glass]);
  });
  f.push(`<clipPath id="${id}-ring"><path clip-rule="evenodd" d="M-2000 -2000H4000V4000H-2000Z${k.pathOf(hole, true)}"/></clipPath><g clip-path="url(#${id}-ring)">`);
  f.push(S(G.ringBand(0, 3.4, DOOR.glass, DOOR.r, DF, P, { bevel: 0.6 }), { tone: "mid", inner: L(G.circleOf(DF, 3.4, 17.6, P, 96), { tone: "faint" }) }));
  f.push(S(G.ringBand(3.4, 4.1, DOOR.glass, DOOR.glass + 1.4, DF, P), { tone: "hi", crease: "lo" }));
  f.push(`</g>`);
  f.push(S(k.slabOf({ x: 17.6, y: FRONT + 2.4, w: 5.2, d: 3.4, r: 1.4 }, DOOR.z - 6.5, 13, P, 3, 0.4), { tone: "mid" }));
  f.push(onFace(FRONT + 5.8, L(flat(19.2, DOOR.z - 4.5, 21.2, DOOR.z + 4.5, 1, 4), { tone: "lo" })));
  if (hose) f.push(drainHose(hose));
  if (towels) {
    let z = TOP;
    [{ x: -20, y: -18, w: 28, d: 22, r: 3.5, h: 3.4 }, { x: -18.5, y: -16.5, w: 25, d: 19, r: 3.5, h: 3.2 }].forEach(({ h, ...plan }, i) => {
      f.push(S(k.slabOf(plan, z, h, P, 8, 0.5), { tone: "hi", crease: "lo", inner: L(k.sideSeam(plan, z + h / 2, P, 8), { tone: "faint" }), className: i ? "ax-towel-b" : "ax-towel-a" }));
      z += h;
    });
  }
  return { back, drum: drum.join(""), front: f.join(""), clip: win, drumPlane: planeOf(FRONT - DRUM_DEPTH), center: [DOOR.x, -DOOR.z], lcd };
}

/** One frame of a built washer: the drum turned by `angle` degrees, the LCD showing `lcd` (defaults to the built text). */
export function washerFrame(W, angle = 0, lcd = W.lcd) {
  const back = lcd === W.lcd ? W.back : W.back.replace(`>${W.lcd}</text>`, `>${lcd}</text>`);
  return back + `<g clip-path="url(#${W.clip})"><g transform="${W.drumPlane}"><g transform="rotate(${-angle} ${W.center[0]} ${W.center[1]})">${W.drum}</g></g></g>` + W.front;
}

/** Drain hose from the right side to a standpipe on the floor (relative to the machine). */
function drainHose([px, py]) {
  const out = [];
  const PORT = [SIDE, -12, 24];
  const F = G.frameAlong(PORT, [1, 0, 0]);
  out.push(S(G.disc(0, 1.2, 3.4, F, P), { tone: "lo" }), S(G.disc(1.2, 2.8, 2.4, F, P), { tone: "mid" }));
  const TOPZ = 14;
  out.push(S(k.cylinder(px, py, 6.2, 0, 0.8, P, 40), { tone: "lo", crease: "none" }));
  out.push(S(k.cylinder(px, py, 3.2, 0.8, 1.6, P, 28), { tone: "lo" }));
  out.push(S(k.cylinder(px, py, 2.6, 2.4, TOPZ - 2.4, P, 28), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(px, py, 3.1, TOPZ, 1.4, P, 28), { tone: "mid" }));
  const route = G.fillet([[SIDE + 2.8, PORT[1], PORT[2]], [px, PORT[1], PORT[2]], [px, py, PORT[2]], [px, py, TOPZ + 1.4]], 6, 9, { P, tube: 1.5 });
  const pieces = tubePieces(route, 1.5, P, { maxLength: 14, rings: { pitch: 1.6, fade: [0.1, 0.55] } });
  pieces.sort((a, b) => k.depthOf(a.mid, P) - k.depthOf(b.mid, P));
  out.push(pieces.map((p) => tubeSvg(p, { tone: "hi" })).join(""));
  return out.join("");
}
