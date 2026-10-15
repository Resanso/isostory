#!/usr/bin/env node
// Find openly licensed images, icons, 3D models, HDRIs, textures, stock video and sound for an insert,
// look at them on a contact sheet, then fetch the ones you pick with their credit line.
//
//   node find.mjs search "<query>" [--kind photo|illustration|icon|video|model|hdri|texture|audio]
//                 [--sources openverse,commons,pexels,pixabay,unsplash,iconify,polyhaven]
//                 [--n 8] [--orient portrait|landscape|square] [--any-license] [--out assets]
//   node find.mjs get <id> [<id> …] [--out assets]
//
// search writes <out>/candidates.json and <out>/sheet-<query>.png (numbered thumbnails; needs ffmpeg).
// get downloads the full file into <out>/ and appends its credit to <out>/credits.json.
// No key needed: openverse, commons, iconify, polyhaven. Optional keys (free): PEXELS_API_KEY,
// PIXABAY_API_KEY, UNSPLASH_ACCESS_KEY. Sources without a key are skipped silently.
// By default only licences that allow commercial use and modification are kept (CC0, PDM, CC BY, CC BY-SA,
// and the Pexels / Pixabay / Unsplash licences). --any-license drops that filter (then check before use).

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const UA = "isostory-asset-finder/1.0 (https://github.com/Resanso/isostory)";
const argv = process.argv.slice(2);
const cmd = argv[0];
const flag = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : (argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : true); };
const positional = argv.slice(1).filter((a, i, all) => !a.startsWith("--") && !(all[i - 1] || "").startsWith("--"));
const OUT = path.resolve(flag("out", "assets"));
const N = Number(flag("n", 8));
const KIND = flag("kind", "photo");
const ORIENT = flag("orient", "");
const ANY = !!flag("any-license", false);
const env = process.env;

// commercial use + modification allowed: no NC, no ND
const licenceOk = (l) => /cc0|pdm|public domain|^(cc[ -]?)?by(-sa)?\b|pexels|pixabay|unsplash|mit|apache|ofl|isc/i.test(l) && !/\b(nc|nd)\b/i.test(l);
const j = async (url, headers = {}) => {
  const r = await fetch(url, { headers: { "User-Agent": UA, ...headers } });
  if (!r.ok) throw new Error(`${r.status} ${url.split("?")[0]}`);
  return r.json();
};
const orientOf = (w, h) => (!w || !h ? "" : w / h > 1.15 ? "landscape" : h / w > 1.15 ? "portrait" : "square");

