// isostory: storytelling motion on the Hairline kernel (MIT, ./kernel.js).
// One story = bodies whose poses are pure functions of time + a camera + an
// HTML layer (chapters, pins, title/end cards, curtain, watermark). The same
// story plays on a clock, follows scroll, or is seeked frame by frame for video.
//
// Public API: everything is on ISO (see the index below). Story files call
// ISO.story({...}) once and export its result.
import { HL } from "./kernel.js";

/* ============================================================== INDEX
 * Timing
 *   prog(t, a, b, ease?)        0 before a, 1 after b, eased between (default easeInOut)
 *   ease.{lift,inOut,out,in,linear}  curves; lift = Hairline's (.32,.72,0,1)
 *   settle(p, amount=1.4)       back-out overshoot for landings
 *   arc(p, height)              sin(pi·p)·height: lift a travelling body over its path
 *   stagger(i, step, origin=0)  |i - origin| · step: delay by distance (rule M3)
 *   mix(a, b, p), clamp(v, a, b), jitter(i, salt) deterministic noise in [-1, 1]
 *   window(t, a, b, fade=.3)    1 inside [a, b], fading in and out over `fade` seconds
 * Colour
 *   color.mix(hexA, hexB, p), color.shade(hex, amt)  amt < 0 darker, > 0 lighter
 *   theme(name | {…}, brand?)   a full theme; "paper", "studio", "midnight", or derived from brand.accent
 * Story
 *   story({ name, duration, view?, theme?, brand?, bodies, camera, chapters?, pins?, cards?,
 *           curtain?, poster?, backdrop? })            registers and returns the story
 *   body(id, poseFn)           a body: poseFn(t, ctx) returns a Pose (see below)
 * Pose (world units, z up)
 *   { x, y, z, w, d, h, r?, b?, rot?, layer?, opacity?, color?, top?, side?, tone?, shadow?,
 *     detail?, decal?, marks? }
 *   color: palette key or hex for the top face; side defaults to color shaded -18%
 *   tone: "base" | "hi" (ink edge) | "lo" (faded into the ground) | "accent" (accent edge)
 *   layer: 0 ground plates, 1 what lies on them, 2 movers (default), 3 floaters
 *   detail: "cv" | "card" | "lane" | "phone" | "chart" | "chip" | "screen" | "none"
 *   decal: "logo" | { href?, w, d, u?, v? }  an image printed on the top face; no href = the brand logo
 *   marks: (top, P) => path string   custom marks; top(u, v) maps the top face to the screen
 * Text (HTML layer, every frame computed from t: identical on the web and in video)
 *   texts: [{ t0, t1?, text, style?, anim?, by?, stagger?, dur?, at?, align?, emphasis?, count?, exit? }]
 *     style: "title" | "big" | "kicker" | "lower" | "subtitle" | "quote" | "stat" | "caption"
 *     anim:  "rise" | "blur" | "mask" | "pop" | "slide" | "type" | "karaoke" | "none"
 *     by:    "word" (default) | "char" | "line";  stagger: seconds between units (default .06 word, .025 char)
 *     at:    "center" | "top" | "bottom" | "lower-left" | "upper-left" | [x%, y%];  safe areas differ for 9:16
 *     emphasis: ["word", …]  accent colour + a highlighter sweep after the word lands
 *     count: { from, to, decimals?, dur? }  "{n}" in text counts from → to (stats, prices)
 *     exit: "fade" (default) | "up" | "none"
 *     group: "name"  texts in one group stack in a column at the group's anchor (the first item's `at`),
 *            keeping their place while hidden, so they never collide in any aspect (rule T4)
 *   subtitles: [{ t0, t1, text }] or srt(string)   bottom captions, karaoke-highlighted word by word
 *   srt(text) → subtitles;  toSrt(subs), toVtt(subs) → sidecar files for ad platforms
 *   beat(n, bpm, offset=0)      the time of beat n: cut and land on the music
 * Player
 *   mount(el, story, { mode: "autoplay"|"scroll"|"frame", aspect: "16:9"|"9:16"|"1:1",
 *                      controls?, captions?, loop?, theme?, brand?, transparent?, onChapter? })
 *                      → { seek, play, pause, destroy, duration }
 *   transparent: no backdrop, no radius (a motion component on any page, or an alpha video over footage)
 *   ?frame in the URL forces frame mode and exposes window.__iso = { duration, seek, poster, ready }
 * ============================================================== */

const { Cam, fit, proj, facing, rrect, prism, ringAt, poly, open, seg, circ, mk, bezier } = HL;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, p) => a + (b - a) * p;

// ---------------------------------------------------------------- timing
const ease = {
  lift: bezier(0.32, 0.72, 0, 1),
  inOut: bezier(0.65, 0, 0.35, 1),
  out: bezier(0.22, 1, 0.36, 1),
  in: bezier(0.55, 0, 1, 0.45),
  linear: (p) => p,
};
function prog(t, a, b, e = ease.inOut) {
  if (t <= a) return 0;
  if (t >= b) return 1;
  return e((t - a) / (b - a));
}
const settle = (p, amount = 1.4) => {
  const q = p - 1;
  return 1 + q * q * ((amount + 1) * q + amount);
};
const arc = (p, height) => Math.sin(Math.PI * clamp(p, 0, 1)) * height;
const stagger = (i, step, origin = 0) => Math.abs(i - origin) * step;
const jitter = (i, salt = 0) => {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
};
const window_ = (t, a, b, fade = 0.3) => prog(t, a, a + fade, ease.out) * (1 - prog(t, b - fade, b, ease.in));

const beat = (n, bpm, offset = 0) => offset + (n * 60) / bpm;

