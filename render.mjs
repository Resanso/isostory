#!/usr/bin/env node
/**
 * Renders a story to video, frame by frame: every frame is the story seeked
 * to f / fps, so the result never depends on how fast the machine is.
 *
 *   node render.mjs <story.js | built.html> [--aspect 16:9,9:16,1:1] [--size 1080] [--fps 30]
 *        [--formats mp4,webm,gif,poster,srt,vtt] [--alpha] [--audio track.mp3] [--range 0:6]
 *        [--logo file] [--accent #hex] [--theme name] [--out dir]
 *
 * --size is the short side in pixels (1080 → 1920×1080, 1080×1920, 1080×1080).
 * --alpha drops the backdrop and writes WebM (VP9 with alpha) and ProRes 4444
 * .mov, for laying the motion over footage in an editor.
 * --audio is muxed into mp4/webm, cut to the story's length.
 * Needs ffmpeg on the PATH.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { assemble, nameOf } from "./build.mjs";
import { launch, openFrames } from "./browser.mjs";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    aspect: { type: "string" }, size: { type: "string", default: "1080" }, fps: { type: "string", default: "30" },
    formats: { type: "string" }, alpha: { type: "boolean" }, audio: { type: "string" }, range: { type: "string" },
    logo: { type: "string" }, accent: { type: "string" }, theme: { type: "string" }, out: { type: "string", default: "." },
  },
});
const src = positionals[0];
if (!src) {
  console.error("usage: node render.mjs <story.js | built.html> [--aspect 16:9,9:16] [--size 1080] [--fps 30] [--formats mp4,webm,gif,poster,srt] [--alpha] [--audio file]");
  process.exit(2);
}
if (spawnSync("ffmpeg", ["-version"]).status !== 0) {
  console.error("render: ffmpeg is not on the PATH (macOS: brew install ffmpeg)");
  process.exit(2);
}

const fps = Number(values.fps), short = Number(values.size);
if (!values.aspect) values.aspect = (src.endsWith(".js") ? /\baspect:\s*["'`]([\d:]+)/.exec(readFileSync(src, "utf8"))?.[1] : null) ?? "16:9";
const formats = (values.formats ?? (values.alpha ? "webm,mov,poster" : "mp4,poster,srt")).split(",");
const outDir = resolve(values.out);
mkdirSync(outDir, { recursive: true });

let html = src;
if (src.endsWith(".js")) {
  const code = readFileSync(src, "utf8");
  html = join(tmpdir(), `isostory-${nameOf(code)}-${process.pid}.html`);
  writeFileSync(html, assemble(code, values));
}
const name = src.endsWith(".js") ? nameOf(readFileSync(src, "utf8")) : basename(src, ".html").replace(/^isostory-/, "");
const ff = (args) => {
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr.trim().split("\n").slice(-2).join(" "));
};

const browser = await launch();
for (const aspect of values.aspect.split(",")) {
  const tag = `${name}-${aspect.replace(":", "x")}`;
  const { page, stage, info, errors, size } = await openFrames(browser, html, { aspect, short, transparent: values.alpha, theme: values.theme });
  const [a, b] = (values.range ?? `0:${info.duration}`).split(":").map(Number);
  const n = Math.round((b - a) * fps);
  const dir = join(tmpdir(), `isostory-frames-${tag}-${process.pid}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const t0 = Date.now();
  for (let f = 0; f < n; f++) {
    await page.evaluate((t) => __iso.seek(t), a + f / fps);
    await stage.screenshot({ path: join(dir, `f${String(f).padStart(5, "0")}.png`), omitBackground: !!values.alpha });
    if (f % fps === 0) process.stdout.write(`\r${tag}: frame ${f}/${n}`);
  }
  process.stdout.write(`\r${tag}: ${n} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
  if (errors.length) console.warn(`  console errors: ${errors.slice(0, 3).join(" | ")}`);
  const input = ["-framerate", String(fps), "-i", join(dir, "f%05d.png")];
  const even = `scale=trunc(iw/2)*2:trunc(ih/2)*2`;
  const audio = values.audio ? ["-i", resolve(values.audio), "-shortest"] : [];
  const audioCodec = (c) => (values.audio ? ["-c:a", c, "-b:a", "192k"] : []);
  const wrote = [];
  for (const fmt of formats) {
    const file = join(outDir, `${tag}.${fmt === "poster" ? "png" : fmt}`);
    if (fmt === "mp4") ff([...input, ...audio, "-vf", `${even},format=yuv420p`, "-c:v", "libx264", "-crf", "18", "-preset", "slow", ...audioCodec("aac"), "-movflags", "+faststart", file]);
    else if (fmt === "webm") ff([...input, ...audio, "-vf", values.alpha ? `${even},format=yuva420p` : even, "-c:v", "libvpx-vp9", "-crf", "30", "-b:v", "0", ...(values.alpha ? ["-auto-alt-ref", "0"] : []), ...audioCodec("libopus"), file]);
    else if (fmt === "mov") ff([...input, "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", file]);
    else if (fmt === "gif") ff([...input, "-vf", `fps=15,scale=min(960\\,iw):-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`, file]);
    else if (fmt === "poster") {
      await page.evaluate((t) => __iso.seek(t), info.poster);
      await stage.screenshot({ path: file, omitBackground: !!values.alpha });
    } else if (fmt === "srt" || fmt === "vtt") {
      if (!info.subtitles?.length) continue;
      const subs = await page.evaluate((k) => ISO[k](__iso.subtitles), fmt === "srt" ? "toSrt" : "toVtt");
      writeFileSync(file, subs);
    } else continue;
    wrote.push(file);
  }
  rmSync(dir, { recursive: true, force: true });
  await page.close();
  console.log(`  ${size.w}×${size.h} @${fps}fps → ${wrote.map((f) => basename(f)).join(", ")}`);
}
await browser.close();
console.log(`written to ${outDir}`);
