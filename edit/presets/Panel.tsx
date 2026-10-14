// Reference implementation (written on the sample clip; word indices like at(17) and all copy are that clip's, rewrite them per edit): "panel" style preset (style-1 reference) on the sample clip.
import React, { useEffect, useState } from "react";
import { AbsoluteFill, Series, staticFile, useCurrentFrame, interpolate, spring, delayRender, continueRender, Easing } from "remotion";
import { Video, Audio } from "@remotion/media";
import "@fontsource/plus-jakarta-sans/400-italic.css";
import "@fontsource/plus-jakarta-sans/300-italic.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import data from "./data.json";
import face from "./face.json";
import { words, FPS } from "./plan";

const W = 1080, H = 1920;
const FONT = "'Plus Jakarta Sans'";
const GOLD = "#E8B931", YEL = "#F5C518", RED = "#E5484D", BG = "#0B0B0B", CREAM = "#EFEBE3";
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const at = (i: number) => words[i].start;

type Mode = "panel" | "full" | "cta";
const SECTIONS: { from: number; to: number; mode: Mode; key: string }[] = [
  { from: 0, to: at(17), mode: "panel", key: "A" },
  { from: at(17), to: at(25), mode: "full", key: "B" },
  { from: at(25), to: at(53), mode: "panel", key: "C" },
  { from: at(53), to: at(64), mode: "panel", key: "D" },
  { from: at(64), to: at(81), mode: "panel", key: "E" },
  { from: at(81), to: at(93), mode: "full", key: "F" },
  { from: at(93), to: 999, mode: "cta", key: "G" },
];
export const panelDuration = data.durationInFrames;

const useFonts = () => {
  const [h] = useState(() => delayRender("fonts"));
  const [ok, setOk] = useState(false);
  useEffect(() => {
    Promise.all(["600 40px 'Plus Jakarta Sans'", "700 40px 'Plus Jakarta Sans'", "800 40px 'Plus Jakarta Sans'", "italic 300 40px 'Plus Jakarta Sans'", "italic 400 40px 'Plus Jakarta Sans'"].map((f) => document.fonts.load(f))).then(() => { setOk(true); continueRender(h); });
  }, [h]);
  return ok;
};

// ---------- footage
const Footage: React.FC = () => (
  <Series>
    {data.segs.map((s, k) => (
      <Series.Sequence key={k} durationInFrames={s.toF - s.fromF} premountFor={FPS}>
        <Video src={staticFile("proxy.mp4")} trimBefore={s.fromF} muted objectFit="cover" />
      </Series.Sequence>
    ))}
  </Series>
);
const segAt = (f: number) => data.segs.find((g) => f >= g.outF && f < g.outF + (g.toF - g.fromF)) ?? data.segs[data.segs.length - 1];
const faceAt = (f: number) => {
  const g = segAt(f);
  const [x, y] = (face as number[][])[Math.min(face.length - 1, g.fromF + (f - g.outF))];
  return { cx: x * W, cy: y * H };
};

// rounded speaker inset (style 1: ~87 % wide, 55–83 % of the height)
const INSET = { x: 70, y: 1040, w: 940, h: 560, r: 30 };
const Inset: React.FC<{ light?: boolean }> = ({ light }) => {
  const f = useCurrentFrame();
  const k = 0.9, { cx, cy } = faceAt(f);
  const left = Math.min(0, Math.max(INSET.w - W * k, INSET.w / 2 - cx * k));
  const top = Math.min(0, Math.max(INSET.h - H * k, INSET.h * 0.46 - cy * k));
  return (
    <div style={{ position: "absolute", left: INSET.x, top: INSET.y, width: INSET.w, height: INSET.h, borderRadius: INSET.r, overflow: "hidden",
      boxShadow: light ? "0 18px 50px rgba(0,0,0,.18)" : "0 0 0 1px rgba(255,255,255,.08), 0 20px 60px rgba(0,0,0,.6)" }}>
      <div style={{ position: "absolute", left, top, width: W * k, height: H * k }}><Footage /></div>
    </div>
  );
};

