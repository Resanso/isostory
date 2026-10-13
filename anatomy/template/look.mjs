// Contact sheet per aspect: node look.mjs [--aspect 9:16,1:1,16:9] [--at 0.6,2.4,...]
// Default moments: each scene shortly after it lands and before it leaves, plus the end card.
// Prints browser errors. Read the PNG: does every frame read with no sound, and does nothing touch the titles?
import path from "node:path";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderStill } from "@remotion/renderer";
import story from "./src/story.js";

const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt; };
const aspects = arg("--aspect", (story.aspects ?? ["9:16"]).join(",")).split(",");
const secs = arg("--at", null)?.split(",").map(Number) ??
  [...new Set([...story.scenes.flatMap((s) => [s.from + 0.8, (s.from + s.to) / 2, Math.min(s.to, story.duration) - 0.5]),
    ...(story.texts ?? []).map((x) => x.t0 + 0.9), ...(story.card ? [story.duration - 0.6] : [])]
    .map((v) => Math.round(Math.min(v, story.duration - 0.05) * 10) / 10))].sort((x, y) => x - y);
mkdirSync("out/frames", { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.js") });
const chromiumOptions = { gl: "angle" };
let errors = 0;
for (const a of aspects) {
  const id = "Story" + a.replace(":", "x");
  const comp = await selectComposition({ serveUrl, id, chromiumOptions });
  const files = [];
  for (const s of secs) {
    const f = `out/frames/${id}-${String(s).replace(".", "_")}.png`;
    await renderStill({ serveUrl, composition: comp, frame: Math.min(comp.durationInFrames - 1, Math.round(s * 30)), output: f, chromiumOptions,
      onBrowserLog: (l) => { if (l.type === "error") { errors++; console.log("  console:", l.text); } } });
    files.push(f);
  }
  const wide = comp.width > comp.height, cols = wide ? 3 : 5, w = wide ? 640 : 360, h = Math.round((w * comp.height) / comp.width);
  const layout = files.map((_, i) => `${(i % cols) * w}_${Math.floor(i / cols) * h}`).join("|");
  if (files.length === 1) execFileSync("ffmpeg", ["-y", "-v", "error", "-i", files[0], "-vf", `scale=${w}:-1`, `out/look-${a.replace(":", "x")}.png`]);
  else execFileSync("ffmpeg", ["-y", "-v", "error", ...files.flatMap((f) => ["-i", f]), "-filter_complex",
    `${files.map((_, i) => `[${i}:v]scale=${w}:-1[v${i}]`).join(";")};${files.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${files.length}:layout=${layout}:fill=0x222222`,
    `out/look-${a.replace(":", "x")}.png`]);
  console.log(`out/look-${a.replace(":", "x")}.png  (${secs.join(", ")} s)`);
}
console.log(errors ? `FAIL ${errors} browser error(s)` : "ok   console clean");
process.exitCode = errors ? 1 : 0;
