// Transitions measured on the reference reels. Two kinds:
//  - OVERLAYS sit on top of a hard cut at time c and hide it: <LightLeak/>, <FilmBurn/>, <Flash/>, <Glitch/>.
//    Put the cut itself in your layers (layer A until c, layer B from c), then add the overlay centred on c.
//  - BETWEEN wraps two layers and blends them itself: <Between kind="blurzoom|slice|whip|push|dip" .../>.
// Hard cuts stay the default (≈70% of changes in the references); use a transition on a change of place
// (speaker → board, board → photo), never between two speaker shots.
import React from "react";
import { AbsoluteFill, interpolate, random } from "remotion";
import { noise2D } from "@remotion/noise";
import { W, H, cl, easeOut, easeIn, peak, FONT } from "./fx";

/** Warm light leak / bloom: an orange-to-white glow that peaks on the cut (0.5–0.7 s total). */
export const LightLeak: React.FC<{ t: number; c: number; d?: number; seed?: string; hue?: "warm" | "white" }> = ({ t, c, d = 0.6, seed = "ll", hue = "warm" }) => {
  const k = peak(t, c, d / 2);
  if (k <= 0) return null;
  const x = 50 + noise2D(seed, t * 1.3, 0) * 30, y = 40 + noise2D(seed, 0, t * 1.3) * 25;
  const core = hue === "warm" ? "255,246,214" : "255,255,255", mid = hue === "warm" ? "255,150,40" : "235,235,235", edge = hue === "warm" ? "190,50,10" : "180,180,180";
  return (
    <AbsoluteFill style={{ mixBlendMode: "screen", opacity: Math.min(1, k * 1.4),
      background: `radial-gradient(ellipse ${70 + k * 60}% ${50 + k * 50}% at ${x}% ${y}%, rgba(${core},${k}) 0%, rgba(${mid},${k * 0.85}) 35%, rgba(${edge},${k * 0.5}) 70%, rgba(0,0,0,0) 100%)` }} />
  );
};

/** Film burn: a hot orange/red edge sweeping across, used into a black or retro board. */
export const FilmBurn: React.FC<{ t: number; c: number; d?: number; seed?: string }> = ({ t, c, d = 0.5, seed = "fb" }) => {
  const k = peak(t, c, d / 2);
  if (k <= 0) return null;
  const sweep = interpolate(t, [c - d / 2, c + d / 2], [-40, 140], cl);
  const wob = noise2D(seed, t * 4, 0) * 12;
  return (
    <AbsoluteFill style={{ mixBlendMode: "screen", opacity: k,
      background: `linear-gradient(${100 + wob}deg, rgba(0,0,0,0) ${sweep - 60}%, rgba(170,30,0,.9) ${sweep - 30}%, rgba(255,140,20,1) ${sweep - 8}%, rgba(255,245,200,1) ${sweep}%, rgba(255,120,10,.9) ${sweep + 14}%, rgba(0,0,0,0) ${sweep + 45}%)` }} />
  );
};

/** Hard white (or yellow) flash, 2–4 frames: on a punch line or a beat. */
export const Flash: React.FC<{ t: number; c: number; d?: number; color?: string }> = ({ t, c, d = 0.12, color = "#fff" }) => {
  const k = peak(t, c, d / 2);
  return k > 0 ? <AbsoluteFill style={{ background: color, opacity: k }} /> : null;
};

/** Digital glitch / "no signal": RGB-split blocks and a scrolling label for 6–10 frames. */
export const Glitch: React.FC<{ t: number; c: number; d?: number; label?: string; seed?: number }> = ({ t, c, d = 0.3, label = "NO SIGNAL", seed = 1 }) => {
  if (Math.abs(t - c) > d / 2) return null;
  const fr = Math.floor(t * 30);
  const cols = ["#ff1e56", "#00ff6a", "#ff00e1", "#1e90ff", "#ffe600", "#000"];
  const bands = Array.from({ length: 9 }, (_, i) => {
    const r = (k: string) => random(`${seed}-${fr}-${i}-${k}`);
    return { y: r("y") * H, h: 40 + r("h") * 260, x: r("x") * W * 0.5, w: W * (0.4 + r("w") * 0.8), c: cols[Math.floor(r("c") * cols.length)] };
  });
  return (
    <AbsoluteFill>
      {bands.map((b, i) => <div key={i} style={{ position: "absolute", left: b.x - W * 0.2, top: b.y, width: b.w, height: b.h, background: b.c, mixBlendMode: i % 3 ? "normal" : "difference" }} />)}
      <div style={{ position: "absolute", top: H * 0.45, left: 40, font: `700 120px ${FONT.mono}`, color: "#ff1e56", textShadow: "6px 0 #00ff6a, -6px 0 #1e90ff", transform: `translateX(${(random(`${seed}-${fr}-lx`) - 0.5) * 80}px)` }}>{label}</div>
    </AbsoluteFill>
  );
};

