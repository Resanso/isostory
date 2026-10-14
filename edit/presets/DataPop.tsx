// Reference implementation (written on the sample clip; word indices like at(17) and all copy are that clip's, rewrite them per edit): "datapop" style preset (style-2 reference) on the sample clip.
// No running captions: only keywords and numbers as kinetic type, focus pulls, PiP shrink, white boards.
import React, { useEffect, useState } from "react";
import { AbsoluteFill, Series, staticFile, useCurrentFrame, interpolate, spring, delayRender, continueRender, Easing, Img, random } from "remotion";
import { Video, Audio } from "@remotion/media";
import "@fontsource/inter/600.css";
import "@fontsource/inter/800.css";
import "@fontsource/inter/900.css";
import data from "./data.json";
import { words, FPS } from "./plan";

const W = 1080, H = 1920;
const YEL = "#F7E600", MAG = "#D6177A", GREEN = "#39FF7A";
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const at = (i: number) => words[i].start;
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const p01 = (t: number, a: number, d = 0.35) => interpolate(t, [a, a + d], [0, 1], { ...cl, easing: ease });

type Mode = "full" | "pip" | "board";
const SEC: { from: number; to: number; mode: Mode; k: string }[] = [
  { from: 0, to: at(8), mode: "full", k: "hook" },
  { from: at(8), to: at(17), mode: "full", k: "stack" },
  { from: at(17), to: at(21), mode: "full", k: "flip" },
  { from: at(21), to: at(25), mode: "pip", k: "icons" },
  { from: at(25), to: at(35), mode: "board", k: "logo" },
  { from: at(35), to: at(53), mode: "full", k: "weekly" },
  { from: at(53), to: at(64), mode: "board", k: "chart" },
  { from: at(64), to: at(81), mode: "pip", k: "steps" },
  { from: at(81), to: at(93), mode: "full", k: "doang" },
  { from: at(93), to: 999, mode: "full", k: "cta" },
];
export const dataPopDuration = data.durationInFrames;

const useFonts = () => {
  const [h] = useState(() => delayRender("fonts"));
  const [ok, setOk] = useState(false);
  useEffect(() => { Promise.all(["600 40px Inter", "800 40px Inter", "900 40px Inter"].map((f) => document.fonts.load(f))).then(() => { setOk(true); continueRender(h); }); }, [h]);
  return ok;
};

const Footage: React.FC = () => (
  <Series>
    {data.segs.map((s, k) => (
      <Series.Sequence key={k} durationInFrames={s.toF - s.fromF} premountFor={FPS}>
        <Video src={staticFile("proxy.mp4")} trimBefore={s.fromF} muted objectFit="cover" />
      </Series.Sequence>
    ))}
  </Series>
);

