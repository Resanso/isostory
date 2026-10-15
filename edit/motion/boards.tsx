// Inserts (full-frame layers that replace the speaker for a beat), measured on the reference reels:
//   <WhiteBoard/>   white vignette paper with soft diagonal swooshes; black type + a B/W cutout or a 3D object
//   <Photo/>        a full-bleed photo with a slow push (or 2.5D parallax with a cutout), graded, legible bottom
//   <DocCard/>      a screenshot of an article / AI answer that rises into focus, scrolls, and gets highlighted
//   <TerminalList/> black retro list with ▶ ◀ selector and scanlines (a "menu" of points)
//   <LineChart/>    graph-paper board with a line that draws on
//   <Rain/>         falling sprites (banknotes, icons) with depth blur, over anything
// Every asset comes from the person's folder or from assets/find.mjs, with its credit kept in credits.json.
import React from "react";
import { AbsoluteFill, Img, interpolate, random, staticFile } from "remotion";
import { evolvePath } from "@remotion/paths";
import { W, H, INK, FONT, cl, easeOut, easeInOut, p01 } from "./fx";
import { Cam, camStyle, handheld } from "./camera";

const src = (s: string) => (/^(https?:|data:|\/)/.test(s) ? s : staticFile(s));

/** White paper board. swoosh: number of soft diagonal bands (0–2). Children are laid out on the 1080x1920 stage. */
export const WhiteBoard: React.FC<{ t: number; swoosh?: number; drift?: boolean; children?: React.ReactNode; tone?: "white" | "grey" }> = ({ t, swoosh = 1, drift = true, children, tone = "white" }) => {
  const h = drift ? handheld(t, 6, "wb") : { dx: 0, dy: 0, rot: 0 };
  return (
    <AbsoluteFill style={{ background: tone === "white" ? INK.board : "radial-gradient(ellipse 80% 60% at 50% 42%, #f2f2f2 0%, #d8d8d8 55%, #9c9c9c 100%)", overflow: "hidden" }}>
      {Array.from({ length: swoosh }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: -300 + i * 420, top: -200 + i * 900, width: 1700, height: 260, borderRadius: 200,
          background: "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.08) 40%, rgba(0,0,0,.14) 60%, rgba(0,0,0,0) 100%)",
          filter: "blur(14px)", transform: `rotate(${-58 + i * 6}deg) translateX(${h.dx * 4}px)` }} />
      ))}
      <AbsoluteFill style={{ transform: `translate(${h.dx}px, ${h.dy}px) rotate(${h.rot}deg)` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** A picture placed on a board: a cutout PNG (assets/cutout --bw) or any image, entering with a soft rise. */
export const Placed: React.FC<{ t: number; at: number; src: string; x: number; y: number; w: number; enter?: "rise" | "pop" | "drop"; shadow?: boolean; bw?: boolean; style?: React.CSSProperties }> = ({
  t, at, src: s, x, y, w, enter = "rise", shadow = true, bw = false, style,
}) => {
  if (t < at - 0.02) return null;
  const k = p01(t, at, enter === "drop" ? 0.5 : 0.4);
  const tr = enter === "pop" ? `scale(${0.7 + 0.3 * k})` : enter === "drop" ? `translateY(${(1 - k) * -260}px) rotate(${(1 - k) * -14}deg)` : `translateY(${(1 - k) * 60}px)`;
  return <Img src={src(s)} style={{ position: "absolute", left: x, top: y, width: w, opacity: Math.min(1, k * 1.6), transform: tr, filter: `${bw ? "grayscale(1) contrast(1.08) " : ""}${shadow ? "drop-shadow(0 30px 40px rgba(0,0,0,.25))" : ""}`, ...style }} />;
};

/**
 * Full-bleed photo. cam: a Cam (push, kenBurns, parallax.bg) — defaults to a slow push over [at, until].
 * fg + fgCam: the cutout of the same photo for a 2.5D move. grade: warm (the reference), cool, bw, none.
 * shade: darken the bottom 45% so captions read.
 */
export const Photo: React.FC<{ t: number; at: number; until: number; src: string; cam?: Cam; fg?: string; fgCam?: Cam; grade?: "warm" | "cool" | "bw" | "none"; shade?: number; objectPosition?: string }> = ({
  t, at, until, src: s, cam, fg, fgCam, grade = "warm", shade = 0.55, objectPosition = "50% 50%",
}) => {
  const c = cam ?? { s: interpolate(t, [at, until], [1.02, 1.1], cl), x: W / 2, y: H * 0.45 };
  const filter = { warm: "saturate(.9) contrast(1.05) sepia(.12)", cool: "saturate(.85) contrast(1.05) hue-rotate(-8deg)", bw: "grayscale(1) contrast(1.1)", none: "" }[grade];
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={camStyle(c)}><Img src={src(s)} style={{ width: W, height: H, objectFit: "cover", objectPosition, filter }} /></AbsoluteFill>
      {fg && <AbsoluteFill style={camStyle(fgCam ?? c)}><Img src={src(fg)} style={{ width: W, height: H, objectFit: "cover", objectPosition, filter }} /></AbsoluteFill>}
      {shade > 0 && <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,${shade}) 100%)` }} />}
    </AbsoluteFill>
  );
};

/**
 * A screenshot (article, AI answer, tweet) as a card. It rises into focus at `at`, scrolls by `scroll` px
 * over its life, and lights a highlight band at hl = { at, y, h } (card px, before scaling).
 * over = "white" (paper board) or "dim" (on top of the darkened, blurred speaker: pass the speaker as `behind`).
 */
export const DocCard: React.FC<{ t: number; at: number; until: number; src: string; width?: number; y?: number; scroll?: number;
  hl?: { at: number; y: number; h: number; color?: string }[]; over?: "white" | "dim"; behind?: React.ReactNode }> = ({
  t, at, until, src: s, width = 940, y = 300, scroll = 220, hl = [], over = "white", behind,
}) => {
  const k = p01(t, at, 0.45);
  const sc = interpolate(t, [at + 0.3, until], [0, scroll], { ...cl, easing: easeInOut });
  const card = (
    <div style={{ position: "absolute", left: (W - width) / 2, top: y + (1 - k) * 160 - sc, width, opacity: k, filter: `blur(${(1 - k) * 14}px)`, transform: `scale(${1.05 - 0.05 * k})`,
      borderRadius: 18, overflow: "hidden", boxShadow: over === "white" ? "0 30px 60px rgba(0,0,0,.18)" : "0 30px 80px rgba(0,0,0,.6)" }}>
      <Img src={src(s)} style={{ width, display: "block" }} />
      {hl.map((h, i) => (
        <div key={i} style={{ position: "absolute", left: 0, top: h.y, height: h.h, width: "100%", background: h.color ?? INK.yellow, mixBlendMode: "multiply", opacity: 0.85,
          transform: `scaleX(${p01(t, h.at, 0.35)})`, transformOrigin: "0 50%" }} />
      ))}
    </div>
  );
  if (over === "white") return <WhiteBoard t={t} swoosh={0}>{card}</WhiteBoard>;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ filter: `blur(${k * 10}px) brightness(${1 - k * 0.55})` }}>{behind}</AbsoluteFill>
      {card}
    </AbsoluteFill>
  );
};

/** Black retro list: rows in a typewriter serif, the current row lit between ▶ ◀, scanlines, a red tape bar. */
export const TerminalList: React.FC<{ t: number; at: number; rows: string[]; picks: number[]; red?: boolean }> = ({ t, at, rows, picks, red = true }) => {
  // picks[i] = time row i becomes current
  let cur = 0; picks.forEach((p, i) => { if (t >= p) cur = i; });
  const k = p01(t, at, 0.3);
  const scroll = interpolate(t, picks.length ? picks : [0], picks.map((_, i) => i * 92), cl);
  return (
    <AbsoluteFill style={{ background: "#020202", opacity: k }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.45 - scroll }}>
        {rows.map((r, i) => {
          const on = i === cur;
          return (
            <div key={i} style={{ height: 92, display: "flex", alignItems: "center", justifyContent: "center", gap: 40, font: `400 60px ${FONT.mono}`, color: on ? "#e8e8e8" : "#4a4a4a", filter: on ? "none" : "blur(1.5px)" }}>
              <span style={{ opacity: on ? 1 : 0 }}>▶</span><span style={{ minWidth: 720 }}>{`${i + 1}. ${r}`}</span><span style={{ opacity: on ? 1 : 0 }}>◀</span>
            </div>
          );
        })}
      </div>
      <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(255,255,255,.035) 0 2px, rgba(0,0,0,0) 2px 5px)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,.85) 100%)" }} />
      {red && <div style={{ position: "absolute", left: 0, bottom: 0, width: W * 0.45, height: 120, background: "#b40d0d", opacity: 0.85 }} />}
    </AbsoluteFill>
  );
};

/** Line chart on graph paper; points in 0..1 (x, y-up). The line draws on between at and at+d; label under the axis. */
export const LineChart: React.FC<{ t: number; at: number; points: [number, number][]; d?: number; note?: string; box?: { x: number; y: number; w: number; h: number } }> = ({
  t, at, points, d = 1.6, note, box = { x: 110, y: 820, w: 860, h: 560 },
}) => {
  const pts = points.map(([x, y]) => [box.x + x * box.w, box.y + (1 - y) * box.h]);
  const path = pts.map(([x, y], i) => `${i ? "L" : "M"} ${x} ${y}`).join(" ");
  const p = p01(t, at, d, easeInOut);
  const { strokeDasharray, strokeDashoffset } = evolvePath(p, path);
  const [ex, ey] = pts[Math.min(pts.length - 1, Math.floor(p * (pts.length - 1) + 0.0001))];
  return (
    <WhiteBoard t={t} swoosh={0}>
      <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h,
        backgroundImage: "linear-gradient(#ddd 1px, transparent 1px), linear-gradient(90deg, #ddd 1px, transparent 1px)", backgroundSize: `${box.w / 10}px ${box.h / 7}px`,
        borderLeft: "3px solid #111", borderBottom: "3px solid #111" }} />
      <svg style={{ position: "absolute", inset: 0, width: W, height: H }}>
        <path d={path} fill="none" stroke="#111" strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} />
        {p > 0 && <circle cx={ex} cy={ey} r={10} fill="#111" />}
      </svg>
      {note && <div style={{ position: "absolute", left: box.x, top: box.y + box.h + 20, font: `500 22px ${FONT.sans}`, color: "#555" }}>{note}</div>}
    </WhiteBoard>
  );
};

/** Falling sprites (banknotes, coins, icons) with depth: far ones small, slow and blurred. */
export const Rain: React.FC<{ t: number; at: number; until: number; src: string; n?: number; size?: number; seed?: string }> = ({ t, at, until, src: s, n = 26, size = 260, seed = "rain" }) => {
  if (t < at || t > until + 1.5) return null;
  const fade = interpolate(t, [until, until + 0.4], [1, 0], cl);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: fade }}>
      {Array.from({ length: n }, (_, i) => {
        const r = (k: string) => random(`${seed}-${i}-${k}`);
        const depth = 0.35 + r("z") * 0.9; // 0.35 far … 1.25 near
        const t0 = at + r("d") * 0.9, life = t - t0;
        if (life < 0) return null;
        const y = -size + life * (900 + 900 * depth) + r("y") * -400;
        const x = r("x") * W + Math.sin(life * (1.5 + r("w") * 2) + r("p") * 6) * 60;
        const rot = r("r") * 360 + life * (r("s") - 0.5) * 400;
        return <Img key={i} src={src(s)} style={{ position: "absolute", left: x - size / 2, top: y, width: size * depth, transform: `rotate(${rot}deg) rotateX(${Math.sin(life * 3 + i) * 60}deg)`,
          filter: `blur(${Math.abs(depth - 0.8) * 8}px)`, opacity: 0.95 }} />;
      })}
    </AbsoluteFill>
  );
};

/** A counter that runs to `to` between at and at+d (numbers like "29 Juta", "71%"). */
export const countTo = (t: number, at: number, to: number, d = 0.8, decimals = 0) => {
  const v = interpolate(t, [at, at + d], [0, to], { ...cl, easing: easeOut });
  return v.toFixed(decimals);
};
