// Reference implementation (written on a synthetic sample script; word indices like at(17) and all copy are that
// script's, rewrite them per edit): "editorial" style preset, measured from five commentary reels (dark warm talking
// head, stacked mixed-type captions, cinematic photo inserts, white paper boards, documents, retro list).
// Built from the motion kit in ../motion/ — read motion/motion.md for what each piece is for.
import React, { useEffect, useState } from "react";
import { AbsoluteFill, Series, staticFile, useCurrentFrame, delayRender, continueRender } from "remotion";
import { Video, Audio } from "@remotion/media";
import "@fontsource/inter-tight/700.css";
import "@fontsource/inter-tight/900.css";
import "@fontsource/instrument-serif/400-italic.css";
import data from "./data.json";
import { words, FPS } from "./plan";
import { W, H, INK, FONT } from "../motion/fx";
import { KineticStack, NameStrip, Line } from "../motion/type";
import { Arrow } from "../motion/marks";
import { camStyle, punch, zoomOut, shake, push } from "../motion/camera";
import { LightLeak, FilmBurn, Flash, Glitch, Grain, Between } from "../motion/transitions";
import { WhiteBoard, Placed, Photo, DocCard, TerminalList, Rain, countTo } from "../motion/boards";
import { Model3D } from "../motion/three";

const at = (i: number) => words[i].start;
const end = (i: number) => words[i].end;
export const editorialDuration = data.durationInFrames;

const useFonts = () => {
  const [h] = useState(() => delayRender("fonts"));
  const [ok, setOk] = useState(false);
  useEffect(() => { Promise.all(["700 40px 'Inter Tight'", "900 40px 'Inter Tight'", "italic 400 40px 'Instrument Serif'"].map((f) => document.fonts.load(f))).then(() => { setOk(true); continueRender(h); }); }, [h]);
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

// ---------- the speaker: dark warm grade, vignette, grain; camera = zoom-out hook, punch-ins, shake on the boom
const PUNCHES: [number, number, number][] = [[at(14), end(14), 1.25], [at(34), end(34) + 0.2, 1.3]]; // [from, to, scale]
const Speaker: React.FC<{ t: number }> = ({ t }) => {
  let s = zoomOut(t, 0, 1.45, 0.55) * push(t, 0.6, 30, 1, 1.04);
  for (const [a, b, k] of PUNCHES) s *= punch(t, a, b, k);
  const sh = shake(t, at(34), 14);
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ ...camStyle({ s, x: W / 2 + sh.dx, y: H * 0.36 + sh.dy }), filter: "contrast(1.08) saturate(.88) brightness(.9) sepia(.08)" }}><Footage /></AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 60% at 50% 38%, rgba(0,0,0,0) 45%, rgba(0,0,0,.55) 100%)" }} />
    </AbsoluteFill>
  );
};

// ---------- sections: what fills the frame. Each change of place is a hard cut unless a transition is listed below.
type Sec = { from: number; to: number; k: "speaker" | "photo" | "board" | "terminal" | "doc" | "model" };
const SEC: Sec[] = [
  { from: 0, to: at(7), k: "speaker" },
  { from: at(7), to: at(13), k: "photo" }, // "tapi nggak ada satupun yang dipanggil interview"
  { from: at(13), to: at(17), k: "speaker" }, // "masalahnya BUKAN di kamu"
  { from: at(17), to: at(25), k: "board" }, // "75% CV ditolak mesin sebelum dibaca manusia"
  { from: at(25), to: at(27), k: "speaker" }, // "namanya ATS"
  { from: at(27), to: at(30), k: "doc" },
  { from: at(30), to: at(37), k: "speaker" }, // "yang kamu lawan itu ROBOT, bukan HRD"
  { from: at(37), to: at(41), k: "terminal" }, // three reasons
  { from: at(41), to: at(44), k: "model" },
  { from: at(44), to: 999, k: "speaker" }, // CTA
];

