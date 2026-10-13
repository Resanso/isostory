// Plays an anatomy story: scenes of kit-drawn objects in one shared projection, crossfaded by time,
// with the HTML overlay and an optional audio track on top. Every frame is f(t).
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import "../kit/iso.css";
import { themeCss } from "./style.js";
import { at, place, depth } from "./lib.js";
import { Overlay } from "./Overlay.jsx";
import { FPS, prog } from "./ease.js";
// imported, not passed as props: Remotion serialises props, and scenes are functions
import story from "../story.js";

/**
 * Camera → viewBox. `cam.c` is the world point to centre, `cam.w`/`cam.h` the screen size (in kit units)
 * that must fit. The scene sits in the safe band between the titles (top) and the subtitles (bottom).
 */
export function viewBoxOf(cam, width, height, captions = true) {
  const A = width / height;
  const tall = height > width * 1.2, wide = width > height * 1.2;
  // without subtitles the band reaches further down
  const low = captions ? (tall ? 0.77 : wide ? 0.86 : 0.82) : 0.93;
  const [top, bottom] = cam.band ?? [tall ? 0.22 : 0.2, low];
  const vw = Math.max(cam.w / 0.94, (cam.h / (bottom - top)) * A);
  const vh = vw / A;
  const [cx, cy] = at(cam.c);
  return [cx - vw / 2, cy - vh * ((top + bottom) / 2), vw, vh];
}

function Scene({ scene, t, width, height }) {
  const fade = prog(t, scene.from - 0.05, scene.from + (scene.fadeIn ?? 0.3)) * (1 - prog(t, scene.to - (scene.fadeOut ?? 0.35), scene.to + 0.05));
  if (fade <= 0) return null;
  const { items, overlay = "", cam } = scene.build(t);
  const vb = viewBoxOf(cam, width, height, story.captions !== false);
  // painter's order: far before near, by each item's origin (or its explicit key)
  const sorted = items.map((it, i) => ({ ...it, k: it.key ?? depth(it.o), i })).sort((a, b) => a.k - b.k || a.i - b.i);
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <svg viewBox={vb.join(" ")} className="iso-svg" style={{ width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet">
        {sorted.map((it) => (
          <g key={it.i} transform={place(it.o) + (it.scale ? ` scale(${it.scale})` : "")} opacity={it.opacity ?? 1}
            style={it.dim ? { filter: `brightness(${1 - 0.45 * it.dim}) saturate(${1 - 0.7 * it.dim})` } : undefined}
            dangerouslySetInnerHTML={{ __html: it.svg }} />
        ))}
        <g dangerouslySetInnerHTML={{ __html: overlay }} />
      </svg>
    </AbsoluteFill>
  );
}

export function Stage() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ background: story.transparent ? "transparent" : "linear-gradient(160deg, #111729 0%, #070910 100%)" }}>
      <style>{themeCss(story.brand.accent)}</style>
      {!story.transparent && (
        <AbsoluteFill style={{ backgroundImage: "linear-gradient(rgba(127,138,163,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(127,138,163,0.07) 1px, transparent 1px)",
          backgroundSize: "64px 64px", maskImage: "radial-gradient(ellipse at center, #000 25%, transparent 75%)" }} />
      )}
      <div className="iso" data-theme="ax" style={{ position: "absolute", inset: 0, background: "transparent" }}>
        {story.scenes.map((s, i) => (t >= s.from - 0.1 && t <= s.to + 0.1 ? <Scene key={i} scene={s} t={t} width={width} height={height} /> : null))}
      </div>
      <Overlay story={story} />
      {story.audio && <Audio src={staticFile(story.audio)} />}
    </AbsoluteFill>
  );
}