// ---------- sources: each returns [{ source, kind, title, thumb, url, ext, w, h, license, creator, page }]
const S = {
  async openverse(q) {
    const audio = KIND === "audio";
    if (!["photo", "illustration", "audio"].includes(KIND)) return [];
    const u = new URL(`https://api.openverse.org/v1/${audio ? "audio" : "images"}/`);
    u.searchParams.set("q", q); u.searchParams.set("page_size", String(Math.min(20, N * 2)));
    if (!ANY) u.searchParams.set("license_type", "commercial,modification");
    if (!audio) u.searchParams.set("category", KIND === "illustration" ? "illustration,digitized_artwork" : "photograph");
    if (!audio && ORIENT) u.searchParams.set("aspect_ratio", ORIENT === "portrait" ? "tall" : ORIENT === "landscape" ? "wide" : "square");
    const d = await j(u);
    return d.results.map((r) => ({ source: "openverse", kind: audio ? "audio" : KIND, title: r.title, thumb: r.thumbnail, url: r.url,
      ext: (r.filetype || path.extname(new URL(r.url).pathname).slice(1) || (audio ? "mp3" : "jpg")).toLowerCase(), w: r.width, h: r.height,
      license: `${r.license} ${r.license_version || ""}`.trim(), creator: r.creator || "unknown", page: r.foreign_landing_url, duration: r.duration }));
  },
  async commons(q) {
    if (!["photo", "illustration"].includes(KIND)) return [];
    const u = new URL("https://commons.wikimedia.org/w/api.php");
    Object.entries({ action: "query", format: "json", generator: "search", gsrnamespace: "6", gsrlimit: String(Math.min(20, N * 2)),
      gsrsearch: `${KIND === "illustration" ? "filetype:drawing" : "filetype:bitmap"} ${q}`, prop: "imageinfo",
      iiprop: "url|size|extmetadata", iiurlwidth: "360" }).forEach(([k, v]) => u.searchParams.set(k, v));
    const d = await j(u);
    return Object.values(d.query?.pages || {}).map((p) => {
      const ii = p.imageinfo[0], m = ii.extmetadata || {};
      const strip = (s) => (s || "").replace(/<[^>]+>/g, "").trim();
      return { source: "commons", kind: KIND, title: p.title.replace(/^File:/, ""), thumb: ii.thumburl, url: ii.url, ext: path.extname(ii.url).slice(1).toLowerCase(),
        w: ii.width, h: ii.height, license: strip(m.LicenseShortName?.value) || "unknown", creator: strip(m.Artist?.value) || "unknown", page: ii.descriptionurl };
    });
  },
  async pexels(q) {
    if (!env.PEXELS_API_KEY || !["photo", "video"].includes(KIND)) return [];
    const video = KIND === "video";
    const u = new URL(video ? "https://api.pexels.com/videos/search" : "https://api.pexels.com/v1/search");
    u.searchParams.set("query", q); u.searchParams.set("per_page", String(N * 2));
    if (ORIENT) u.searchParams.set("orientation", ORIENT);
    const d = await j(u, { Authorization: env.PEXELS_API_KEY });
    if (video) return d.videos.map((v) => {
      const f = v.video_files.filter((x) => x.file_type === "video/mp4").sort((a, b) => Math.abs((a.height || 0) - 1920) - Math.abs((b.height || 0) - 1920))[0];
      return { source: "pexels", kind: "video", title: v.url.split("/").filter(Boolean).pop(), thumb: v.image, url: f?.link, ext: "mp4", w: f?.width, h: f?.height,
        license: "Pexels License", creator: v.user?.name || "unknown", page: v.url, duration: v.duration };
    });
    return d.photos.map((p) => ({ source: "pexels", kind: "photo", title: p.alt || String(p.id), thumb: p.src.medium, url: p.src.original, ext: "jpg", w: p.width, h: p.height,
      license: "Pexels License", creator: p.photographer, page: p.url }));
  },
  async pixabay(q) {
    if (!env.PIXABAY_API_KEY || !["photo", "illustration", "video"].includes(KIND)) return [];
    const video = KIND === "video";
    const u = new URL(video ? "https://pixabay.com/api/videos/" : "https://pixabay.com/api/");
    Object.entries({ key: env.PIXABAY_API_KEY, q, per_page: String(Math.max(3, N * 2)), safesearch: "true" }).forEach(([k, v]) => u.searchParams.set(k, v));
    if (!video) u.searchParams.set("image_type", KIND === "illustration" ? "illustration" : "photo");
    if (!video && ORIENT && ORIENT !== "square") u.searchParams.set("orientation", ORIENT === "portrait" ? "vertical" : "horizontal");
    const d = await j(u);
    return d.hits.map((h) => video
      ? { source: "pixabay", kind: "video", title: h.tags, thumb: h.videos.tiny.thumbnail || h.picture_id && `https://i.vimeocdn.com/video/${h.picture_id}_295x166.jpg`, url: (h.videos.large.url ? h.videos.large : h.videos.medium).url, ext: "mp4",
        w: (h.videos.large.url ? h.videos.large : h.videos.medium).width, h: (h.videos.large.url ? h.videos.large : h.videos.medium).height, license: "Pixabay Content License", creator: h.user, page: h.pageURL, duration: h.duration }
      : { source: "pixabay", kind: KIND, title: h.tags, thumb: h.webformatURL, url: h.largeImageURL, ext: path.extname(h.largeImageURL).slice(1) || "jpg",
        w: h.imageWidth, h: h.imageHeight, license: "Pixabay Content License", creator: h.user, page: h.pageURL });
  },
  async unsplash(q) {
    if (!env.UNSPLASH_ACCESS_KEY || KIND !== "photo") return [];
    const u = new URL("https://api.unsplash.com/search/photos");
    u.searchParams.set("query", q); u.searchParams.set("per_page", String(N * 2));
    if (ORIENT) u.searchParams.set("orientation", ORIENT === "square" ? "squarish" : ORIENT);
    const d = await j(u, { Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}` });
    return d.results.map((p) => ({ source: "unsplash", kind: "photo", title: p.alt_description || p.id, thumb: p.urls.small, url: p.urls.full, ext: "jpg", w: p.width, h: p.height,
      license: "Unsplash License", creator: p.user?.name || "unknown", page: p.links.html, track: p.links.download_location }));
  },
  async iconify(q) {
    if (KIND !== "icon") return [];
    const d = await j(`https://api.iconify.design/search?query=${encodeURIComponent(q)}&limit=${Math.max(32, N * 4)}`);
    const sets = d.collections || {};
    return d.icons.map((id) => {
      const [pfx, name] = id.split(":"); const c = sets[pfx] || {};
      return { source: "iconify", kind: "icon", title: id, thumb: `https://api.iconify.design/${pfx}/${name}.svg?height=256`, url: `https://api.iconify.design/${pfx}/${name}.svg?height=512`, ext: "svg",
        w: 512, h: 512, license: c.license?.spdx || c.license?.title || "unknown", creator: c.author?.name || c.name || pfx, page: `https://icon-sets.iconify.design/${pfx}/${name}/` };
    });
  },
  async polyhaven(q) {
    const t = { model: "models", hdri: "hdris", texture: "textures" }[KIND];
    if (!t) return [];
    const d = await j(`https://api.polyhaven.com/assets?t=${t}`);
    const words = q.toLowerCase().split(/\s+/);
    const score = (id, a) => words.filter((w) => [id, a.name, ...(a.tags || []), ...(a.categories || [])].join(" ").toLowerCase().includes(w)).length;
    return Object.entries(d).map(([id, a]) => ({ id, a, s: score(id, a) })).filter((x) => x.s > 0).sort((x, y) => y.s - x.s).slice(0, N * 2)
      .map(({ id, a }) => ({ source: "polyhaven", kind: KIND, title: a.name, thumb: `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?width=256`, url: `polyhaven:${t}:${id}`,
        ext: KIND === "model" ? "glb" : KIND === "hdri" ? "hdr" : "jpg", w: 0, h: 0, license: "CC0", creator: Object.keys(a.authors || {}).join(", ") || "Poly Haven", page: `https://polyhaven.com/a/${id}` }));
  },
};

const sanitize = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

async function search() {
  const q = positional.join(" ");
  if (!q) throw new Error('usage: find.mjs search "<query>" [--kind …]');
  const names = String(flag("sources", Object.keys(S).join(","))).split(",");
  const got = await Promise.all(names.map(async (n) => {
    try { return await S[n](q); } catch (e) { console.error(`  ${n}: ${e.message}`); return []; }
  }));
  // interleave sources so one source does not fill the sheet
  let all = [];
  for (let i = 0; all.length < N * names.length && got.some((g) => g[i]); i++) for (const g of got) if (g[i]) all.push(g[i]);
  all = all.filter((c) => c.url && (c.thumb || c.kind === "audio"));
  if (!ANY) all = all.filter((c) => licenceOk(c.license));
  if (ORIENT) all = all.filter((c) => !c.w || orientOf(c.w, c.h) === ORIENT || c.kind === "icon");
  all = all.slice(0, Number(flag("max", 18)));

  fs.mkdirSync(OUT, { recursive: true });
  const candFile = path.join(OUT, "candidates.json");
  const prev = fs.existsSync(candFile) ? JSON.parse(fs.readFileSync(candFile, "utf8")) : {};
  const tag = sanitize(q);
  all.forEach((c, i) => { c.id = `${tag}-${i + 1}`; c.query = q; prev[c.id] = c; });
  fs.writeFileSync(candFile, JSON.stringify(prev, null, 2));

  for (const c of all) console.log(`${c.id.padEnd(28)} ${c.source.padEnd(9)} ${(c.w ? `${c.w}x${c.h}` : "").padEnd(10)} ${c.license.padEnd(22)} ${c.title.slice(0, 50)}`);
  if (!all.length) { console.log("no results: try other words (English works best), another --kind, or --any-license"); return; }
  if (flag("no-sheet", false)) return;
  const sheet = await contactSheet(all, path.join(OUT, `sheet-${tag}.png`));
  if (sheet) console.log(`\nsheet: ${sheet}  (numbers match the ids above; Read it before picking)`);
}

async function contactSheet(list, file) {
  const tmp = fs.mkdtempSync(path.join(OUT, ".thumbs-"));
  try {
    const parts = [], labels = [];
    for (const [i, c] of list.entries()) {
      if (c.kind === "audio") continue;
      try {
        const r = await fetch(c.thumb, { headers: { "User-Agent": UA } });
        if (!r.ok) continue;
        const raw = path.join(tmp, `raw${i}${c.ext === "svg" ? ".svg" : ""}`);
        fs.writeFileSync(raw, Buffer.from(await r.arrayBuffer()));
        const png = path.join(tmp, `t${String(i).padStart(3, "0")}.png`);
        // ffmpeg cannot read svg; rasterise icons with the macOS quicklook / rsvg if present, else skip
        let src = raw;
        if (c.ext === "svg") { src = rasteriseSvg(raw, tmp); if (!src) continue; }
        // overlay on a light cell so transparent PNG/SVG icons do not turn black
        execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=0xf2f2f2:s=260x280", "-i", src, "-filter_complex",
          "[1]scale=240:240:force_original_aspect_ratio=decrease[f];[0][f]overlay=(W-w)/2:(H-h)/2+10", "-frames:v", "1", png]);
        parts.push(png); labels.push(i + 1);
      } catch { /* a thumbnail that fails is left out of the sheet */ }
    }
    if (!parts.length) return null;
    const cols = Math.min(6, parts.length), rows = Math.ceil(parts.length / cols);
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-pattern_type", "glob", "-i", path.join(tmp, "t*.png"), "-vf", `tile=${cols}x${rows}:color=0xf2f2f2`, "-frames:v", "1", file]);
    // number each cell (ffmpeg builds often lack drawtext); without Pillow the sheet stays unlabelled, read it row by row
    const py = "import sys;from PIL import Image,ImageDraw;f,c,l=sys.argv[1],int(sys.argv[2]),sys.argv[3].split(',');im=Image.open(f).convert('RGB');d=ImageDraw.Draw(im)\nfor k,n in enumerate(l):\n x,y=(k%c)*260,(k//c)*280;d.rectangle([x,y,x+44,y+22],fill='black');d.text((x+6,y+4),n,fill='white')\nim.save(f)";
    try { execFileSync("python3", ["-I", "-c", py, file, String(cols), labels.join(",")], { stdio: "ignore" }); }
    catch { console.log("(no Pillow: the sheet is unlabelled; cells run left to right, top to bottom, in the order listed)"); }
    return file;
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
function rasteriseSvg(svg, dir) {
  const out = path.join(dir, path.basename(svg, ".svg") + ".png");
  for (const [bin, args] of [["rsvg-convert", ["-w", "240", "-o", out, svg]], ["magick", [svg, "-resize", "240x240", out]], ["qlmanage", ["-t", "-s", "240", "-o", dir, svg]]]) {
    try { execFileSync(bin, args, { stdio: "ignore" }); const ql = svg + ".png"; if (fs.existsSync(ql)) fs.renameSync(ql, out); if (fs.existsSync(out)) return out; } catch { /* try the next one */ }
  }
  return null;
}

async function resolvePolyhaven(url) {
  const [, t, id] = url.split(":");
  const f = await j(`https://api.polyhaven.com/files/${id}`);
  const pick = (o) => o?.["2k"] || o?.["1k"];
  if (t === "models") { const g = pick(f.gltf)?.gltf; return { url: g?.url, include: g?.include || {} }; }
  if (t === "hdris") return { url: pick(f.hdri)?.hdr?.url };
  return { url: pick(f.Diffuse)?.jpg?.url || pick(Object.values(f)[0])?.jpg?.url };
}

async function get() {
  const candFile = path.join(OUT, "candidates.json");
  if (!fs.existsSync(candFile)) throw new Error(`no ${candFile}: run search first`);
  const cands = JSON.parse(fs.readFileSync(candFile, "utf8"));
  const credFile = path.join(OUT, "credits.json");
  const credits = fs.existsSync(credFile) ? JSON.parse(fs.readFileSync(credFile, "utf8")) : [];
  for (const id of positional) {
    const c = cands[id];
    if (!c) { console.error(`unknown id ${id}`); continue; }
    let url = c.url, include = {};
    if (url.startsWith("polyhaven:")) ({ url, include = {} } = await resolvePolyhaven(url));
    if (c.track) fetch(c.track, { headers: { Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}` } }).catch(() => {}); // Unsplash API terms: count the download
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (!r.ok) { console.error(`${id}: ${r.status}`); continue; }
    const ext = (path.extname(new URL(url).pathname).slice(1) || c.ext).toLowerCase();
    // a glTF model keeps its .bin and textures next to it, in its own folder
    const dir = Object.keys(include).length ? path.join(OUT, id) : OUT;
    const file = path.join(dir, Object.keys(include).length ? path.basename(new URL(url).pathname) : `${id}.${ext}`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
    for (const [rel, inc] of Object.entries(include)) {
      const ri = await fetch(inc.url, { headers: { "User-Agent": UA } });
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), Buffer.from(await ri.arrayBuffer()));
    }
    const credit = { id, file: path.relative(process.cwd(), file), title: c.title, creator: c.creator, license: c.license, source: c.source, page: c.page };
    const k = credits.findIndex((x) => x.id === id);
    if (k >= 0) credits[k] = credit; else credits.push(credit);
    console.log(`${file}\n  "${c.title}" by ${c.creator}, ${c.license}, ${c.page}`);
  }
  fs.writeFileSync(credFile, JSON.stringify(credits, null, 2));
  console.log(`credits: ${credFile}`);
}

const run = { search, get }[cmd];
if (!run) { console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 16).map((l) => l.replace(/^\/\/ ?/, "")).join("\n")); process.exit(cmd ? 1 : 0); }
run().catch((e) => { console.error(e.message); process.exit(1); });
