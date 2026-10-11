#!/usr/bin/env node
/**
 * The look, in one command: builds the story, opens it in frame mode, and
 * writes one contact sheet per aspect (isostory-<name>-<aspect>-look.png):
 * frames at every chapter, every text's landing, and evenly between. Then it
 * prints what can be measured and exits 1 if any check fails:
 *   console  no errors in the page
 *   paths    no NaN in any drawn path
 *   frame    no body leaves the frame by more than 3% of its side (while visible)
 *   text     no text leaves the stage, no two texts overlap at the same instant
 *   hook     something is on screen by 0.6s (ads lose the viewer in the first second)
 *   end      the last 1.5s holds still enough to read (a held frame, an end card)
 *
 *   node look.mjs <story.js> [--aspect 16:9,9:16] [--logo file] [--accent #hex] [--theme name] [--every 1.5]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { assemble, nameOf } from "./build.mjs";
import { launch, openFrames } from "./browser.mjs";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { aspect: { type: "string" }, logo: { type: "string" }, accent: { type: "string" }, theme: { type: "string" }, every: { type: "string", default: "1.5" } },
});
if (!positionals[0]) {
  console.error("usage: node look.mjs <story.js> [--aspect 16:9,9:16,1:1] [--logo file] [--accent #hex] [--theme name]");
  process.exit(2);
}
const code = readFileSync(positionals[0], "utf8");
values.aspect ??= /\baspect:\s*["'`]([\d:]+)/.exec(code)?.[1] ?? "16:9";
const name = nameOf(code);
const html = join(tmpdir(), `isostory-${name}-look.html`);
writeFileSync(html, assemble(code, values));

const browser = await launch();
let failed = 0;
const report = (ok, label, msg) => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label.padEnd(8)} ${msg}`);
};

for (const aspect of values.aspect.split(",")) {
  const { page, stage, info, errors } = await openFrames(browser, html, { aspect, short: 360, theme: values.theme });
  const story = await page.evaluate(() => {
    const S = globalThis.__STORY__;
    return { texts: (S.texts ?? []).map((x) => ({ t0: x.t0, t1: x.t1, text: x.text })), chapters: S.chapters.map((c) => ({ t: c.t, title: c.title })) };
  });
  const D = info.duration;
  const times = new Set();
  for (let t = 0.6; t < D; t += Number(values.every)) times.add(+t.toFixed(2));
  story.chapters.forEach((c) => times.add(+Math.min(D, c.t + 1.2).toFixed(2)));
  story.texts.forEach((x) => times.add(+Math.min(D, x.t0 + 1.0).toFixed(2)));
  times.add(+info.poster.toFixed(2));
  const list = [...times].sort((a, b) => a - b);

  const shots = [];
  const issues = { nan: [], frame: [], frameOnce: [], textOut: [], overlap: [] };
  let lastOut = [];
  for (const t of list) {
    await page.evaluate((t) => __iso.seek(t), t);
    const m = await page.evaluate(() => {
      const st = document.querySelector(".iso-stage").getBoundingClientRect();
      const svg = document.querySelector(".iso-stage svg");
      const nan = [...svg.querySelectorAll("path")].some((p) => (p.getAttribute("d") || "").includes("NaN"));
      const vb = svg.viewBox.baseVal;
      // only settled bodies count: one still fading in or out may come from off frame on purpose
      let out = 0;
      const outIds = [];
      [...svg.querySelectorAll('[data-iso="bodies"] > g')].forEach((g, k) => {
        if (g.style.display === "none" || +(g.getAttribute("opacity") ?? 1) < 0.95) return;
        const b = g.getBBox();
        if (!b.width) return;
        const over = Math.max(vb.x - b.x, b.x + b.width - (vb.x + vb.width), 0) / vb.width + Math.max(vb.y - b.y, b.y + b.height - (vb.y + vb.height), 0) / vb.height;
        if (over > 0.03) outIds.push(g.dataset.id || String(k));
        out = Math.max(out, over);
      });
      const boxes = [...document.querySelectorAll(".iso-text")]
        .filter((e) => { const cs = getComputedStyle(e); return e.style.display !== "none" && cs.visibility !== "hidden" && +cs.opacity > 0.05; })
        .map((e) => ({ r: e.getBoundingClientRect(), text: e.textContent.slice(0, 24) }));
      const textOut = boxes.filter(({ r }) => r.left < st.left - 2 || r.right > st.right + 2 || r.top < st.top - 2 || r.bottom > st.bottom + 2).map((b) => b.text);
      const overlap = [];
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i].r, b = boxes[j].r;
          if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) overlap.push(`${boxes[i].text} × ${boxes[j].text}`);
        }
      const bodies = [...svg.querySelectorAll('[data-iso="bodies"] > g')].filter((g) => g.style.display !== "none").length;
      return { nan, out, outIds, textOut, overlap, visible: bodies + boxes.length };
    });
    if (m.nan) issues.nan.push(t);
    if (m.out > 0.03) {
      // out in two samples running is a composition problem; once is an entrance or a camera move
      const again = m.outIds.some((id) => lastOut.includes(id));
      (again ? issues.frame : issues.frameOnce).push(`${t}s (${(m.out * 100).toFixed(0)}%)`);
    }
    lastOut = m.outIds;
    if (m.textOut.length) issues.textOut.push(`${t}s: ${m.textOut.join(", ")}`);
    if (m.overlap.length) issues.overlap.push(`${t}s: ${m.overlap.join(", ")}`);
    shots.push({ t, png: (await stage.screenshot()).toString("base64"), visible: m.visible });
  }
  // the hook and the end
  await page.evaluate(() => __iso.seek(0.6));
  const hook = await page.evaluate(() => document.querySelectorAll('[data-iso="bodies"] > g:not([style*="none"])').length + [...document.querySelectorAll(".iso-text")].filter((e) => e.style.display !== "none" && getComputedStyle(e).visibility !== "hidden").length);
  const a = await (async () => { await page.evaluate((t) => __iso.seek(t), D - 1.4); return (await stage.screenshot()).toString("base64"); })();
  const b = await (async () => { await page.evaluate((t) => __iso.seek(t), D - 0.05); return (await stage.screenshot()).toString("base64"); })();
  const endDiff = await page.evaluate(async ([a, b]) => {
    const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = "data:image/png;base64," + s; });
    const [A, B] = await Promise.all([load(a), load(b)]);
    const c = document.createElement("canvas"); c.width = A.width; c.height = A.height;
    const x = c.getContext("2d"); x.drawImage(A, 0, 0); const da = x.getImageData(0, 0, c.width, c.height).data;
    x.clearRect(0, 0, c.width, c.height); x.drawImage(B, 0, 0); const db = x.getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 30) n++;
    return n / (da.length / 4);
  }, [a, b]);

  // the sheet, laid out by the browser itself
  const cols = info.view.w >= info.view.h ? 3 : 5;
  const sheet = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await sheet.setContent(`<body style="margin:0;padding:16px;background:#111;font:12px ui-monospace,monospace;color:#bbb">
    <div style="margin-bottom:10px;color:#fff">${name} · ${aspect} · ${D}s · ${list.length} frames</div>
    <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:10px">${shots
      .map((s) => `<figure style="margin:0"><img style="width:100%;display:block;border-radius:6px" src="data:image/png;base64,${s.png}"><figcaption style="margin-top:3px">t=${s.t}s</figcaption></figure>`)
      .join("")}</div></body>`);
  const sheetFile = resolve(`isostory-${name}-${aspect.replace(":", "x")}-look.png`);
  await sheet.screenshot({ path: sheetFile, fullPage: true });
  await sheet.close();

  console.log(`\n${name} · ${aspect} → ${sheetFile}`);
  report(!errors.length, "console", errors.length ? errors.slice(0, 3).join(" | ") : "no errors");
  report(!issues.nan.length, "paths", issues.nan.length ? `NaN at ${issues.nan.join(", ")}s` : "clean");
  report(!issues.frame.length, "frame", issues.frame.length ? `bodies stay outside the frame at ${issues.frame.join(", ")}` : "everything settled stays in frame");
  if (issues.frameOnce.length) console.log(`warn frame    briefly outside (entrance or camera move?) at ${issues.frameOnce.join(", ")}`);
  report(!issues.textOut.length, "text", issues.textOut.length ? `outside the stage: ${issues.textOut.join("; ")}` : "inside the stage");
  report(!issues.overlap.length, "overlap", issues.overlap.length ? issues.overlap.join("; ") : "no texts collide");
  report(hook > 0, "hook", hook > 0 ? "something is on screen by 0.6s" : "the first 0.6s is empty");
  report(endDiff < 0.02, "end", endDiff < 0.02 ? "the last 1.4s holds" : `the last 1.4s still moves (${(endDiff * 100).toFixed(1)}% of pixels change)`);
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
