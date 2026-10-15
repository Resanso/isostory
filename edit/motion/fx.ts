// Shared timing helpers for the motion kit. Everything is a pure function of t (edit seconds): no timers, no CSS animation.
import { interpolate, Easing } from "remotion";

export const W = 1080, H = 1920;
export const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const easeOut = Easing.bezier(0.22, 1, 0.36, 1); // entrances, camera settles
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1); // pans, wipes
export const easeIn = Easing.bezier(0.55, 0, 1, 0.45); // exits
/** 0→1 from a over d seconds (eased). */
export const p01 = (t: number, a: number, d = 0.3, easing = easeOut) => interpolate(t, [a, a + d], [0, 1], { ...cl, easing });
/** 1 while a ≤ t < b, with a soft in and out of `fade` seconds. */
export const window01 = (t: number, a: number, b: number, fade = 0.12) =>
  Math.min(interpolate(t, [a, a + fade], [0, 1], cl), interpolate(t, [b - fade, b], [1, 0], cl));
/** Triangle 0→1→0 centred on c, half-width h. Use for flashes and the peak of a transition. */
export const peak = (t: number, c: number, h: number) => Math.max(0, 1 - Math.abs(t - c) / h);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// Editorial palette, measured from the reference reels (dark warm talking head, yellow key words, red marker).
export const INK = {
  yellow: "#F6C81B", // key words on footage
  white: "#FFFFFF",
  red: "#E3262B", // marker ellipse, label bars, the ≠
  green: "#3CE36A", // money / growth numbers only
  black: "#0B0B0B",
  paper: "#F4F4F2", // white boards
  board: "radial-gradient(ellipse 80% 60% at 50% 42%, #ffffff 0%, #f3f3f3 45%, #cfcfcf 100%)",
};
export const FONT = {
  sans: "'Inter Tight'", // lead + key lines
  serif: "'Instrument Serif'", // italic tail lines, quotes
  mono: "'Courier Prime', 'Courier New', monospace", // terminal board
};
// Shadow that keeps white/yellow type legible over footage without a box.
export const TEXT_SHADOW = "0 3px 18px rgba(0,0,0,.55), 0 1px 3px rgba(0,0,0,.6)";