// ---------------------------------------------------------------- subtitles
const tc = (v) => {
  const m = /(\d+):(\d+):(\d+)[,.](\d+)/.exec(v);
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000 : 0;
};
/** Parses SRT (or WebVTT cues) into [{ t0, t1, text }]. */
function srt(text) {
  return String(text)
    .replace(/\r/g, "")
    .split(/\n\n+/)
    .map((block) => {
      const lines = block.trim().split("\n");
      const i = lines.findIndex((l) => l.includes("-->"));
      if (i < 0) return null;
      const [a, b] = lines[i].split("-->");
      return { t0: tc(a), t1: tc(b), text: lines.slice(i + 1).join(" ").trim() };
    })
    .filter(Boolean);
}
const stamp = (t, sep) => {
  const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s2 = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s2).padStart(2, "0")}${sep}${String(ms % 1000).padStart(3, "0")}`;
};
const toSrt = (subs) => subs.map((c, i) => `${i + 1}\n${stamp(c.t0, ",")} --> ${stamp(c.t1, ",")}\n${c.text}\n`).join("\n");
const toVtt = (subs) => "WEBVTT\n\n" + subs.map((c) => `${stamp(c.t0, ".")} --> ${stamp(c.t1, ".")}\n${c.text}\n`).join("\n");

// ---------------------------------------------------------------- colour
const hexRgb = (h) => {
  h = h.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const rgbHex = (c) => "#" + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
const color = {
  mix: (a, b, p) => {
    const A = hexRgb(a), B = hexRgb(b);
    return rgbHex(A.map((v, i) => mix(v, B[i], p)));
  },
  shade: (hex, amt) => (amt < 0 ? color.mix(hex, "#000000", -amt) : color.mix(hex, "#ffffff", amt)),
};

const BASE_THEMES = {
  // warm paper: cream ground, ink edges, soft pastels
  paper: {
    bg: ["#f6f1e7", "#ece4d4"], ink: "#24211c", edge: "#3a362f", line: "#8f8677", lo: "#cfc6b6",
    shadow: "rgba(70,52,20,0.13)", caption: "#24211c", muted: "#7a7163", accent: "#1b61ee",
    palette: { ground: "#efe6d6", plate: "#fbf7ef", paper: "#ffffff", card: "#fffaf0", tray: "#e8d9bf", lane: "#f4ecdf",
      blue: "#cfe0ff", green: "#cdeedb", amber: "#ffe3b0", rose: "#ffd3cf", violet: "#e3d8ff", ink: "#2b2823" },
  },
  // bright studio: cool white, saturated tints
  studio: {
    bg: ["#f4f7fc", "#e7edf7"], ink: "#151a24", edge: "#2a3140", line: "#7d879a", lo: "#cdd4e0",
    shadow: "rgba(20,40,90,0.14)", caption: "#151a24", muted: "#5e687a", accent: "#1b61ee",
    palette: { ground: "#e3eaf5", plate: "#f9fbff", paper: "#ffffff", card: "#ffffff", tray: "#d6e2f5", lane: "#eef3fb",
      blue: "#bcd3ff", green: "#bfe9d3", amber: "#ffdca3", rose: "#ffcbc6", violet: "#dccfff", ink: "#1d2330" },
  },
  // night: dark ground, light edges, glowing accent
  midnight: {
    bg: ["#0f1320", "#070910"], ink: "#eef2fb", edge: "#c9d2e6", line: "#7f8aa3", lo: "#2c3346",
    shadow: "rgba(0,0,0,0.3)", caption: "#eef2fb", muted: "#97a1b8", accent: "#5b8cff",
    palette: { ground: "#171d2e", plate: "#1d2438", paper: "#262f47", card: "#28324d", tray: "#202a42", lane: "#1f2740",
      blue: "#27407a", green: "#1f5a45", amber: "#6b5222", rose: "#6b2f35", violet: "#3d3270", ink: "#eef2fb" },
  },
};

/** A full theme: a base by name (or an object), with the brand's accent, font and palette laid over it. */
function theme(base = "studio", brand = {}) {
  const t = typeof base === "string" ? structuredClone(BASE_THEMES[base] ?? BASE_THEMES.studio) : structuredClone(base);
  if (brand.accent) {
    t.accent = brand.accent;
    const dark = t.bg[0].startsWith("#0") || t.bg[0].startsWith("#1");
    // the accent's own tints, so the brand colour shows on faces, not only on one edge
    t.palette.accent = dark ? color.shade(brand.accent, -0.45) : color.shade(brand.accent, 0.72);
    t.palette.accentSoft = dark ? color.shade(brand.accent, -0.65) : color.shade(brand.accent, 0.86);
    t.bg = dark ? t.bg : [color.mix(t.bg[0], brand.accent, 0.04), color.mix(t.bg[1], brand.accent, 0.08)];
  } else {
    t.palette.accent = t.palette.blue;
    t.palette.accentSoft = color.mix(t.palette.blue, t.palette.plate, 0.5);
  }
  Object.assign(t.palette, brand.palette ?? {});
  t.font = brand.font ?? "Inter, ui-sans-serif, system-ui, sans-serif";
  return t;
}

// ---------------------------------------------------------------- stories
const registry = [];
const brand = { name: "", logo: "", accent: "", font: "", watermark: false };

function story(def) {
  const s = {
    view: { w: 640, h: 360 },
    chapters: [],
    cards: [],
    backdrop: "dots",
    ...def,
  };
  s.brand = { ...brand, ...(def.brand ?? {}) };
  if (brand.logo) s.brand.logo = brand.logo; // a logo given at build time wins
  if (brand.accent) s.brand.accent = brand.accent;
  s.poster ??= Math.max(0, s.duration - 1.2);
  registry.push(s);
  return s;
}
const body = (id, pose) => ({ id, pose });

/** The view for an aspect: the short side stays 360 units, so a story's scale reads the same. */
function viewOf(aspect) {
  const [a, b] = String(aspect || "16:9").split(":").map(Number);
  return a >= b ? { w: Math.round((360 * a) / b), h: 360, aspect } : { w: 360, h: Math.round((360 * b) / a), aspect };
}

// ---------------------------------------------------------------- drawing
function footprint(p, inset) {
  const r = p.r ?? 2;
  const ring = rrect(-p.w / 2 + inset, -p.d / 2 + inset, p.w / 2 - inset, p.d / 2 - inset, Math.max(0.3, r - inset), r > 8 ? 8 : 4);
  const a = ((p.rot ?? 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return ring.map((q) => ({ u: p.x + q.u * c - q.v * s, v: p.y + q.u * s + q.v * c, nu: q.nu * c - q.nv * s, nv: q.nu * s + q.nv * c }));
}
function topOf(P, p) {
  const a = ((p.rot ?? 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return (u, v) => P(p.x + u * c - v * s, p.y + u * s + v * c, p.z + p.h);
}

/** The built-in marks: the few lines an object really has, on its top face. */
function detailMarks(top, p) {
  const W = p.w / 2, D = p.d / 2;
  const line = (u0, v, u1) => seg(top(u0, v), top(u1, v));
  const rect = (u0, v0, u1, v1) => poly([top(u0, v0), top(u1, v0), top(u1, v1), top(u0, v1)]);
  const ring = (cu, cv, r) => poly(circ(r, 18).map((q) => top(cu + q.u, cv + q.v)));
  switch (p.detail) {
    case "cv": {
      const ph = Math.min(p.w, p.d) * 0.22;
      let d = rect(-W + 3, -D + 3, -W + 3 + ph, -D + 3 + ph) + line(-W + ph + 6, -D + 4.5, W - 4) + line(-W + ph + 6, -D + 8, W - 9);
      for (let k = 0; k < 4; k++) d += line(-W + 3, -D + ph + 8 + k * 4.2, W - (k % 2 ? 7 : 3));
      return d;
    }
    case "card":
      return ring(-W + 6, 0, Math.min(3.4, D - 1.5)) + line(-W + 12, -2, W - 3) + line(-W + 12, 2, W - 8);
    case "lane":
      return line(-W + 3, -D + 6, W - 3);
    case "phone":
      return rect(-W + 2, -D + 4, W - 2, D - 6) + ring(0, D - 3, 1);
    case "screen":
      return rect(-W + 3, -D + 3, W - 3, D - 3) + line(-W + 6, -D + 7, W * 0.2);
    case "chart": {
      let d = line(-W + 3, D - 3, W - 3);
      const n = 5;
      for (let k = 0; k < n; k++) {
        const u = -W + 6 + ((p.w - 12) * k) / (n - 1), hgt = (0.3 + 0.6 * ((k * 37) % 10) / 10) * (p.d - 8);
        d += seg(top(u, D - 3), top(u, D - 3 - hgt));
      }
      return d;
    }
    case "chip":
      return line(-W + 2, 0, W - 2);
    default:
      return "";
  }
}

/**
 * Mounts a story into an svg for one view and theme. render(t) draws t and
 * returns P, the projection, so the HTML layer can follow world points.
 */
function scene(svg, s, view, th) {
  const C0 = Math.min(view.w, view.h) / 360; // scale for the aspect
  const defs = mk("defs", {}, svg);
  const shadows = mk("g", { "data-iso": "shadows" }, svg);
  const layer = mk("g", { "data-iso": "bodies" }, svg);
  const els = new Map();
  for (const b of s.bodies) {
    const g = mk("g", { "data-id": b.id }, layer);
    els.set(b.id, {
      g,
      shadow: mk("path", { fill: th.shadow, stroke: "none" }, shadows),
      side: mk("path", { "stroke-linejoin": "round" }, g),
      top: mk("path", { stroke: "none" }, g),
      crease: mk("path", { fill: "none" }, g),
      marks: mk("path", { fill: "none", "stroke-linecap": "round" }, g),
      decal: null,
      key: "", look: "", op: 1, layer: 2,
    });
  }
  let order = "";
  const pal = (c, fb) => (c == null ? fb : c.startsWith?.("#") ? c : th.palette[c] ?? fb);

  function look(el, p) {
    const tone = p.tone ?? "base";
    let topC = pal(p.top ?? p.color, th.palette.plate);
    let sideC = pal(p.side, color.shade(topC, -0.16));
    let edge = th.line, w = 1, markC = th.line;
    if (tone === "hi") (edge = th.edge), (w = 1.3), (markC = th.edge);
    if (tone === "accent") (edge = th.accent), (w = 1.5), (markC = th.accent);
    if (tone === "lo") {
      const g = th.bg[0];
      topC = color.mix(topC, g, 0.55);
      sideC = color.mix(sideC, g, 0.55);
      edge = th.lo;
      markC = th.lo;
    }
    const key = [topC, sideC, edge, w, markC].join("|");
    if (key === el.look) return;
    el.look = key;
    el.side.setAttribute("fill", sideC);
    el.side.setAttribute("stroke", edge);
    el.side.setAttribute("stroke-width", w);
    el.top.setAttribute("fill", topC);
    el.crease.setAttribute("stroke", color.mix(edge, topC, 0.45));
    el.crease.setAttribute("stroke-width", w * 0.8);
    el.marks.setAttribute("stroke", markC);
    el.marks.setAttribute("stroke-width", w * 0.85);
  }

  function decal(el, p, top) {
    // "logo", or a decal without href, is the brand logo as it is when the player mounts
    const d0 = p.decal === "logo" ? { w: p.w * 0.6, d: p.d * 0.6 } : p.decal;
    const d = d0 && { ...d0, href: !d0.href || d0.href === "logo" ? s.brand.logo : d0.href };
    if (!d || !d.href) {
      if (el.decal) el.decal.style.display = "none";
      return;
    }
    if (!el.decal) {
      el.decal = mk("image", { preserveAspectRatio: "xMidYMid meet" }, el.g);
      el.decal.setAttributeNS("http://www.w3.org/1999/xlink", "href", d.href);
      el.decal.setAttribute("href", d.href);
    }
    el.decal.style.display = "";
    const u0 = (d.u ?? 0) - d.w / 2, v0 = (d.v ?? 0) - d.d / 2;
    const O = top(u0, v0), X = top(u0 + 1, v0), Y = top(u0, v0 + 1);
    el.decal.setAttribute("width", d.w);
    el.decal.setAttribute("height", d.d);
    el.decal.setAttribute("transform", `matrix(${X[0] - O[0]} ${X[1] - O[1]} ${Y[0] - O[0]} ${Y[1] - O[1]} ${O[0]} ${O[1]})`);
  }

  function render(t) {
    const cam = s.camera(t, { view });
    const C = Cam(cam.az ?? 45, cam.k ?? 0.5, cam.S * C0);
    fit(C, [cam.focus], view.w / 2 + (cam.dx ?? 0) * C0, view.h / 2 + (cam.dy ?? 0) * C0);
    const P = proj(C), front = facing(C);
    const camKey = `${C.S.toFixed(4)}|${C.ox.toFixed(2)}|${C.oy.toFixed(2)}|${cam.az ?? 45}`;
    const live = [];
    for (const b of s.bodies) {
      const p = b.pose(t, { view, theme: th });
      const el = els.get(b.id);
      const op = clamp(p.opacity ?? 1, 0, 1);
      if (op !== el.op) {
        el.g.style.display = op <= 0.001 ? "none" : "";
        el.shadow.style.display = op <= 0.001 ? "none" : "";
        el.g.setAttribute("opacity", op >= 0.999 ? 1 : op.toFixed(3));
        el.op = op;
      }
      if (op <= 0.001) continue;
      look(el, p);
      const key = camKey + `|${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)},${p.w.toFixed(2)},${p.d.toFixed(2)},${p.h.toFixed(2)},${(p.rot ?? 0).toFixed(2)},${p.detail}`;
      if (key !== el.key) {
        el.key = key;
        const ring = footprint(p, 0), inner = footprint(p, p.b ?? 1);
        const sh = prism(P, front, ring, inner, p.z, p.z + p.h);
        el.side.setAttribute("d", sh.sil);
        el.top.setAttribute("d", poly(ringAt(P, ring, p.z + p.h)));
        el.crease.setAttribute("d", sh.crease);
        const top = topOf(P, p);
        el.marks.setAttribute("d", (p.marks ? p.marks(top, P, p) : "") + detailMarks(top, p));
        decal(el, p, top);
        // a soft shadow on the ground, drifting and fading as the body rises
        if (p.shadow !== false && (p.layer ?? 2) >= 1) {
          const ground = p.ground ?? 0, lift = Math.max(0, p.z - ground);
          const sp = { ...p, x: p.x + lift * 0.22, y: p.y + lift * 0.22, w: p.w + lift * 0.12, d: p.d + lift * 0.12 };
          el.shadow.setAttribute("d", poly(ringAt(P, footprint(sp, 0), ground)));
          el.shadow.setAttribute("opacity", clamp(1 - lift / 45, 0.08, 1).toFixed(3));
        } else el.shadow.setAttribute("d", "");
      }
      el.shadow.style.opacity = String(op);
      live.push({ id: b.id, layer: p.layer ?? 2, depth: (p.layer ?? 2) * 1e6 + p.x + p.y + p.z * 0.35 });
    }
    live.sort((a, b) => a.depth - b.depth);
    const next = live.map((l) => l.id).join("|");
    if (next !== order) {
      // ground plates first, then every shadow, then the rest: shadows fall on plates, never on movers
      let shadowPlaced = false;
      for (const l of live) {
        if (!shadowPlaced && l.layer >= 1) {
          layer.appendChild(shadows);
          shadowPlaced = true;
        }
        layer.appendChild(els.get(l.id).g);
      }
      if (!shadowPlaced) layer.appendChild(shadows);
      order = next;
    }
    return P;
  }
  return { render, destroy: () => [defs, shadows, layer].forEach((n) => n.remove()) };
}

// ---------------------------------------------------------------- text
/** Where a text sits, in % of the stage, and how it is anchored. Tall views keep clear of ad-platform chrome. */
function placeOf(at, tall) {
  if (Array.isArray(at)) return { x: at[0], y: at[1], ax: -50, ay: -50 };
  const P = {
    center: [50, 50, -50, -50],
    top: [50, tall ? 14 : 12, -50, 0],
    bottom: [50, tall ? 74 : 86, -50, -100],
    "lower-left": [tall ? 7 : 5, tall ? 64 : 76, 0, -100],
    "upper-left": [tall ? 7 : 4.6, tall ? 9 : 8, 0, 0],
    subtitle: [50, tall ? 80 : 92, -50, -100],
  }[at ?? "center"] ?? [50, 50, -50, -50];
  return { x: P[0], y: P[1], ax: P[2], ay: P[3] };
}

const DEFAULTS = {
  title: { anim: "rise", by: "word" }, big: { anim: "mask", by: "word" }, stat: { anim: "pop", by: "line" },
  kicker: { anim: "blur", by: "char", stagger: 0.018 }, quote: { anim: "blur", by: "word" }, caption: { anim: "rise", by: "word" },
  lower: { anim: "slide", by: "line" }, subtitle: { anim: "karaoke", by: "word" },
};

function buildText(doc, item, tall) {
  const d0 = DEFAULTS[item.style ?? "title"] ?? DEFAULTS.title;
  const it = { anim: d0.anim, by: d0.by, ...item, style: item.style ?? "title" };
  it.stagger ??= d0.stagger ?? (it.by === "char" ? 0.025 : it.by === "line" ? 0.12 : 0.06);
  it.dur ??= it.anim === "mask" ? 0.7 : it.anim === "type" ? 0.01 : 0.55;
  const el = doc.createElement("div");
  el.className = "iso-text";
  el.dataset.style = it.style;
  const pl = placeOf(it.at ?? (it.style === "subtitle" ? "subtitle" : it.style === "lower" ? "lower-left" : "center"), tall);
  el.style.left = pl.x + "%";
  el.style.top = pl.y + "%";
  el.style.textAlign = it.align ?? (pl.ax === 0 ? "left" : "center");
  el.style.transformOrigin = "center";
  el.dataset.ax = pl.ax;
  el.dataset.ay = pl.ay;
  const emph = new Set((it.emphasis ?? []).map((w) => w.toLowerCase().replace(/[^\p{L}\p{N}%]/gu, "")));
  const units = [];
  const lines = String(it.text).split("\n");
  lines.forEach((line, li) => {
    if (li) el.appendChild(doc.createElement("br"));
    const pieces = it.by === "line" ? [line] : it.by === "char" ? [...line] : line.split(/(\s+)/).filter((x) => x !== "");
    for (const piece of pieces) {
      if (/^\s+$/.test(piece)) {
        el.appendChild(doc.createTextNode(piece));
        continue;
      }
      const u = doc.createElement("span");
      u.className = "u";
      u.textContent = piece;
      const key = piece.toLowerCase().replace(/[^\p{L}\p{N}%]/gu, "");
      const isEm = it.by !== "char" && emph.has(key);
      if (isEm) u.classList.add("em");
      if (it.anim === "mask") {
        const m = doc.createElement("span");
        m.className = "m";
        el.appendChild(m);
        m.appendChild(u);
      } else el.appendChild(u);
      units.push({ u, em: isEm, raw: piece });
    }
  });
  return { it, el, units, pl };
}

function drawText(T, t) {
  const { it, el, units, pl } = T;
  const t1 = it.t1 ?? Infinity;
  const visible = t >= it.t0 - 0.001 && t <= t1 + 0.001;
  if (T.grouped) {
    // a grouped text holds its slot in the column, so its neighbours never jump
    el.style.visibility = visible ? "" : "hidden";
  } else el.style.display = visible ? "" : "none";
  if (!visible) return;
  const exitP = it.exit === "none" || t1 === Infinity ? 0 : prog(t, t1 - 0.35, t1, ease.in);
  const n = units.length;
  const spoken = it.anim === "karaoke" ? clamp((t - it.t0) / Math.max(0.1, t1 - it.t0 - 0.2), 0, 1) * n : 0;
  units.forEach((U, i) => {
    const a = it.t0 + i * it.stagger;
    const p = it.anim === "karaoke" ? prog(t, it.t0, it.t0 + 0.25, ease.out) : prog(t, a, a + it.dur, it.anim === "pop" ? ease.linear : ease.out);
    let op = p, tf = "", fl = "";
    switch (it.anim) {
      case "rise": tf = `translateY(${(1 - p) * 0.55}em)`; break;
      case "blur": fl = `blur(${((1 - p) * 0.35).toFixed(3)}em)`; tf = `translateY(${(1 - p) * 0.2}em)`; break;
      case "mask": op = 1; tf = `translateY(${(1 - p) * 110}%)`; break;
      case "pop": tf = `scale(${mix(0.6, 1, settle(p, 1.7))})`; op = Math.min(1, p * 2.5); break;
      case "slide": tf = `translateX(${(1 - p) * -0.8}em)`; break;
      case "type": op = t >= a ? 1 : 0; break;
      case "karaoke": {
        // everything is readable at once; the word being said takes the accent, the said ones full ink
        const k = clamp(spoken - i, 0, 1);
        U.u.style.color = k > 0 && k < 1 ? "var(--iso-accent-sub)" : "";
        U.u.style.opacity = String(p * (k > 0 ? 1 : 0.62));
        U.u.style.transform = `translateY(${(1 - p) * 0.3}em)`;
        return;
      }
      default: op = 1;
    }
    // the exit: everything leaves together, slightly up
    if (exitP > 0) {
      op *= 1 - exitP;
      if (it.exit === "up") tf += ` translateY(${-exitP * 0.5}em)`;
    }
    U.u.style.opacity = String(op);
    U.u.style.transform = tf;
    U.u.style.filter = fl;
    if (U.em) {
      const h = prog(t, a + it.dur * 0.7, a + it.dur * 0.7 + 0.5, ease.inOut);
      U.u.style.backgroundSize = `${h * 100}% 100%`;
    }
  });
  if (it.count) {
    const c = it.count, k = prog(t, it.t0, it.t0 + (c.dur ?? 1.2), ease.out);
    const v = mix(c.from ?? 0, c.to, k).toFixed(c.decimals ?? 0);
    const txt = String(it.text).replace("{n}", Number(v).toLocaleString(c.locale ?? "id-ID", { minimumFractionDigits: c.decimals ?? 0 }));
    if (units.length === 1 && units[0].u.textContent !== txt) units[0].u.textContent = txt;
  }
  const lineIn = it.style === "lower" || it.style === "subtitle" ? prog(t, it.t0, it.t0 + 0.35, ease.out) * (1 - exitP) : 1;
  el.style.opacity = String(lineIn);
  el.style.transform = T.grouped ? "" : `translate(${pl.ax}%, ${pl.ay}%)`;
}

// ---------------------------------------------------------------- player
const CSS = `
.iso{position:relative;font-family:var(--iso-font);color:var(--iso-caption);-webkit-font-smoothing:antialiased}
.iso-stage{position:relative;overflow:hidden;border-radius:var(--iso-radius,20px);background:linear-gradient(160deg,var(--iso-bg0),var(--iso-bg1))}
.iso-stage[data-backdrop=dots]::before{content:"";position:absolute;inset:0;background-image:radial-gradient(var(--iso-dot) 1px,transparent 1px);background-size:18px 18px;-webkit-mask-image:radial-gradient(ellipse at center,#000 30%,transparent 78%);mask-image:radial-gradient(ellipse at center,#000 30%,transparent 78%)}
.iso-stage[data-backdrop=grid]::before{content:"";position:absolute;inset:0;background-image:linear-gradient(var(--iso-dot) 1px,transparent 1px),linear-gradient(90deg,var(--iso-dot) 1px,transparent 1px);background-size:32px 32px;-webkit-mask-image:radial-gradient(ellipse at center,#000 30%,transparent 80%);mask-image:radial-gradient(ellipse at center,#000 30%,transparent 80%)}
.iso-stage svg{position:absolute;inset:0;width:100%;height:100%;display:block}
.iso-stage svg path{vector-effect:non-scaling-stroke;stroke-linejoin:round}
.iso-cap{position:absolute;left:0;top:0;max-width:62%;padding:4.2% 4.6%;pointer-events:none}
.iso[data-tall] .iso-cap{top:auto;bottom:0;max-width:100%;padding:7%}
.iso-eyebrow{font:500 clamp(9px,1.25cqw,13px)/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--iso-muted)}
.iso-title{margin-top:.45em;font-weight:520;font-size:clamp(15px,3.1cqw,40px);line-height:1.08;letter-spacing:-.025em;text-wrap:balance}
.iso[data-tall] .iso-title{font-size:clamp(18px,6.4cqw,44px)}
.iso-pin{position:absolute;transform:translate(-50%,-100%);white-space:nowrap;border-radius:999px;padding:.28em .7em;font-size:clamp(9px,1.35cqw,14px);font-weight:540;pointer-events:none;background:var(--iso-pin-bg);color:var(--iso-caption);box-shadow:0 0 0 1px var(--iso-pin-ring),0 6px 16px -8px rgba(0,0,0,.35)}
.iso-pin[data-tone=accent]{background:var(--iso-accent);color:#fff;box-shadow:0 8px 20px -8px var(--iso-accent)}
.iso-card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:.8em;padding:8%;pointer-events:none;background:linear-gradient(160deg,var(--iso-bg0),var(--iso-bg1))}
.iso-card img{height:clamp(22px,6cqw,72px);width:auto}
.iso-card h2{margin:0;font-weight:540;font-size:clamp(20px,5cqw,64px);line-height:1.02;letter-spacing:-.035em;text-wrap:balance}
.iso-card p{margin:0;color:var(--iso-muted);font-size:clamp(12px,1.9cqw,22px);text-wrap:balance}
.iso-card .iso-cta{margin-top:.6em;border-radius:999px;padding:.6em 1.2em;background:var(--iso-accent);color:#fff;font-weight:560;font-size:clamp(11px,1.7cqw,20px)}
.iso-curtain{position:absolute;inset:0;pointer-events:none;background:var(--iso-bg0)}
.iso-mark{position:absolute;right:3.2%;bottom:4%;height:clamp(14px,3.2cqw,34px);opacity:.9;pointer-events:none}
.iso-bar{display:flex;align-items:center;gap:12px;margin-top:12px}
.iso-bar button{all:unset;cursor:pointer;width:32px;height:32px;border-radius:999px;display:grid;place-items:center;border:1px solid var(--iso-pin-ring);color:var(--iso-caption)}
.iso-bar input{flex:1;accent-color:var(--iso-accent)}
.iso-chapters{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-top:10px}
.iso-chapters button{all:unset;cursor:pointer;border:1px solid var(--iso-pin-ring);border-radius:10px;padding:8px 10px;font-size:12px;color:var(--iso-muted)}
.iso-chapters button[aria-current=true]{border-color:var(--iso-accent);color:var(--iso-caption)}
.iso-chapters b{display:block;font:500 10px ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase}
.iso[data-frame] *{transition:none!important;animation:none!important}
.iso[data-transparent] .iso-stage{background:none;border-radius:0}
.iso[data-frame] .iso-stage{border-radius:0}
.iso[data-transparent] .iso-stage::before{display:none}
.iso-text{position:absolute;pointer-events:none;width:max-content;max-width:84%;text-wrap:balance;color:var(--iso-caption)}
.iso-group{position:absolute;display:flex;flex-direction:column;align-items:center;gap:.35em;width:max-content;max-width:86%;pointer-events:none}
.iso-group[data-align=left]{align-items:flex-start}
.iso-group .iso-text{position:relative;left:auto!important;top:auto!important;max-width:100%}
.iso-text .u{display:inline-block;white-space:pre;will-change:transform,opacity,filter}
.iso-text .m{display:inline-block;overflow:hidden;vertical-align:bottom;padding-bottom:.08em;margin-bottom:-.08em}
.iso-text .em{color:var(--iso-accent);background-image:linear-gradient(transparent 62%,var(--iso-hl) 62%,var(--iso-hl) 92%,transparent 92%);background-repeat:no-repeat;background-size:0% 100%}
.iso-text[data-style=title]{font-weight:560;font-size:clamp(20px,5.4cqw,72px);line-height:1.02;letter-spacing:-.035em}
.iso-text[data-style=big]{font-weight:600;font-size:clamp(28px,9cqw,132px);line-height:.95;letter-spacing:-.045em}
.iso-text[data-style=stat]{font-weight:600;font-size:clamp(32px,11cqw,160px);line-height:.9;letter-spacing:-.05em;font-variant-numeric:tabular-nums}
.iso-text[data-style=kicker]{font:500 clamp(9px,1.4cqw,16px)/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--iso-muted)}
.iso-text[data-style=quote]{font-weight:460;font-style:italic;font-size:clamp(16px,3.6cqw,46px);line-height:1.15;letter-spacing:-.02em}
.iso-text[data-style=caption]{font-weight:500;font-size:clamp(12px,2.2cqw,26px);line-height:1.25;color:var(--iso-muted)}
.iso-text[data-style=lower]{font-weight:560;font-size:clamp(13px,2.6cqw,32px);line-height:1.15;padding:.55em .9em .55em 1.1em;border-radius:.5em;background:var(--iso-pin-bg);box-shadow:inset .28em 0 0 var(--iso-accent),0 12px 30px -16px rgba(0,0,0,.4)}
.iso-text[data-style=subtitle]{font-weight:560;font-size:clamp(13px,2.7cqw,34px);line-height:1.25;padding:.32em .7em;border-radius:.45em;background:var(--iso-sub-bg);color:var(--iso-sub-fg);text-align:center;max-width:78%}
.iso[data-tall] .iso-text[data-style=subtitle]{font-size:clamp(15px,5.2cqw,40px)}
.iso[data-tall] .iso-text[data-style=title]{font-size:clamp(24px,9cqw,80px)}
.iso[data-tall] .iso-text[data-style=big]{font-size:clamp(30px,12.5cqw,150px)}
.iso[data-tall] .iso-text[data-style=stat]{font-size:clamp(40px,24cqw,220px)}
.iso[data-tall] .iso-text[data-style=quote]{font-size:clamp(18px,6.6cqw,60px)}
.iso[data-tall] .iso-text[data-style=caption]{font-size:clamp(13px,4.6cqw,40px)}
.iso[data-tall] .iso-text[data-style=kicker]{font-size:clamp(10px,3cqw,22px)}
.iso[data-tall] .iso-text[data-style=lower]{font-size:clamp(14px,4.6cqw,40px)}
.iso[data-tall] .iso-card h2{font-size:clamp(22px,8.6cqw,80px)}
.iso[data-tall] .iso-card p{font-size:clamp(13px,4cqw,32px)}
.iso[data-tall] .iso-card .iso-cta{font-size:clamp(12px,3.8cqw,30px)}
.iso[data-tall] .iso-card img{height:clamp(30px,14cqw,120px)}
`;
let cssDone = false;
function injectCss(doc) {
  if (cssDone) return;
  cssDone = true;
  const st = doc.createElement("style");
  st.setAttribute("data-isostory", "");
  st.textContent = CSS;
  doc.head.appendChild(st);
}

/** Mounts a player. Every mode draws the same pure frame; nothing in the picture depends on wall time. */
function mount(el, s, opts = {}) {
  const doc = el.ownerDocument;
  injectCss(doc);
  const params = new URLSearchParams(doc.defaultView.location.search);
  const frameMode = opts.mode === "frame" || params.has("frame");
  const mode = frameMode ? "frame" : opts.mode ?? "autoplay";
  const view = viewOf(params.get("aspect") || opts.aspect || "16:9");
  const b = { ...s.brand, ...(opts.brand ?? {}) };
  const th = theme(params.get("theme") || opts.theme || s.theme || "studio", b);
  s = { ...s, brand: b };

  const root = doc.createElement("div");
  root.className = "iso";
  if (view.h > view.w) root.setAttribute("data-tall", "");
  if (frameMode) root.setAttribute("data-frame", "");
  const transparent = opts.transparent ?? params.has("transparent");
  if (transparent) root.setAttribute("data-transparent", "");
  const dark = th.bg[0].startsWith("#0") || th.bg[0].startsWith("#1");
  Object.entries({
    "--iso-bg0": th.bg[0], "--iso-bg1": th.bg[1], "--iso-caption": th.caption, "--iso-muted": th.muted, "--iso-accent": th.accent,
    "--iso-font": th.font, "--iso-dot": dark ? "rgba(255,255,255,.07)" : "rgba(16,24,40,.08)",
    "--iso-pin-bg": dark ? "rgba(20,26,40,.92)" : "rgba(255,255,255,.94)", "--iso-pin-ring": dark ? "rgba(255,255,255,.14)" : "rgba(16,24,40,.12)",
    "--iso-hl": color.mix(th.accent, dark ? "#000000" : "#ffffff", dark ? 0.55 : 0.72),
    "--iso-sub-bg": "rgba(10,12,18,.72)", "--iso-sub-fg": "#ffffff", "--iso-accent-sub": color.shade(th.accent, 0.45),
  }).forEach(([k, v]) => root.style.setProperty(k, v));

  const stage = doc.createElement("div");
  stage.className = "iso-stage";
  stage.dataset.backdrop = s.backdrop;
  stage.style.aspectRatio = `${view.w} / ${view.h}`;
  stage.style.containerType = "inline-size";
  stage.setAttribute("role", "img");
  stage.setAttribute("aria-label", [s.name, ...s.chapters.map((c) => c.title)].filter(Boolean).join(". "));
  root.appendChild(stage);
  const svg = mk("svg", { viewBox: `0 0 ${view.w} ${view.h}`, "aria-hidden": "true" }, stage);
  const sc = scene(svg, s, view, th);

  const pinEls = new Map();
  const pinBox = doc.createElement("div");
  stage.appendChild(pinBox);
  const cap = doc.createElement("div");
  cap.className = "iso-cap";
  cap.innerHTML = `<div class="iso-eyebrow"></div><div class="iso-title"></div>`;
  stage.appendChild(cap);
  if (b.logo && b.watermark) {
    const m = doc.createElement("img");
    m.className = "iso-mark";
    m.src = b.logo;
    m.alt = "";
    stage.appendChild(m);
  }
  const cards = (s.cards ?? []).map((c) => {
    const d = doc.createElement("div");
    d.className = "iso-card";
    d.innerHTML = `${c.logo && b.logo ? `<img alt="" src="${b.logo}">` : ""}${c.title ? `<h2></h2>` : ""}${c.sub ? `<p></p>` : ""}${c.cta ? `<span class="iso-cta"></span>` : ""}`;
    if (c.title) d.querySelector("h2").textContent = c.title;
    if (c.sub) d.querySelector("p").textContent = c.sub;
    if (c.cta) d.querySelector(".iso-cta").textContent = c.cta;
    stage.appendChild(d);
    return { c, d };
  });
  // text track: story texts + subtitles, built once, drawn from t
  const subs = typeof s.subtitles === "string" ? srt(s.subtitles) : s.subtitles ?? [];
  const textItems = [...(s.texts ?? []), ...subs.map((c) => ({ ...c, style: "subtitle", exit: "fade" }))];
  const texts = textItems.map((it) => buildText(doc, it, view.h > view.w));
  const textBox = doc.createElement("div");
  const groups = new Map();
  texts.forEach((T) => {
    const g = T.it.group;
    if (!g) return textBox.appendChild(T.el);
    let box = groups.get(g);
    if (!box) {
      // the group sits where its first item says; its items flow down from there
      box = doc.createElement("div");
      box.className = "iso-group";
      box.style.left = T.pl.x + "%";
      box.style.top = T.pl.y + "%";
      box.style.transform = `translate(${T.pl.ax}%, ${T.pl.ay}%)`;
      if (T.pl.ax === 0) box.dataset.align = "left";
      groups.set(g, box);
      textBox.appendChild(box);
    }
    T.grouped = true;
    box.appendChild(T.el);
  });
  stage.appendChild(textBox);
  if (opts.captions === false) cap.style.display = "none";
  const curtain = doc.createElement("div");
  curtain.className = "iso-curtain";
  stage.appendChild(curtain);

  let chapterShown = -1, tNow = 0;
  const bar = { scrub: null, chapters: [] };

  function seek(t) {
    tNow = t = clamp(t, 0, s.duration);
    const P = sc.render(t);
    for (const pin of s.pins?.(t, { view }) ?? []) {
      let e = pinEls.get(pin.id);
      if (!e) {
        e = doc.createElement("span");
        e.className = "iso-pin";
        pinBox.appendChild(e);
        pinEls.set(pin.id, e);
      }
      if (e.textContent !== pin.text) e.textContent = pin.text;
      e.dataset.tone = pin.tone ?? "plain";
      const [x, y] = P(...pin.at);
      e.style.left = `${(x / view.w) * 100}%`;
      e.style.top = `${(y / view.h) * 100}%`;
      const o = typeof pin.show === "number" ? pin.show : pin.show ? 1 : 0;
      e.style.opacity = String(o);
      e.style.transform = `translate(-50%,-100%) translateY(${(1 - o) * 4}px)`;
    }
    let c = -1;
    s.chapters.forEach((ch, i) => t >= ch.t && (c = i));
    if (c !== chapterShown) {
      chapterShown = c;
      cap.children[0].textContent = c >= 0 ? s.chapters[c].eyebrow ?? "" : "";
      cap.children[1].textContent = c >= 0 ? s.chapters[c].title ?? "" : "";
      bar.chapters.forEach((btn, i) => btn.setAttribute("aria-current", String(i === c)));
      if (c >= 0 && mode !== "frame") opts.onChapter?.(c, s.chapters[c]);
    }
    if (c >= 0) {
      const ch = s.chapters[c], end = s.chapters[c + 1]?.t ?? s.duration;
      const k = c === 0 && ch.t === 0 ? 1 : prog(t, ch.t + 0.1, ch.t + 0.55, ease.out);
      const out = ch.hold === false ? 1 - prog(t, end - 0.4, end, ease.in) : 1;
      cap.style.opacity = String(k * out);
      cap.style.transform = `translateY(${(1 - k) * 8}px)`;
    } else cap.style.opacity = "0";
    // cards cover the stage (title and end cards); captions hide under them
    let cover = 0;
    for (const { c: card, d } of cards) {
      const o = window_(t, card.t0, card.t1 ?? s.duration + 1, card.fade ?? 0.45);
      d.style.opacity = String(o);
      d.style.transform = `scale(${mix(0.985, 1, o)})`;
      cover = Math.max(cover, o);
    }
    pinBox.style.opacity = String(1 - cover);
    texts.forEach((T) => drawText(T, t));
    curtain.style.opacity = String(clamp(s.curtain?.(t) ?? 0, 0, 1));
    if (bar.scrub) bar.scrub.value = String(t);
    return P;
  }

  let raf = 0, last = 0, playing = opts.autoplay !== false, inView = true, cleanup = [];
  const reduce = doc.defaultView.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (mode === "frame") {
    doc.defaultView.__iso = { duration: s.duration, seek, poster: s.poster, view, ready: true, subtitles: subs, chapters: s.chapters };
    seek(0);
  } else if (mode === "scroll") {
    // the stage is held in place while the reader scrolls through a tall track
    const track = doc.createElement("div");
    track.style.height = opts.track ?? "320vh";
    track.style.position = "relative";
    root.style.position = "sticky";
    root.style.top = opts.stickyTop ?? "8vh";
    track.appendChild(root);
    el.appendChild(track);
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = track.getBoundingClientRect();
        const vh = doc.defaultView.innerHeight;
        seek(clamp(-r.top / Math.max(1, r.height - vh), 0, 1) * (s.duration - 0.01));
      });
    };
    doc.defaultView.addEventListener("scroll", onScroll, { passive: true });
    cleanup.push(() => doc.defaultView.removeEventListener("scroll", onScroll), () => track.remove());
    onScroll();
  } else {
    if (opts.controls !== false) {
      const row = doc.createElement("div");
      row.className = "iso-bar";
      row.innerHTML = `<button type="button" aria-label="Pause">❚❚</button><input type="range" min="0" step="0.01" aria-label="Position">`;
      const [btn, input] = row.children;
      input.max = String(s.duration);
      const sync = () => {
        btn.textContent = playing ? "❚❚" : "▶";
        btn.setAttribute("aria-label", playing ? "Pause" : "Play");
      };
      btn.onclick = () => ((playing = !playing), sync());
      input.oninput = () => ((playing = false), sync(), seek(Number(input.value)));
      bar.scrub = input;
      root.appendChild(row);
      if (s.chapters.length) {
        const list = doc.createElement("div");
        list.className = "iso-chapters";
        s.chapters.forEach((ch) => {
          const bt = doc.createElement("button");
          bt.type = "button";
          bt.innerHTML = `<b></b><span></span>`;
          bt.children[0].textContent = ch.eyebrow ?? "";
          bt.children[1].textContent = ch.title ?? "";
          bt.onclick = () => ((playing = true), sync(), seek(ch.t + 0.01));
          list.appendChild(bt);
          bar.chapters.push(bt);
        });
        root.appendChild(list);
      }
    }
    el.appendChild(root);
    if (reduce) {
      seek(s.poster);
    } else {
      const io = new IntersectionObserver(([e]) => (inView = e.isIntersecting));
      io.observe(stage);
      cleanup.push(() => io.disconnect());
      const tick = (now) => {
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
        last = now;
        if (playing && inView) {
          let t = tNow + dt;
          if (t >= s.duration) t = opts.loop === false ? s.duration : 0;
          seek(t);
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      seek(0);
    }
  }
  if (mode === "frame") el.appendChild(root);

  return {
    seek,
    play: () => (playing = true),
    pause: () => (playing = false),
    duration: s.duration,
    destroy: () => {
      cancelAnimationFrame(raf);
      cleanup.forEach((f) => f());
      sc.destroy();
      root.remove();
    },
  };
}

export const ISO = {
  HL, prog, ease, settle, arc, stagger, mix, clamp, jitter, window: window_, beat, srt, toSrt, toVtt,
  color, theme, themes: BASE_THEMES, story, body, mount, registry, brand, viewOf,
};
