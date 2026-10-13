// Shared tools for Anatomy objects in a story: one projection for every scene (a consistent scale).
// Objects are built at their own origin and placed with translateAlong (the projection is orthographic, so affine).
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";

export { k, G };
export const P = { origin: [0, 0], scale: 1, azimuth: 52, elevation: 30 };
export const at = (p) => k.iso(p, P);
export const S = (paths, style) => k.solidSvg(paths, style);
export const L = (d, style) => k.lineSvg(d, style);
export const D = (pts, style) => k.dotsSvg(pts, style);
export const depth = (p) => k.depthOf(p, P);
export const planeOf = (y) => k.sideMatrix([0, y], 0, P, "left");
/** The vertical plane x = const (right side), local coordinates (y, −z). */
export const sideOf = (x) => k.sideMatrix([x, 0], 0, P, "right");
export const flat = (x0, z0, x1, z1, r, steps = 6) =>
  k.pathOf(k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, steps).map(([u, z]) => [u, -z]), true);
export const circleFlat = (cx, cz, r, n = 64) =>
  k.pathOf(Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * 2 * Math.PI) * r, -(cz + Math.sin((i / n) * 2 * Math.PI) * r)]), true);
export const onFace = (y, inner) => `<g transform="${planeOf(y)}">${inner}</g>`;
export const byDepth = (pts) => [...pts].sort((a, b) => depth([a[0], a[1], 0]) - depth([b[0], b[1], 0]));
export const alongY = (x, z, y) => G.frameAlong([x, y, z], [0, 1, 0]);
export const place = (offset) => k.translateAlong(P, offset);
export const halo = (plan, z, h, blur = 3) => `<path class="iso-halo" d="${k.haloOf(plan, z, h, P)}" style="filter:blur(${blur}px)"/>`;

/** A rectangular recess in the front plane y: walls shaded by facing, `back` drawn on the back plane. */
export function recess(id, { x0, x1, z0, z1, r, depth: dd }, y, back = "", backClass = "ax-well") {
  const ring = k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, 6);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const { sinA } = k.cameraOf(P);
  const tops = [], sides = [[], [], [], []];
  ring.forEach(([ax, az], i) => {
    const [bx, bz] = ring[(i + 1) % ring.length];
    const len = Math.hypot(bx - ax, bz - az) || 1;
    let [nx, nz] = [(bz - az) / len, -(bx - ax) / len];
    if (nx * (cx - (ax + bx) / 2) + nz * (cz - (az + bz) / 2) < 0) [nx, nz] = [-nx, -nz];
    if (nx <= 0 && nz <= 0) return;
    const quad = k.pathOf([at([ax, y, az]), at([bx, y, bz]), at([bx, y - dd, bz]), at([ax, y - dd, az])], true);
    if (nz >= nx) tops.push(quad);
    else sides[Math.min(3, Math.max(0, Math.floor(((nx * -sinA + 1) / 2) * 4)))].push(quad);
  });
  const shape = flat(x0, z0, x1, z1, r);
  return [
    `<clipPath id="${id}"><path transform="${planeOf(y)}" d="${shape}"/></clipPath>`,
    `<g clip-path="url(#${id})">`,
    `<path class="iso-top" d="${tops.join("")}"/>`,
    ...sides.map((d, s) => (d.length ? `<path class="iso-shade" data-shade="${s}" d="${d.join("")}"/>` : "")),
    onFace(y - dd, `<path class="${backClass}" d="${shape}"/>${back}<path class="iso-line" data-tone="faint" d="${shape}"/>`),
    `</g>`,
    onFace(y, `<path class="iso-line" data-tone="lo" d="${shape}"/>`),
  ].join("");
}

/** A floor plate on feet with a groove and corner screws: the ground of every scene. */
export function basePlate(plan, h = 6, foot = 4) {
  const out = [`<path class="iso-halo" d="${k.haloOf(plan, -h - foot, h, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(plan, 12))) {
    out.push(S(k.cylinder(x, y, 5, -h - foot, 1.4, P, 24), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 3.8, -h - foot + 1.4, foot - 1.4, P, 24), { tone: "mid" }));
  }
  out.push(S(k.slabOf(plan, -h, h, P, 8, 1.2), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 4), 0, P), { tone: "lo" }));
  const screws = k.corners(plan, 8);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 1.8, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

/** Screen bounds (viewBox) of a set of world points. */
export function boundsOf(points, pad = 20) {
  const f = points.map(at);
  const xs = f.map((p) => p[0]), ys = f.map((p) => p[1]);
  const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad;
  return [x0, y0, Math.max(...xs) + pad - x0, Math.max(...ys) + pad - y0];
}