// ---------- kinetic type pieces
const Typewriter: React.FC<{ t: number; t0: number; text: string; style?: React.CSSProperties }> = ({ t, t0, text, style }) => {
  const n = Math.floor(interpolate(t, [t0, t0 + text.length * 0.045], [0, text.length], cl));
  return <div style={{ font: "800 34px Inter", letterSpacing: 4, color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,.5)", ...style }}>{text.slice(0, n)}<span style={{ opacity: 0.35 }}>{text.slice(n)}</span></div>;
};
const BigPop: React.FC<{ t: number; t0: number; children: React.ReactNode; color?: string; size?: number; glow?: boolean; style?: React.CSSProperties }> = ({ t, t0, children, color = YEL, size = 150, glow = true, style }) => {
  const p = p01(t, t0, 0.45);
  return (
    <div style={{ font: `900 ${size}px Inter`, letterSpacing: -size * 0.04, color, opacity: p, filter: `blur(${(1 - p) * 14}px)`, transform: `scale(${1.25 - 0.25 * p})`,
      textShadow: glow ? `0 0 40px ${color}88, 0 4px 20px rgba(0,0,0,.4)` : undefined, lineHeight: 1, ...style }}>{children}</div>
  );
};
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&@$";
const Scramble: React.FC<{ t: number; t0: number; text: string }> = ({ t, t0, text }) => {
  const f = Math.round((t - t0) * FPS);
  return <>{[...text].map((ch, k) => f < k * 2 ? <span key={k} style={{ opacity: 0 }}>{ch}</span> : <span key={k}>{f < k * 2 + 6 && ch !== " " ? GLYPHS[Math.floor(random(`${k}-${f}`) * GLYPHS.length)] : ch}</span>)}</>;
};
const Bar: React.FC<{ t: number; t0: number; color?: string; children: React.ReactNode }> = ({ t, t0, color = MAG, children }) => {
  const p = p01(t, t0, 0.25);
  return (
    <span style={{ position: "relative", display: "inline-block", padding: "0 12px" }}>
      <span style={{ position: "absolute", inset: "8% 0 4% 0", background: color, transform: `scaleX(${p})`, transformOrigin: "left" }} />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};
// floating word stack, each word at its own depth (style 2 "bukan / cuma / soal / ukurannya")
const Stack: React.FC<{ t: number; items: { i: number; x: number; y: number; size: number; bar?: boolean }[] }> = ({ t, items }) => (
  <>
    {items.map(({ i, x, y, size, bar }, k) => {
      const p = p01(t, at(i) - 0.04, 0.3);
      const txt = words[i].text.replace(/[.,?!]+$/, "").toLowerCase();
      return (
        <div key={k} style={{ position: "absolute", left: x, top: y, font: `800 ${size}px Inter`, letterSpacing: -size * 0.03, color: bar ? "#fff" : "rgba(255,255,255,.82)",
          opacity: p, filter: `blur(${(1 - p) * 10 + (bar ? 0 : 0.6)}px)`, transform: `translateY(${(1 - p) * 30}px)`, textShadow: "0 4px 24px rgba(0,0,0,.35)" }}>
          {bar ? <Bar t={t} t0={at(i) + 0.15}>{txt}</Bar> : txt}
        </div>
      );
    })}
  </>
);
const count = (t: number, a: number, d: number, from: number, to: number) => from + (to - from) * interpolate(t, [a, a + d], [0, 1], { ...cl, easing: Easing.out(Easing.cubic) });

// ---------- footage layouts
const focus = (t: number, t0: number) => interpolate(t, [t0 - 0.05, t0, t0 + 0.45], [0, 18, 0], cl); // blur at a reveal, then sharpen
const pipP = (t: number, s: { from: number }) => p01(t, s.from, 0.45);

const Board: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: "#fff" }}>
    <AbsoluteFill style={{ backgroundImage: "linear-gradient(#0000000d 1px, transparent 1px), linear-gradient(90deg, #0000000d 1px, transparent 1px)", backgroundSize: "54px 54px" }} />
    {children}
    <AbsoluteFill style={{ background: "radial-gradient(85% 65% at 50% 50%, transparent 65%, rgba(0,0,0,.28) 100%)", pointerEvents: "none" }} />
  </AbsoluteFill>
);

const NeonIcon: React.FC<{ t: number; t0: number; icon: string; label: string; color?: string; dim?: boolean; x: number; y: number }> = ({ t, t0, icon, label, color = GREEN, dim, x, y }) => {
  const s = spring({ frame: Math.round((t - t0) * FPS), fps: FPS, config: { damping: 12 } });
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 360, textAlign: "center", opacity: t < t0 ? 0 : dim ? 0.35 : 1, transform: `scale(${0.6 + 0.4 * s})` }}>
      <div style={{ fontSize: 120, filter: dim ? "grayscale(1)" : `drop-shadow(0 0 22px ${color})` }}>{icon}</div>
      <div style={{ font: "800 30px Inter", color: dim ? "#999" : color, letterSpacing: 2, marginTop: 8, textShadow: dim ? undefined : `0 0 16px ${color}88` }}>{label}</div>
    </div>
  );
};