/** Film grain + slight vignette for footage grades; amount 0..1. Cheap: an SVG turbulence that reseeds each frame. */
export const Grain: React.FC<{ t: number; amount?: number }> = ({ t, amount = 0.08 }) => {
  const seed = Math.floor(t * 24) % 97;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: amount, mixBlendMode: "overlay" }}>
      <svg width="100%" height="100%"><filter id={`g${seed}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} /></filter><rect width="100%" height="100%" filter={`url(#g${seed})`} /></svg>
    </AbsoluteFill>
  );
};

/**
 * Blend two layers around a change at c (seconds), d = total length.
 *  blurzoom: A pushes in and blurs out while B settles from a blur (the default "dissolve" of the reference)
 *  slice:    B wipes in as horizontal bands from the bottom half first (the reference's split-frame cut)
 *  whip:     horizontal whip with motion blur
 *  push:     B pushes A up (scroll feel: doc → doc, list → list)
 *  dip:      A dims to black, B comes up (into a black terminal board)
 */
export const Between: React.FC<{ t: number; c: number; d?: number; kind: "blurzoom" | "slice" | "whip" | "push" | "dip"; a: React.ReactNode; b: React.ReactNode; dir?: 1 | -1 }> = ({
  t, c, d = 0.35, kind, a, b, dir = -1,
}) => {
  const k = interpolate(t, [c - d / 2, c + d / 2], [0, 1], { ...cl, easing: kind === "dip" ? undefined : easeOut });
  if (k <= 0) return <AbsoluteFill>{a}</AbsoluteFill>;
  if (k >= 1) return <AbsoluteFill>{b}</AbsoluteFill>;
  if (kind === "blurzoom") return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${1 + k * 0.18})`, filter: `blur(${k * 24}px)`, opacity: 1 - k }}>{a}</AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${1.12 - k * 0.12})`, filter: `blur(${(1 - k) * 24}px)`, opacity: k }}>{b}</AbsoluteFill>
    </AbsoluteFill>
  );
  if (kind === "slice") {
    const bands = 6;
    return (
      <AbsoluteFill>
        <AbsoluteFill>{a}</AbsoluteFill>
        {Array.from({ length: bands }, (_, i) => {
          const order = bands - 1 - i; // bottom band first
          const kb = interpolate(k, [order / (bands + 2), (order + 3) / (bands + 2)], [0, 1], { ...cl, easing: easeOut });
          const top = (i / bands) * 100, bottom = 100 - ((i + 1) / bands) * 100;
          return <AbsoluteFill key={i} style={{ clipPath: `inset(${top}% ${(1 - kb) * 100}% ${bottom}% 0)` }}>{b}</AbsoluteFill>;
        })}
      </AbsoluteFill>
    );
  }
  if (kind === "whip") {
    const blur = Math.sin(k * Math.PI) * 50;
    const f = `whip${Math.round(blur)}`;
    return (
      <AbsoluteFill style={{ filter: `url(#${f})` }}>
        <svg width="0" height="0" style={{ position: "absolute" }}><filter id={f} x="-20%" width="140%"><feGaussianBlur stdDeviation={`${blur} 0`} /></filter></svg>
        <AbsoluteFill style={{ transform: `translateX(${dir * k * W}px)` }}>{a}</AbsoluteFill>
        <AbsoluteFill style={{ transform: `translateX(${-dir * (1 - k) * W}px)` }}>{b}</AbsoluteFill>
      </AbsoluteFill>
    );
  }
  if (kind === "push") return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `translateY(${-k * H * 0.35}px)`, opacity: 1 - k, filter: `blur(${k * 10}px)` }}>{a}</AbsoluteFill>
      <AbsoluteFill style={{ transform: `translateY(${(1 - k) * H * 0.25}px)`, opacity: k }}>{b}</AbsoluteFill>
    </AbsoluteFill>
  );
  // dip
  const ka = interpolate(k, [0, 0.5], [1, 0], { ...cl, easing: easeIn }), kb = interpolate(k, [0.5, 1], [0, 1], { ...cl, easing: easeOut });
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {ka > 0 && <AbsoluteFill style={{ opacity: ka }}>{a}</AbsoluteFill>}
      {kb > 0 && <AbsoluteFill style={{ opacity: kb }}>{b}</AbsoluteFill>}
    </AbsoluteFill>
  );
};