// ---------- caption stacks: one per thought, lines land on their words (the signature of the style)
const STACKS: { lines: Line[]; until: number; y: number; dark?: boolean; align?: "center" | "left" | "right"; enter?: "rise" | "pop" | "focus" }[] = [
  { y: 1130, until: at(3), lines: [{ at: at(0), text: "kamu udah kirim", role: "lead", ats: [at(0), at(1), at(2)] }] },
  { y: 1100, until: at(7), lines: [{ at: at(3), text: "100", role: "num", color: INK.yellow, size: 220 }, { at: at(4), text: "LAMARAN", role: "key", color: INK.white }, { at: at(5), text: "kerja", role: "tail", dx: 160 }] },
  { y: 1180, until: at(13), lines: [{ at: at(7), text: "tapi nggak", role: "lead", dx: -80, ats: [at(7), at(8)] }, { at: at(9), text: "SATUPUN", role: "key" }, { at: at(10), text: "yang dipanggil", role: "lead", dx: 90, ats: [at(10), at(11)] }, { at: at(12), text: "interview", role: "tail", dx: 120 }] },
  { y: 1150, until: at(17), lines: [{ at: at(13), text: "masalahnya", role: "lead" }, { at: at(14), text: "BUKAN", role: "key", enter: "pop" }, { at: at(15), text: "di kamu", role: "tail", dx: 140 }] },
  { y: 1210, until: at(25), lines: [{ at: at(19), text: "CV ditolak", role: "lead", dx: -60, ats: [at(19), at(20)] }, { at: at(21), text: "MESIN", role: "key", color: "#111", mark: { kind: "ellipse", at: at(21) + 0.15 } }, { at: at(22), text: "sebelum dibaca manusia", role: "tail", dx: 60, ats: [at(22), at(23), at(24)] }], dark: true },
  { y: 1150, until: at(27), lines: [{ at: at(25), text: "namanya", role: "lead" }, { at: at(26), text: "ATS", role: "key", size: 220 }] },
  { y: 1170, until: at(35), lines: [{ at: at(30), text: "yang kamu lawan itu", role: "lead", ats: [at(30), at(31), at(32), at(33)] }, { at: at(34), text: "ROBOT", role: "key", mark: { kind: "ellipse", at: at(34) + 0.15 } }] },
  { y: 1170, until: at(37), lines: [{ at: at(35), text: "bukan", role: "tail" }, { at: at(36), text: "HRD", role: "key", color: INK.white, mark: { kind: "strike", at: end(36) } }] },
  { y: 1120, until: 999, lines: [{ at: at(44), text: "tulis CV yang dibaca", role: "lead", ats: [at(44), at(45), at(46), at(47)] }, { at: at(48), text: "MESIN", role: "key" }, { at: at(49), text: "dan manusia", role: "tail", dx: 120, ats: [at(49), at(50)] }] },
];

export const EditorialDemo: React.FC = () => {
  const ready = useFonts();
  const f = useCurrentFrame();
  const t = f / FPS;
  if (!ready) return null;
  const sec = SEC.find((s) => t >= s.from && t < s.to) ?? SEC[SEC.length - 1];

  const layer = (k: Sec["k"]): React.ReactNode => {
    switch (k) {
      case "photo": return <Photo t={t} at={at(7)} until={at(13)} src="assets/photo-laptop.jpg" grade="warm" />;
      case "board": return (
        <WhiteBoard t={t} swoosh={1}>
          <div style={{ position: "absolute", top: 380, width: W, textAlign: "center", font: `900 300px ${FONT.sans}`, letterSpacing: "-0.05em", color: "#111" }}>{countTo(t, at(17), 75, 0.9)}%</div>
          <Placed t={t} at={at(18)} src="assets/cutout-person.png" x={560} y={1360} w={440} bw enter="rise" />
          <Arrow t={t} at={at(20)} x1={300} y1={760} x2={470} y2={1080} bend={-0.35} />
        </WhiteBoard>
      );
      case "doc": return <DocCard t={t} at={at(27)} until={at(30)} src="assets/doc.png" over="dim" behind={<Speaker t={t} />} hl={[{ at: at(28), y: 210, h: 46 }]} />;
      case "terminal": return <TerminalList t={t} at={at(37)} rows={["Format tabel", "Foto & grafik", "Kata kunci hilang"]} picks={[at(37), at(39), at(40)]} />;
      case "model": return (
        <WhiteBoard t={t} swoosh={2}>
          <KineticStack t={t} until={at(44)} y={360} dark lines={[{ at: at(41), text: "solusinya", role: "lead" }, { at: at(42), text: "SIMPEL", role: "key" }]} />
          <Model3D t={t} at={at(41)} url="assets/model/model.gltf" x={190} y={760} w={700} h={700} spin={0.25} />
        </WhiteBoard>
      );
      default: return <Speaker t={t} />;
    }
  };

  // blend the doc in and the terminal out with Between; everything else is a hard cut under an overlay
  const base = Math.abs(t - at(27)) < 0.2 ? <Between t={t} c={at(27)} d={0.4} kind="blurzoom" a={layer("speaker")} b={layer("doc")} />
    : Math.abs(t - at(41)) < 0.2 ? <Between t={t} c={at(41)} d={0.35} kind="slice" a={layer("terminal")} b={layer("model")} />
    : layer(sec.k);

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {base}
      {sec.k === "photo" && <Rain t={t} at={at(8)} until={at(12)} src="assets/paper.png" n={14} size={220} />}
      {STACKS.map((s, i) => <KineticStack key={i} t={t} {...s} />)}
      <NameStrip t={t} at={at(1)} until={at(3)} name="Nama Kamu" role="Career Coach" />
      <Grain t={t} amount={0.07} />
      <LightLeak t={t} c={at(17)} d={0.6} />
      <FilmBurn t={t} c={at(37)} d={0.5} />
      <Glitch t={t} c={at(30)} d={0.2} label="ERROR 404" />
      <Flash t={t} c={at(44)} d={0.1} color={INK.yellow} />
      <Audio src={staticFile("mix.wav")} />
    </AbsoluteFill>
  );
};