export const DataPopDemo: React.FC = () => {
  const ready = useFonts();
  const t = useCurrentFrame() / FPS;
  const s = SEC.find((x) => t >= x.from && t < x.to) ?? SEC[SEC.length - 1];
  // footage transform: full frame, or shrunk to a rounded PiP card at the bottom
  const pp = s.mode === "pip" ? pipP(t, s) : 0;
  const pipScale = 1 - 0.42 * pp, pipY = -90 * pp;
  const blurNow = s.k === "flip" ? focus(t, at(19)) : s.k === "hook" ? focus(t, at(6)) * 0.6 : s.k === "doang" ? focus(t, at(87)) * 0.8 : 0;
  const moveBlur = s.mode === "pip" ? interpolate(t, [s.from, s.from + 0.2, s.from + 0.45], [0, 10, 0], cl) : 0;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {s.mode !== "board" && (
        <AbsoluteFill style={{ transform: `translateY(${pipY}px) scale(${pipScale})`, transformOrigin: "50% 100%", borderRadius: 48 * pp, overflow: "hidden", filter: `blur(${blurNow + moveBlur}px)` }}>
          <Footage />
          <AbsoluteFill style={{ background: "linear-gradient(rgba(0,0,0,.45), transparent 35%)" }} />
        </AbsoluteFill>
      )}
      {ready && (
        <>
          {s.k === "hook" && (
            <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center" }}>
              <Typewriter t={t} t0={0.05} text="NYARI KERJA" />
              <BigPop t={t} t0={at(6) - 0.05} style={{ marginTop: 14 }}>JOB PORTAL</BigPop>
            </div>
          )}
          {s.k === "stack" && (
            <Stack t={t} items={[{ i: 8, x: 120, y: 330, size: 110 }, { i: 9, x: 330, y: 450, size: 120 }, { i: 10, x: 160, y: 590, size: 96 }, { i: 15, x: 230, y: 700, size: 150, bar: true }]} />
          )}
          {s.k === "flip" && (
            <div style={{ position: "absolute", top: 380, left: 0, right: 0, textAlign: "center" }}>
              <Typewriter t={t} t0={at(17)} text="GIMANA KALAU" />
              <div style={{ font: "900 118px Inter", letterSpacing: -4, color: "#fff", marginTop: 10, textShadow: "0 4px 30px rgba(0,0,0,.5)" }}><Scramble t={t} t0={at(19) - 0.05} text="KEBALIKANNYA?" /></div>
            </div>
          )}
          {s.k === "icons" && (
            <>
              <NeonIcon t={t} t0={s.from + 0.2} icon="🔍" label="KAMU NYARI" dim={t > at(23)} x={90} y={300} />
              <NeonIcon t={t} t0={at(23)} icon="📲" label="LOWONGAN NYAMPERIN" x={630} y={300} />
              <div style={{ position: "absolute", left: 470, top: 380, font: "900 80px Inter", color: "#fff", opacity: p01(t, at(23) - 0.2) }}>→</div>
            </>
          )}
          {s.k === "logo" && (
            <Board>
              <div style={{ position: "absolute", top: 560, left: 0, right: 0, textAlign: "center" }}>
                <div style={{ display: "inline-block", transform: `scale(${spring({ frame: Math.round((t - at(27)) * FPS), fps: FPS, config: { damping: 10 } })})` }}>
                  <Img src={staticFile("ada-logo.png")} style={{ width: 220, height: 220, borderRadius: 50, boxShadow: "0 20px 50px rgba(0,0,0,.2)" }} />
                </div>
                <Typewriter t={t} t0={at(30)} text="FITUR BARU" style={{ color: "#111", textShadow: "none", marginTop: 50 }} />
                <BigPop t={t} t0={at(33) - 0.05} color="#111" glow={false} size={140} style={{ marginTop: 10 }}><Bar t={t} t0={at(33) + 0.3} color={YEL}>ADA NOTIF</Bar></BigPop>
              </div>
            </Board>
          )}
          {s.k === "weekly" && (
            <div style={{ position: "absolute", top: 290, left: 0, right: 0, textAlign: "center" }}>
              <Typewriter t={t} t0={at(36)} text="TIAP MINGGU" />
              <BigPop t={t} t0={at(39)} size={170}>{Math.round(count(t, at(39), 0.6, 0, 1))}x</BigPop>
              <div style={{ marginTop: 26, display: "inline-flex", gap: 14, alignItems: "center", opacity: p01(t, at(46) - 0.1), transform: `scale(${0.8 + 0.2 * p01(t, at(46) - 0.1)})`,
                border: `4px solid ${GREEN}`, borderRadius: 18, padding: "10px 26px", font: "900 58px Inter", color: GREEN, textShadow: `0 0 18px ${GREEN}`, boxShadow: `0 0 24px ${GREEN}66` }}>WhatsApp</div>
              {t > at(49) && (
                <div style={{ marginTop: 30, font: "900 92px Inter", color: "#fff", opacity: p01(t, at(49)) }}>
                  bukan <span style={{ position: "relative" }}>asal<span style={{ position: "absolute", left: -6, right: -6, top: "52%", height: 10, background: "#FF3B3B", transform: `scaleX(${p01(t, at(52), 0.2)})`, transformOrigin: "left" }} /></span>
                </div>
              )}
            </div>
          )}
          {s.k === "chart" && (
            <Board>
              <div style={{ position: "absolute", top: 380, left: 0, right: 0, textAlign: "center", font: "800 54px Inter", color: "#111" }}>Kecocokan sama CV kamu</div>
              {[{ label: "lowongan asal", v: 35, x: 260, c: "#B9C2BC", t0: at(55) }, { label: "Ada Notif", v: 92, x: 600, c: "#18A84B", t0: at(60) - 0.1 }].map((b, k) => {
                const v = count(t, b.t0, 0.9, 0, b.v);
                return (
                  <div key={k} style={{ position: "absolute", left: b.x, bottom: 640, width: 220, textAlign: "center" }}>
                    <div style={{ font: "900 56px Inter", color: b.c, opacity: p01(t, b.t0) }}>{Math.round(v)}%</div>
                    <div style={{ height: v * 6.5, background: b.c, borderRadius: "14px 14px 0 0", marginTop: 10 }} />
                    <div style={{ font: "800 30px Inter", color: "#111", marginTop: 16 }}>{b.label}</div>
                  </div>
                );
              })}
              <div style={{ position: "absolute", left: 180, right: 180, bottom: 625, height: 6, background: "#111" }} />
              <div style={{ position: "absolute", bottom: 470, left: 0, right: 0, textAlign: "center", font: "italic 600 24px Inter", color: "#555" }}>*angka ilustrasi</div>
            </Board>
          )}
          {s.k === "steps" && (
            <>
              <div style={{ position: "absolute", top: 270, left: 0, right: 0, textAlign: "center" }}>
                <Typewriter t={t} t0={s.from + 0.1} text="CARANYA" />
                <BigPop t={t} t0={at(65)} size={120}><Scramble t={t} t0={at(65)} text="GAMPANG" /></BigPop>
              </div>
              <NeonIcon t={t} t0={at(68)} icon="🖥️" label="1 · MASUK" x={0} y={560} />
              <NeonIcon t={t} t0={at(75)} icon="🪟" label="2 · POP-UP" x={360} y={560} />
              <NeonIcon t={t} t0={at(78)} icon="📱" label="3 · NOMOR WA" x={720} y={560} />
            </>
          )}
          {s.k === "doang" && (
            <>
              <Stack t={t} items={[{ i: 81, x: 160, y: 330, size: 110 }, { i: 82, x: 420, y: 440, size: 110 }, { i: 83, x: 230, y: 560, size: 140, bar: true }]} />
              {t > at(87) && <div style={{ position: "absolute", top: 760, left: 0, right: 0, textAlign: "center" }}><BigPop t={t} t0={at(87)} size={120}>MASUK SENDIRI</BigPop></div>}
            </>
          )}
          {s.k === "cta" && (
            <div style={{ position: "absolute", top: 330, left: 0, right: 0, textAlign: "center" }}>
              <Typewriter t={t} t0={s.from} text="AKTIFIN SEKARANG" />
              <div style={{ display: "inline-block", marginTop: 26, border: `6px solid ${GREEN}`, borderRadius: 26, padding: "8px 40px", font: "900 120px Inter", letterSpacing: -3, color: GREEN,
                textShadow: `0 0 26px ${GREEN}`, boxShadow: `0 0 40px ${GREEN}55, inset 0 0 30px ${GREEN}33`, opacity: p01(t, at(94) - 0.05), transform: `scale(${0.85 + 0.15 * p01(t, at(94) - 0.05)})` }}>ADA NOTIF</div>
              <div style={{ marginTop: 34, font: "800 46px Inter", color: "#fff", textShadow: "0 3px 16px rgba(0,0,0,.6)", opacity: p01(t, at(97)) }}>lowongan cocok, langsung ke WA</div>
            </div>
          )}
        </>
      )}
      <Audio src={staticFile("datapop-mix.wav")} />
    </AbsoluteFill>
  );
};
