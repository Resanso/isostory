// Kinetic type for the editorial look: a caption is a STACK of 2–5 short lines in mixed type that
// builds up as the words are said, then leaves together.
//   lead  small bold sans, white          ("akhirnya", "tapi gajinya")
//   key   huge black-weight sans, yellow or white, tight tracking ("BERHASIL", "8 JUTA")
//   tail  serif italic, smaller, offset    ("di sekolah", "ke Upwork")
//   num   like key, green or yellow, for money and counts
// Each line lands on the word that says it (`at`). Lines can also reveal word by word (`ats`).
import React from "react";
import { interpolate } from "remotion";
import { FONT, INK, TEXT_SHADOW, cl, easeOut, p01 } from "./fx";
import { Mark, MarkKind } from "./marks";

export type Role = "lead" | "key" | "tail" | "num";
export type Enter = "rise" | "pop" | "slide" | "type" | "focus";
export type Line = {
  at: number; // edit seconds: when the line lands (the word's start)
  text: string;
  role?: Role;
  color?: string;
  dx?: number; // px nudge from the stack's alignment (lead left, tail right)
  ats?: number[]; // optional per-word times: reveal word by word
  enter?: Enter;
  mark?: { kind: MarkKind; at: number; words?: [number, number] }; // mark the whole line or words[a..b)
  size?: number; // override px
};

const ROLE: Record<Role, (dark: boolean) => React.CSSProperties> = {
  lead: (dark) => ({ font: `700 56px ${FONT.sans}`, letterSpacing: "-0.01em", color: dark ? "#111" : INK.white }),
  key: (dark) => ({ font: `900 152px ${FONT.sans}`, letterSpacing: "-0.045em", lineHeight: 0.86, color: dark ? "#111" : INK.yellow }),
  tail: (dark) => ({ font: `italic 400 76px ${FONT.serif}`, letterSpacing: "-0.01em", color: dark ? "#111" : INK.white }),
  num: () => ({ font: `900 176px ${FONT.sans}`, letterSpacing: "-0.04em", lineHeight: 0.86, color: INK.yellow }),
};

const enterStyle = (k: number, kind: Enter): React.CSSProperties => {
  const blur = (1 - k) * 10;
  switch (kind) {
    case "pop": return { opacity: k, transform: `scale(${1.28 - 0.28 * k})`, filter: `blur(${(1 - k) * 16}px)` };
    case "slide": return { opacity: k, transform: `translateX(${(1 - k) * -44}px)`, filter: `blur(${blur}px)` };
    case "focus": return { opacity: interpolate(k, [0, 0.4], [0, 1], cl), filter: `blur(${(1 - k) * 22}px)`, transform: `scale(${1.06 - 0.06 * k})` };
    case "type": return {};
    default: return { opacity: k, transform: `translateY(${(1 - k) * 26}px)`, filter: `blur(${blur}px)` };
  }
};

const LineView: React.FC<{ t: number; l: Line; dark: boolean; enter: Enter }> = ({ t, l, dark, enter }) => {
  const role = l.role ?? "lead";
  const base: React.CSSProperties = { ...ROLE[role](dark), ...(l.size ? { fontSize: l.size } : {}), ...(l.color ? { color: l.color } : {}),
    textShadow: dark ? "none" : TEXT_SHADOW, whiteSpace: "nowrap", display: "inline-block" };
  const kind = l.enter ?? enter;
  const words = l.text.split(" ");
  const markWrap = (node: React.ReactNode, i0: number, i1: number) => {
    if (!l.mark) return node;
    const [a, b] = l.mark.words ?? [0, words.length];
    if (i0 !== a || i1 !== b) return node;
    return <Mark t={t} at={l.mark.at} kind={l.mark.kind}>{node}</Mark>;
  };
  if (kind === "type") {
    const n = Math.floor(interpolate(t, [l.at, l.at + l.text.length * 0.04], [0, l.text.length], cl));
    if (n <= 0) return null;
    return <div style={{ transform: `translateX(${l.dx ?? 0}px)` }}><span style={base}>{l.text.slice(0, n)}</span></div>;
  }
  if (l.ats) {
    // word by word: each word enters on its own time; unspoken words are not laid out yet,
    // so the line grows like speech (the reference does this on long lines)
    const shown = words.filter((_, i) => t >= (l.ats![i] ?? l.at) - 0.02);
    if (!shown.length) return null;
    return (
      <div style={{ transform: `translateX(${l.dx ?? 0}px)` }}>
        <span style={base}>
          {shown.map((w, i) => {
            const k = p01(t, l.ats![i] ?? l.at, 0.22);
            return <span key={i} style={{ display: "inline-block", marginRight: "0.22em", ...enterStyle(k, kind) }}>{w}</span>;
          })}
        </span>
      </div>
    );
  }
  if (t < l.at - 0.02) return null;
  const k = p01(t, l.at, kind === "pop" ? 0.3 : 0.24);
  const [ma, mb] = l.mark?.words ?? [0, words.length];
  const body = l.mark ? <>{[words.slice(0, ma).join(" "), markWrap(words.slice(ma, mb).join(" "), ma, mb), words.slice(mb).join(" ")].filter(Boolean).reduce<React.ReactNode[]>((acc, x, i) => (i ? [...acc, " ", x] : [x]), [])}</> : l.text;
  return <div style={{ transform: `translateX(${l.dx ?? 0}px)` }}><span style={{ ...base, ...enterStyle(k, kind) }}>{body}</span></div>;
};

