// Hand-drawn marks that wrap whatever they mark, so nothing has to be measured:
//   <Mark t={t} at={at(12)} kind="ellipse">29 Juta</Mark>
// kinds: ellipse (red marker loop), underline (marker swipe), highlight (yellow marker behind),
// strike, box (red bar label behind, white text). The SVG stretches to the wrapped span.
import React from "react";
import { evolvePath } from "@remotion/paths";
import { interpolate } from "remotion";
import { INK, p01, cl } from "./fx";

export type MarkKind = "ellipse" | "underline" | "highlight" | "strike" | "box";

// A loose ellipse that overshoots its start, drawn in a 200x100 box (stretched to the word).
const LOOP = "M 150 10 C 60 -2, 4 20, 6 52 C 8 84, 70 98, 120 94 C 176 90, 198 66, 194 44 C 190 20, 150 6, 96 8 C 76 9, 60 12, 48 16";
const SWIPE = "M 2 60 C 50 52, 120 50, 198 46";
const STRIKE = "M 0 52 C 60 48, 140 50, 200 46";

export const Mark: React.FC<{ t: number; at: number; kind?: MarkKind; color?: string; dur?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  t, at, kind = "ellipse", color, dur, children, style,
}) => {
  const d = dur ?? (kind === "ellipse" ? 0.42 : 0.28);
  const p = p01(t, at, d);
  if (kind === "highlight" || kind === "box") {
    const bg = color ?? (kind === "box" ? INK.red : INK.yellow);
    return (
      <span style={{ position: "relative", display: "inline-block", ...style }}>
        <span style={{ position: "absolute", left: "-0.12em", right: "-0.12em", top: kind === "box" ? "0.02em" : "0.18em", bottom: kind === "box" ? "0.0em" : "0.06em",
          background: bg, transform: `scaleX(${p})`, transformOrigin: "0 50%", zIndex: 0, mixBlendMode: kind === "highlight" ? "multiply" : undefined, borderRadius: 2 }} />
        <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
      </span>
    );
  }
  const path = kind === "ellipse" ? LOOP : kind === "underline" ? SWIPE : STRIKE;
  const { strokeDasharray, strokeDashoffset } = evolvePath(p, path);
  // explicit box (an absolutely placed <svg> with auto size falls back to 300x150)
  const box = kind === "ellipse" ? { left: "-14%", top: "-22%", width: "128%", height: "148%" } : kind === "underline" ? { left: "-4%", top: "70%", width: "108%", height: "40%" } : { left: "-6%", top: "4%", width: "112%", height: "92%" };
  return (
    <span style={{ position: "relative", display: "inline-block", ...style }}>
      {children}
      <svg viewBox="0 0 200 100" preserveAspectRatio="none" style={{ position: "absolute", ...box, overflow: "visible", pointerEvents: "none" }}>
        <path d={path} fill="none" stroke={color ?? INK.red} strokeWidth={kind === "ellipse" ? 5 : 7} strokeLinecap="round" vectorEffect="non-scaling-stroke"
          strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} />
      </svg>
    </span>
  );
};

// A curved hand-drawn arrow from (x1,y1) to (x2,y2) in stage pixels; bend > 0 curves to the left of travel.
export const Arrow: React.FC<{ t: number; at: number; x1: number; y1: number; x2: number; y2: number; bend?: number; color?: string; width?: number; dur?: number }> = ({
  t, at, x1, y1, x2, y2, bend = 0.3, color = "#111", width = 5, dur = 0.4,
}) => {
  const p = p01(t, at, dur);
  if (p <= 0) return null;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1;
  const cx = mx - dy * bend, cy = my + dx * bend;
  const d = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
  const { strokeDasharray, strokeDashoffset } = evolvePath(p, d);
  // head along the end tangent
  const a = Math.atan2(y2 - cy, x2 - cx), L = 26, head = interpolate(p, [0.8, 1], [0, 1], cl);
  const hd = `M ${x2 - L * Math.cos(a - 0.5)} ${y2 - L * Math.sin(a - 0.5)} L ${x2} ${y2} L ${x2 - L * Math.cos(a + 0.5)} ${y2 - L * Math.sin(a + 0.5)}`;
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} />
      <path d={hd} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" opacity={head} />
    </svg>
  );
};
