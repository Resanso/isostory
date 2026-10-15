// Camera moves as pure functions of t. Each returns { s, x, y } (scale and focus point in stage px) or a
// transform; compose them by adding offsets and multiplying scales, then call camStyle() once per layer.
// Use the SAME camera on the footage and on anything glued to it (a person matte, a decal).
import React from "react";
import { interpolate } from "remotion";
import { noise2D } from "@remotion/noise";
import { W, H, cl, easeOut, easeInOut, p01 } from "./fx";

export type Cam = { s: number; x: number; y: number; rot?: number }; // scale; focus point that stays put; degrees

/** Transform for a full-frame layer: scale about the focus point, never showing an edge. */
export const camStyle = (c: Cam, clampEdges = true): React.CSSProperties => {
  let tx = c.x - c.x * c.s, ty = c.y - c.y * c.s;
  if (clampEdges && c.s >= 1) { tx = Math.min(0, Math.max(W - W * c.s, tx)); ty = Math.min(0, Math.max(H - H * c.s, ty)); }
  return { transform: `translate(${tx}px, ${ty}px) scale(${c.s})${c.rot ? ` rotate(${c.rot}deg)` : ""}`, transformOrigin: "0 0" };
};

/**
 * Punch-in: an instant (3-frame) step to a tighter crop on an emphasis word, held until `until`, then a
 * snap back. The reference uses ~1.15–1.35 on punch lines and alternates wide/tight between shots.
 */
export const punch = (t: number, at: number, until: number, s = 1.22, snap = 0.1) => {
  if (t < at || t > until + snap) return 1;
  return t <= until ? interpolate(t, [at, at + snap], [1, s], { ...cl, easing: easeOut }) : interpolate(t, [until, until + snap], [s, 1], cl);
};

/** Slow push-in over a shot or a still (Ken Burns): s0→s1 between a and b. */
export const push = (t: number, a: number, b: number, s0 = 1, s1 = 1.08) => interpolate(t, [a, b], [s0, s1], cl);

/** Ken Burns for a still: push + a drift of the focus point from p0 to p1 (stage px). */
export const kenBurns = (t: number, a: number, b: number, from: Cam, to: Cam): Cam => {
  const k = interpolate(t, [a, b], [0, 1], { ...cl, easing: easeInOut });
  return { s: from.s + (to.s - from.s) * k, x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
};

/** Zoom-out reveal for a hook: starts tight (s0) and settles to 1 over d seconds. */
export const zoomOut = (t: number, at: number, s0 = 1.6, d = 0.6) => interpolate(t, [at, at + d], [s0, 1], { ...cl, easing: easeOut });

/** Handheld drift in px and degrees: keeps stills and boards alive. amp ≈ 4–8 px. */
export const handheld = (t: number, amp = 5, seed = "hh") => ({
  dx: noise2D(seed + "x", t * 0.35, 0) * amp,
  dy: noise2D(seed + "y", t * 0.35, 0) * amp,
  rot: noise2D(seed + "r", t * 0.25, 0) * amp * 0.04,
});

/** Impact shake that decays over d seconds (on a boom or a stamp). */
export const shake = (t: number, at: number, amp = 18, d = 0.35, seed = "sh") => {
  if (t < at || t > at + d) return { dx: 0, dy: 0 };
  const k = 1 - (t - at) / d;
  return { dx: noise2D(seed, t * 30, 0) * amp * k * k, dy: noise2D(seed, 0, t * 30) * amp * k * k };
};

/** Rack focus: blur in px, sharp at `at`, coming from `from` px over d. Use on a layer entering behind text. */
export const rackFocus = (t: number, at: number, from = 18, d = 0.35) => (1 - p01(t, at - d, d)) * from;

/** Whip pan offset in px for a layer leaving (dir -1 left, 1 right) around a cut at c. */
export const whip = (t: number, c: number, dir = -1, d = 0.12) => ({
  out: interpolate(t, [c - d, c], [0, dir * W * 1.1], { ...cl, easing: (x) => x * x }),
  in: interpolate(t, [c, c + d], [-dir * W * 1.1, 0], { ...cl, easing: easeOut }),
  blur: Math.max(0, 1 - Math.abs(t - c) / d) * 60,
});

/**
 * Parallax (2.5D) for a photo split into a background and a cutout (assets/cutout): the cutout moves
 * `depth` times as much as the background. Returns two cams.
 */
export const parallax = (t: number, a: number, b: number, base: Cam, travel = { s: 0.06, x: 40, y: 0 }, depth = 1.8): { bg: Cam; fg: Cam } => {
  const k = interpolate(t, [a, b], [0, 1], { ...cl, easing: easeInOut });
  return {
    bg: { s: base.s + travel.s * k, x: base.x - travel.x * k, y: base.y - travel.y * k },
    fg: { s: base.s + travel.s * depth * k, x: base.x - travel.x * depth * k, y: base.y - travel.y * depth * k },
  };
};