/**
 * A stack of lines anchored at `y` (top of the stack, stage px). `until` = when the stack leaves (usually the
 * next stack's first `at`); it blur-fades out in 0.14 s, or cuts if exit="cut".
 * dark = black ink for white boards (no shadow).
 */
export const KineticStack: React.FC<{
  t: number; lines: Line[]; until: number; y: number; x?: number; align?: "center" | "left" | "right";
  dark?: boolean; enter?: Enter; exit?: "fade" | "cut"; gap?: number; width?: number;
}> = ({ t, lines, until, y, x, align = "center", dark = false, enter = "rise", exit = "fade", gap = 0, width = 1000 }) => {
  if (!lines.length || t < lines[0].at - 0.05 || t > until + 0.16) return null;
  const out = exit === "cut" ? (t >= until ? 0 : 1) : interpolate(t, [until, until + 0.14], [1, 0], { ...cl, easing: easeOut });
  if (out <= 0) return null;
  const left = x ?? (align === "center" ? (1080 - width) / 2 : align === "left" ? 80 : 1080 - 80 - width);
  return (
    <div style={{ position: "absolute", top: y, left, width, textAlign: align, display: "flex", flexDirection: "column", gap,
      alignItems: align === "center" ? "center" : align === "left" ? "flex-start" : "flex-end", opacity: out, filter: out < 1 ? `blur(${(1 - out) * 8}px)` : undefined }}>
      {lines.map((l, i) => <LineView key={i} t={t} l={l} dark={dark} enter={enter} />)}
    </div>
  );
};

/** A single big word that lands on its own (BUKAN, INTINYA, BUKTINYA). */
export const Punch: React.FC<{ t: number; at: number; until: number; text: string; y?: number; color?: string; dark?: boolean; size?: number }> = ({
  t, at, until, text, y = 1150, color, dark, size = 132,
}) => <KineticStack t={t} until={until} y={y} dark={dark} enter="pop" lines={[{ at, text, role: "key", color: color ?? (dark ? "#111" : INK.white), size }]} />;

/** Name strip for the first time the speaker appears ("Edward Anthony / Programmer" look): white bar text + yellow sub-bar. */
export const NameStrip: React.FC<{ t: number; at: number; until: number; name: string; role: string; x?: number; y?: number }> = ({ t, at, until, name, role, x = 90, y = 1060 }) => {
  const k = p01(t, at, 0.35), o = interpolate(t, [until - 0.2, until], [1, 0], cl);
  if (t < at || t > until) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: o }}>
      <div style={{ clipPath: `inset(0 ${(1 - k) * 100}% 0 0)`, background: "rgba(0,0,0,.55)", border: `3px solid ${INK.yellow}`, padding: "8px 22px", font: `800 64px ${FONT.sans}`, color: "#fff" }}>{name}</div>
      <div style={{ clipPath: `inset(0 ${(1 - p01(t, at + 0.15, 0.3)) * 100}% 0 0)`, display: "inline-block", background: INK.yellow, padding: "4px 16px", font: `800 36px ${FONT.sans}`, color: "#111", marginTop: 6 }}>{role}</div>
    </div>
  );
};