// ---------- small motion helpers
const appear = (t: number, t0: number, d = 0.35) => interpolate(t, [t0, t0 + d], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
const In: React.FC<{ t: number; t0: number; dy?: number; blur?: boolean; style?: React.CSSProperties; children: React.ReactNode }> = ({ t, t0, dy = 18, blur = true, style, children }) => {
  const p = appear(t, t0);
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * dy}px)`, filter: blur ? `blur(${(1 - p) * 8}px)` : undefined, ...style }}>{children}</div>;
};
// yellow box wiping in behind a word
const Hi: React.FC<{ t: number; t0: number; children: React.ReactNode; dark?: boolean }> = ({ t, t0, children, dark }) => {
  const p = appear(t, t0, 0.28);
  return (
    <span style={{ position: "relative", display: "inline-block", padding: "0 10px", color: p > 0.5 ? "#111" : dark ? "#111" : "#fff" }}>
      <span style={{ position: "absolute", inset: "6px 0 2px 0", background: YEL, transformOrigin: "left", transform: `scaleX(${p})`, borderRadius: 4 }} />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};
const count = (t: number, t0: number, d: number, a: number, b: number) => a + (b - a) * interpolate(t, [t0, t0 + d], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
const rp = (n: number) => Math.round(n).toLocaleString("id-ID");

// ---------- panel header: eyebrow + two-line title (bold / light italic)
const Header: React.FC<{ t: number; t0: number; eyebrow: string; a: React.ReactNode; b: React.ReactNode; dark?: boolean }> = ({ t, t0, eyebrow, a, b, dark }) => (
  <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center", fontFamily: FONT, color: dark ? "#111" : "#fff" }}>
    <In t={t} t0={t0} dy={8}><div style={{ fontWeight: 700, fontSize: 24, letterSpacing: 7, color: dark ? "#9A7414" : GOLD, marginBottom: 18 }}>{eyebrow}</div></In>
    <In t={t} t0={t0 + 0.12}><div style={{ fontWeight: 800, fontSize: 76, lineHeight: 1.08, letterSpacing: -1.5 }}>{a}</div></In>
    <In t={t} t0={t0 + 0.3}><div style={{ fontWeight: 800, fontSize: 76, lineHeight: 1.12, letterSpacing: -1.5 }}>{b}</div></In>
  </div>
);
const It: React.FC<{ children: React.ReactNode }> = ({ children }) => <span style={{ fontStyle: "italic", fontWeight: 300 }}>{children}</span>;

const Card: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => (
  <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,.09)", borderRadius: 18, padding: "22px 26px", fontFamily: FONT, color: "#fff", ...style }}>{children}</div>
);
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => <div style={{ fontSize: 20, color: "rgba(255,255,255,.45)", fontWeight: 600 }}>{children}</div>;

// ---------- sections
const A: React.FC<{ t: number }> = ({ t }) => {
  const checked = count(t, 0, at(16), 3, 48);
  const stamp = spring({ frame: Math.round((t - at(15)) * FPS), fps: FPS, config: { damping: 11, stiffness: 180 } });
  const rows = ["UI Designer · Jakarta", "Admin Gudang · Bekasi", "Staff Marketing · Bandung", "Data Entry · Remote", "Kasir · Tangerang", "Barista · Depok", "Customer Service · Bogor", "Copywriter · Remote"];
  const scroll = (t * 70) % (rows.length * 64);
  return (
    <>
      <Header t={t} t0={-1} eyebrow="NYARI KERJA" a={<>Scroll Satu-Satu</>} b={<><It>Itu </It><Hi t={t} t0={at(15) + 0.15}>Capek</Hi></>} />
      <Card style={{ position: "absolute", left: 120, right: 120, top: 560, height: 330, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Label>lowongan dicek</Label>
          <div style={{ fontWeight: 800, fontSize: 34 }}>{Math.round(checked)}</div>
        </div>
        <div style={{ position: "relative", height: 230, overflow: "hidden", marginTop: 14, maskImage: "linear-gradient(transparent, #000 20%, #000 80%, transparent)" }}>
          <div style={{ transform: `translateY(${-scroll}px)` }}>
            {[...rows, ...rows, ...rows].map((r, k) => (
              <div key={k} style={{ height: 52, marginBottom: 12, borderRadius: 10, background: "#202020", display: "flex", alignItems: "center", padding: "0 18px", fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,.8)" }}>{r}</div>
            ))}
          </div>
        </div>
      </Card>
      {t >= at(15) && (
        <div style={{ position: "absolute", left: 590, top: 690, transform: `rotate(-11deg) scale(${2.2 - 1.2 * stamp})`, opacity: Math.min(1, stamp * 1.4),
          border: `6px solid ${RED}`, color: RED, fontFamily: FONT, fontWeight: 800, fontSize: 64, letterSpacing: 6, padding: "4px 22px", borderRadius: 10, background: "rgba(11,11,11,.55)" }}>CAPEK</div>
      )}
    </>
  );
};

const NotifCard: React.FC<{ t: number; t0: number; title: string; body: string; green?: boolean }> = ({ t, t0, title, body, green }) => {
  const p = appear(t, t0, 0.4);
  return (
    <div style={{ position: "absolute", left: 90, right: 90, top: 270, opacity: p, transform: `translateY(${(1 - p) * -40}px) scale(${0.96 + 0.04 * p})`,
      background: "rgba(20,20,20,.92)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 26, padding: "24px 28px", display: "flex", gap: 22, alignItems: "center", fontFamily: FONT, boxShadow: "0 20px 50px rgba(0,0,0,.45)" }}>
      <div style={{ width: 74, height: 74, borderRadius: 18, background: green ? "#25D366" : YEL, display: "grid", placeItems: "center", fontSize: 40, flex: "none" }}>{green ? "💬" : "📄"}</div>
      <div>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 30 }}>{title}</div>
        <div style={{ color: "rgba(255,255,255,.65)", fontWeight: 600, fontSize: 24, marginTop: 4 }}>{body}</div>
      </div>
    </div>
  );
};

const C: React.FC<{ t: number; t0: number }> = ({ t, t0 }) => {
  const jobs = [["Junior UI Designer", "92% cocok"], ["Product Designer", "88% cocok"], ["Visual Designer", "85% cocok"]];
  return (
    <>
      <Header t={t} t0={t0} eyebrow="FITUR BARU ADA4CAREER" a={<><It>Namanya </It></>} b={<Hi t={t} t0={at(34)}>Ada Notif</Hi>} />
      <In t={t} t0={at(36)} style={{ position: "absolute", left: 120, top: 590 }}>
        <div style={{ display: "inline-flex", gap: 12, alignItems: "center", background: "#1d1d1d", border: "1px solid rgba(255,255,255,.12)", borderRadius: 999, padding: "12px 24px", color: "#fff", fontFamily: FONT, fontWeight: 700, fontSize: 26 }}>📅 tiap minggu</div>
      </In>
      <In t={t} t0={at(46) - 0.1} style={{ position: "absolute", left: 120, right: 120, top: 680 }}>
        <Card style={{ padding: "18px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 99, background: "#25D366" }} />
            <div style={{ fontWeight: 800, fontSize: 24 }}>WhatsApp · Ada Notif</div>
          </div>
          {jobs.map(([a, b], k) => (
            <In key={k} t={t} t0={at(46) + 0.15 + k * 0.18} dy={10} blur={false}>
              <div style={{ display: "flex", justifyContent: "space-between", background: "#202020", borderRadius: 10, padding: "10px 16px", marginTop: 8, fontSize: 22, fontWeight: 600 }}>
                <span>{a}</span><span style={{ color: YEL }}>{b}</span>
              </div>
            </In>
          ))}
        </Card>
      </In>
    </>
  );
};

const D: React.FC<{ t: number; t0: number }> = ({ t, t0 }) => {
  const pct = count(t, at(60), 0.9, 0, 92);
  const glow = appear(t, at(60), 0.5);
  return (
    <>
      <Header t={t} t0={t0} eyebrow="YANG DIKIRIM ITU" a={<>Lowongan yang</>} b={<><It>cocok sama </It><Hi t={t} t0={at(62)}>CV kamu</Hi></>} />
      <div style={{ position: "absolute", left: 120, right: 120, top: 610, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <In t={t} t0={at(55)}><Card style={{ width: 300, height: 220 }}><Label>CV kamu</Label>{[0.9, 0.7, 0.8, 0.5].map((w, k) => <div key={k} style={{ height: 14, width: `${w * 100}%`, background: "#2a2a2a", borderRadius: 7, marginTop: 20 }} />)}</Card></In>
        <div style={{ textAlign: "center", fontFamily: FONT, color: YEL, fontWeight: 800, fontSize: 64, textShadow: `0 0 ${30 * glow}px rgba(245,197,24,.55)`, opacity: appear(t, at(60) - 0.1) }}>{Math.round(pct)}%</div>
        <In t={t} t0={at(58)}><Card style={{ width: 300, height: 220 }}><Label>Lowongan</Label>{[0.6, 0.85, 0.7, 0.4].map((w, k) => <div key={k} style={{ height: 14, width: `${w * 100}%`, background: "#2a2a2a", borderRadius: 7, marginTop: 20 }} />)}</Card></In>
      </div>
    </>
  );
};

const E: React.FC<{ t: number; t0: number }> = ({ t, t0 }) => {
  const steps: [string, number][] = [["Masuk ke Ada4career", at(68)], ["Muncul pop-up", at(75)], ["Masukin nomor WA", at(78)]];
  return (
    <>
      <Header t={t} t0={t0} eyebrow="CARANYA" a={<Hi t={t} t0={at(65)}>Gampang</Hi>} b={<It>banget</It>} />
      <div style={{ position: "absolute", left: 150, right: 150, top: 610 }}>
        {steps.map(([s, on], k) => {
          const p = appear(t, on, 0.3);
          return (
            <In key={k} t={t} t0={t0 + 0.6 + k * 0.1} dy={10}>
              <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 18, height: 74, borderRadius: 14, padding: "0 24px", fontFamily: FONT, fontWeight: 800, fontSize: 30,
                background: p > 0 ? `rgba(245,197,24,${0.12 + 0.88 * p})` : "rgba(245,197,24,.12)", color: p > 0.5 ? "#111" : "rgba(255,255,255,.35)", boxShadow: `0 0 ${36 * p}px rgba(245,197,24,.45)` }}>
                <span style={{ width: 40, height: 40, borderRadius: 99, display: "grid", placeItems: "center", background: p > 0.5 ? "#111" : "rgba(255,255,255,.12)", color: YEL, fontSize: 24 }}>{p > 0.5 ? "✓" : k + 1}</span>{s}
              </div>
            </In>
          );
        })}
      </div>
    </>
  );
};

const G: React.FC<{ t: number; t0: number }> = ({ t, t0 }) => {
  const bob = Math.sin((t - t0) * 2.4) * 8;
  const spark = appear(t, at(95), 0.3) * (0.75 + 0.25 * Math.sin(t * 9));
  return (
    <>
      <Header dark t={t} t0={t0} eyebrow="JANGAN NUNGGU" a={<><It>Aktifin </It><Hi dark t={t} t0={at(94)}>Ada Notif</Hi></>} b={<>Sekarang</>} />
      <In t={t} t0={t0 + 0.4} style={{ position: "absolute", left: 340, top: 600, transform: `translateY(${bob}px) rotate(-4deg)` }}>
        <div style={{ width: 400, height: 280, background: "#fff", borderRadius: 26, boxShadow: "0 24px 60px rgba(0,0,0,.16)", padding: 28, fontFamily: FONT }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ width: 54, height: 54, borderRadius: 14, background: "#25D366" }} />
            <div style={{ fontWeight: 800, fontSize: 26, color: "#111" }}>Ada Notif</div>
          </div>
          {[0.95, 0.75, 0.85].map((w, k) => <div key={k} style={{ height: 16, width: `${w * 100}%`, background: "#ECE7DC", borderRadius: 8, marginTop: 22 }} />)}
        </div>
      </In>
      <div style={{ position: "absolute", left: 770, top: 590, fontSize: 64, color: GOLD, opacity: spark, transform: `scale(${0.8 + 0.3 * spark}) rotate(${t * 40}deg)` }}>✦</div>
    </>
  );
};

// ---------- one word at a time (style 1)
const WordCaption: React.FC<{ t: number; mode: Mode }> = ({ t, mode }) => {
  const k = words.findIndex((w, i) => t >= w.start - 0.03 && t < (words[i + 1]?.start ?? w.end + 0.4) - 0.03);
  if (k < 0) return null;
  const w = words[k];
  const p = appear(t, w.start - 0.03, 0.1);
  const text = w.text.replace(/[.,?!]+$/, "").toLowerCase().replace("adacareer", "ada4career");
  const top = mode === "full" ? 1230 : 950;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: mode === "full" ? 64 : 54,
      color: mode === "cta" ? "#111" : "#fff", transform: `scale(${0.92 + 0.08 * p})`, opacity: 0.4 + 0.6 * p,
      textShadow: mode === "full" ? "0 3px 14px rgba(0,0,0,.55)" : undefined }}>{text}</div>
  );
};

export const PanelDemo: React.FC = () => {
  const ready = useFonts();
  const t = useCurrentFrame() / FPS;
  const s = SECTIONS.find((x) => t >= x.from && t < x.to) ?? SECTIONS[SECTIONS.length - 1];
  const bg = s.mode === "cta" ? CREAM : BG;
  return (
    <AbsoluteFill style={{ background: bg }}>
      {s.mode === "full" ? (
        <AbsoluteFill><Footage /></AbsoluteFill>
      ) : (
        <>
          <AbsoluteFill style={{ background: s.mode === "cta" ? `radial-gradient(60% 30% at 50% 22%, #fff8e6, ${CREAM})` : `radial-gradient(55% 26% at 50% 21%, rgba(232,185,49,.22), rgba(232,185,49,0) 70%), ${BG}` }} />
          <Inset light={s.mode === "cta"} />
        </>
      )}
      {ready && (
        <>
          {s.key === "A" && <A t={t} />}
          {s.key === "B" && <NotifCard t={t} t0={at(21)} title="Ada Notif · Ada4career" body="3 lowongan baru cocok buat kamu" />}
          {s.key === "C" && <C t={t} t0={s.from} />}
          {s.key === "D" && <D t={t} t0={s.from} />}
          {s.key === "E" && <E t={t} t0={s.from} />}
          {s.key === "F" && <NotifCard green t={t} t0={at(87)} title="WhatsApp · Ada Notif" body="Lowongan minggu ini udah masuk ✓" />}
          {s.key === "G" && <G t={t} t0={s.from} />}
          <WordCaption t={t} mode={s.mode} />
        </>
      )}
      <Audio src={staticFile("panel-mix.wav")} />
    </AbsoluteFill>
  );
};
