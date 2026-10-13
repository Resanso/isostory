// node render.mjs [--aspect 9:16,1:1,16:9] [--formats mp4,srt,poster,gif] [--name story]
// mp4: H.264 + AAC (the story's audio, if any) · srt: from story.subtitles · poster: PNG at story.poster · gif: 480 px preview.
import path from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia, renderStill } from "@remotion/renderer";
import story from "./src/story.js";

const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt; };
const aspects = arg("--aspect", (story.aspects ?? ["9:16"]).join(",")).split(",");
const formats = arg("--formats", "mp4,srt,poster").split(",");
const name = arg("--name", story.name ?? "story");
const stamp = (t) => {
  const ms = Math.round(t * 1000), p = (n, l = 2) => String(n).padStart(l, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
mkdirSync("out", { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.js") });
const chromiumOptions = { gl: "angle" };
for (const a of aspects) {
  const tag = a.replace(":", "x"), id = "Story" + tag, base = `out/${name}-${tag}`;
  const composition = await selectComposition({ serveUrl, id, chromiumOptions });
  if (formats.includes("mp4") || formats.includes("gif")) {
    let last = -1;
    await renderMedia({ serveUrl, composition, codec: "h264", crf: 18, audioBitrate: "192k", outputLocation: `${base}.mp4`, chromiumOptions, concurrency: 4,
      onProgress: ({ progress }) => { const p = Math.floor(progress * 10); if (p !== last) { last = p; process.stdout.write(`${tag} ${p * 10}%  `); } } });
    console.log(`\n${base}.mp4`);
  }
  if (formats.includes("gif")) {
    const w = composition.width > composition.height ? 640 : 400;
    execFileSync("ffmpeg", ["-y", "-v", "error", "-i", `${base}.mp4`, "-vf", `fps=12,scale=${w}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`, `${base}.gif`]);
    console.log(`${base}.gif`);
  }
  if (formats.includes("srt") && story.subtitles?.length) {
    writeFileSync(`${base}.srt`, story.subtitles.map((c, i) => `${i + 1}\n${stamp(c.t0)} --> ${stamp(c.t1)}\n${c.text}\n`).join("\n"));
    console.log(`${base}.srt`);
  }
  if (formats.includes("poster")) {
    await renderStill({ serveUrl, composition, frame: Math.round((story.poster ?? story.duration - 1.2) * 30), output: `${base}.png`, chromiumOptions });
    console.log(`${base}.png`);
  }
}
