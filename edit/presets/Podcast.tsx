// Reference implementation (written on the sample clip; word indices like at(17) and all copy are that clip's, rewrite them per edit): "podcast" style preset (style-3 reference) on the sample clip.
import React, { useEffect, useState } from "react";
import { AbsoluteFill, Series, staticFile, useCurrentFrame, interpolate, spring, delayRender, continueRender, Easing, Img } from "remotion";
import { Video, Audio } from "@remotion/media";
import "@fontsource/bebas-neue/400.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/600.css";
import data from "./data.json";
import face from "./face.json";
import { words, FPS, chunk } from "./plan";

const W = 1080, H = 1920, GOLD = "#E9B949";
const at = (i: number) => words[i].start;
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const p01 = (t: number, a: number, d = 0.3) => interpolate(t, [a, a + d], [0, 1], { ...cl, easing: ease });
export const podcastDuration = data.durationInFrames;

const useFonts = () => {
  const [h] = useState(() => delayRender("fonts"));
  const [ok, setOk] = useState(false);
  useEffect(() => { Promise.all(["400 40px 'Bebas Neue'", "700 40px Poppins", "600 40px Poppins"].map((f) => document.fonts.load(f))).then(() => { setOk(true); continueRender(h); }); }, [h]);
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
const segAt = (f: number) => data.segs.find((g) => f >= g.outF && f < g.outF + (g.toF - g.fromF)) ?? data.segs[data.segs.length - 1];
const faceAt = (f: number) => { const g = segAt(f); const [x, y] = (face as number[][])[Math.min(face.length - 1, g.fromF + (f - g.outF))]; return { cx: x * W, cy: y * H }; };

// ---------- shots: every jump cut plus phrase boundaries ~2-3 s apart; alternate wide / tight
const HOOK_SNAP = 5; // frames of tight close-up before the zoom-out reveal
const DIAG = [at(67), at(81)] as const, SPLIT = [at(81), at(93)] as const;
const shotStarts = (() => {
  const cuts = data.segs.map((g) => g.outF / FPS);
  const out: number[] = [];
  for (const c of cuts) out.push(c);
  // add a switch at the first word start >= 2.4 s after the previous switch, inside long segments
  let last = 0;
  for (const w of words) {
    const nextCut = cuts.find((c) => c > last + 0.01) ?? 999;
    if (w.start - last >= 2.4 && nextCut - w.start > 1.0) { out.push(w.start - 0.03); last = w.start; }
    if (cuts.some((c) => c > last && c <= w.start)) last = Math.max(...cuts.filter((c) => c <= w.start));
  }
  return [...new Set(out.map((x) => Math.round(x * FPS)))].sort((a, b) => a - b);
})();
const shotOf = (f: number) => { let k = 0; for (let i = 0; i < shotStarts.length; i++) if (f >= shotStarts[i]) k = i; return { k, start: shotStarts[k], end: shotStarts[k + 1] ?? 99999 }; };
const camAt = (f: number) => {
  const { k, start } = shotOf(f);
  const tight = k % 2 === 1;
  const s0 = f < HOOK_SNAP ? 1.75 : tight ? 1.36 : 1.0;
  const drift = f < 4 * FPS ? 0 : (f - start) / FPS * 0.012; // slow push-in inside a shot
  const s = s0 + drift;
  const { cx, cy } = faceAt(f);
  return { s, cx, cy: cy - 40 };
};
const camStyle = (f: number): React.CSSProperties => {
  const { s, cx, cy } = camAt(f);
  // keep the face where it is in the wide shot, but never show edges
  const tx = Math.min(0, Math.max(W - W * s, W / 2 - cx * s - (W / 2 - cx)));
  const ty = Math.min(0, Math.max(H - H * s, H * 0.42 - cy * s - (H * 0.42 - cy)));
  return { transform: `translate(${tx}px, ${ty}px) scale(${s})`, transformOrigin: "0 0" };
};
const BW = [[at(14), at(17)], [at(49), at(53)]];

// ---------- captions: 2-5 word phrase in a black box
const phrases = chunk(words, 4, 0.3);
const PhraseBox: React.FC<{ t: number; y: number }> = ({ t, y }) => {
  const k = phrases.findIndex((p, i) => t >= p[0].start - 0.05 && t < (phrases[i + 1]?.[0].start ?? p[p.length - 1].end + 0.6) - 0.05);
  if (k < 0) return null;
  const text = phrases[k].map((w) => w.text.replace(/[.,?!]+$/, "")).join(" ").toLowerCase().replace("adacareer", "ada4career");
  return (
    <div style={{ position: "absolute", top: y, left: 0, right: 0, textAlign: "center" }}>
      <span style={{ display: "inline-block", background: "#000", color: "#fff", font: "700 44px Poppins", padding: "10px 22px 12px", borderRadius: 8, maxWidth: 820 }}>{text}</span>
    </div>
  );
};
const LogoPop: React.FC<{ t: number; t0: number; dur: number }> = ({ t, t0, dur }) => {
  if (t < t0 || t > t0 + dur) return null;
  const s = spring({ frame: Math.round((t - t0) * FPS), fps: FPS, config: { damping: 11 } });
  const out = interpolate(t, [t0 + dur - 0.2, t0 + dur], [1, 0], cl);
  return (
    <div style={{ position: "absolute", top: 960, left: W / 2 - 60, width: 120, height: 120, borderRadius: 99, background: "#fff", display: "grid", placeItems: "center", transform: `scale(${s * out})`, boxShadow: "0 10px 30px rgba(0,0,0,.4)" }}>
      <Img src={staticFile("ada-logo.png")} style={{ width: 86, height: 86, borderRadius: 20 }} />
    </div>
  );
};

const Diagram: React.FC<{ t: number }> = ({ t }) => {
  const cards = [{ t0: at(68), label: "Masuk Ada4career", c: "#7B6CF6" }, { t0: at(75), label: "Muncul pop-up", c: "#F2A93B" }, { t0: at(77), label: "Masukin nomor WA", c: "#2BB673" }];
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#ffffff 0%, #f1f1f1 62%, #111 100%)" }}>
      {cards.map((c, k) => {
        const p = p01(t, c.t0, 0.4);
        return (
          <div key={k} style={{ position: "absolute", top: 640, left: 70 + k * 330, width: 280, opacity: p, transform: `translateX(${(1 - p) * -60}px)` }}>
            <div style={{ height: 300, background: "#fff", borderRadius: 22, boxShadow: "0 18px 40px rgba(0,0,0,.12)", border: "1px solid #e6e6e6", padding: 20 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>{["#ff5f57", "#febc2e", "#28c840"].map((d) => <div key={d} style={{ width: 12, height: 12, borderRadius: 9, background: d }} />)}</div>
              <div style={{ height: 70, borderRadius: 12, background: c.c, opacity: 0.9 }} />
              {[0.9, 0.7, 0.8].map((w, i) => <div key={i} style={{ height: 14, width: `${w * 100}%`, background: "#ececec", borderRadius: 7, marginTop: 18 }} />)}
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}><div style={{ width: 46, height: 46, borderRadius: 99, background: c.c, color: "#fff", display: "grid", placeItems: "center", font: "700 24px Poppins" }}>{k + 1}</div></div>
            <div style={{ textAlign: "center", font: "600 26px Poppins", color: "#222", marginTop: 8 }}>{c.label}</div>
          </div>
        );
      })}
      {cards.slice(0, 2).map((c, k) => <div key={k} style={{ position: "absolute", top: 780, left: 350 + k * 330, width: 50, height: 4, background: "#ccc", opacity: p01(t, cards[k + 1].t0) }} />)}
    </AbsoluteFill>
  );
};

export const PodcastDemo: React.FC = () => {
  const ready = useFonts();
  const f = useCurrentFrame();
  const t = f / FPS;
  const inDiag = t >= DIAG[0] && t < DIAG[1];
  const inSplit = t >= SPLIT[0] && t < SPLIT[1];
  const bw = BW.some(([a, b]) => t >= a && t < b);
  const grade = `contrast(1.08) saturate(${bw ? 0 : 0.85}) brightness(0.96)`;
  const hook = f < 4 * FPS;
  const matteIdx = f + 1; // matte frames f001.. = edit frames 0.. (segment 0 starts at source frame 27)
  const titleP = (d: number) => p01(t, HOOK_SNAP / FPS + d, 0.35);
  const titleOut = interpolate(t, [3.7, 4.0], [1, 0], cl);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {inDiag ? <Diagram t={t} /> : inSplit ? (
        <>
          <AbsoluteFill style={{ top: 560 }}><div style={{ position: "absolute", inset: 0, transform: "translateY(-240px)", filter: grade }}><Footage /></div></AbsoluteFill>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 560, overflow: "hidden", background: "#111" }}>
            <Img src={staticFile("modal-wa-digest.png")} style={{ width: "100%", height: "100%", objectFit: "cover",
              transform: `scale(${interpolate(t, [SPLIT[0], SPLIT[1]], [1.05, 1.45], cl)}) translate(${interpolate(t, [SPLIT[0], SPLIT[1]], [0, -60], cl)}px, ${interpolate(t, [SPLIT[0], SPLIT[1]], [0, -40], cl)}px)` }} />
          </div>
        </>
      ) : (
        <>
          <AbsoluteFill style={{ ...camStyle(f), filter: grade }}><Footage /></AbsoluteFill>
          {hook && ready && (
            <>
              <AbsoluteFill style={{ background: "linear-gradient(rgba(0,0,0,.55), transparent 40%)", opacity: titleOut }} />
              <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", fontFamily: "'Bebas Neue'", lineHeight: 0.95, opacity: titleOut, textShadow: "0 6px 24px rgba(0,0,0,.6)" }}>
                <div style={{ fontSize: 150, color: "#fff", opacity: titleP(0), transform: `translateY(${(1 - titleP(0)) * 30}px)`, filter: `blur(${(1 - titleP(0)) * 8}px)` }}>NYARI KERJA CAPEK?</div>
                <div style={{ fontSize: 112, color: GOLD, opacity: titleP(0.45), transform: `translateY(${(1 - titleP(0.45)) * 30}px)`, filter: `blur(${(1 - titleP(0.45)) * 8}px)` }}>BIAR LOWONGANNYA NYAMPERIN</div>
              </div>
              {f >= HOOK_SNAP && matteIdx <= 135 && (
                <AbsoluteFill style={{ ...camStyle(f), filter: grade }}>
                  <Img src={staticFile(`matte/f${String(matteIdx).padStart(3, "0")}.png`)} style={{ width: W, height: H }} />
                </AbsoluteFill>
              )}
            </>
          )}
        </>
      )}
      {ready && (
        <>
          <LogoPop t={t} t0={at(27)} dur={1.6} />
          <LogoPop t={t} t0={at(33)} dur={1.2} />
          <PhraseBox t={t} y={inSplit ? 1250 : 1095} />
        </>
      )}
      <Audio src={staticFile("podcast-mix.wav")} />
    </AbsoluteFill>
  );
};
