/**
 * The browser for look.mjs and render.mjs: playwright-core, installed once
 * into the user's cache (ISOSTORY_CACHE moves it), never into the skill or the
 * project. It drives the installed Chrome, or Playwright's Chromium.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export function cacheDir(env = process.env) {
  if (env.ISOSTORY_CACHE) return resolve(env.ISOSTORY_CACHE);
  if (process.platform === "darwin") return join(homedir(), "Library", "Caches", "isostory");
  return join(env.XDG_CACHE_HOME || join(homedir(), ".cache"), "isostory");
}

export async function launch() {
  const dir = cacheDir();
  mkdirSync(dir, { recursive: true });
  const req = createRequire(join(dir, "noop.js"));
  const has = () => { try { return req.resolve("playwright-core"); } catch { return null; } };
  if (!has()) {
    console.log(`installing playwright-core once, into ${dir}`);
    const win = process.platform === "win32";
    const run = spawnSync(win ? "npm.cmd" : "npm", ["install", "playwright-core@1", "--prefix", dir, "--no-audit", "--no-fund", "--loglevel=error"], { encoding: "utf8", shell: win });
    if (run.status !== 0 || !has()) throw new Error(run.stderr?.trim().split("\n")[0] || "npm failed");
  }
  const { chromium } = req("playwright-core");
  const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
  return browser;
}

/** Opens a built page in frame mode at one aspect and pixel size; resolves to { page, stage, info }. */
export async function openFrames(browser, file, { aspect = "16:9", short = 1080, transparent = false, theme } = {}) {
  const [a, b] = aspect.split(":").map(Number);
  const view = a >= b ? { w: (360 * a) / b, h: 360 } : { w: 360, h: (360 * b) / a };
  const cssW = Math.round(view.w * 2); // the stage fills the page width in frame mode
  const scale = short / (Math.min(view.w, view.h) * 2);
  const page = await browser.newPage({ viewport: { width: cssW, height: Math.round(view.h * 2) + 40 }, deviceScaleFactor: scale });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/fonts\.g|ERR_|Failed to load resource/.test(m.text()) && errors.push(m.text()));
  const q = new URLSearchParams({ frame: "", aspect, ...(transparent ? { transparent: "" } : {}), ...(theme ? { theme } : {}) });
  await page.goto(`file://${resolve(file)}?${q}`.replace("frame=&", "frame&"));
  await page.waitForFunction(() => globalThis.__iso?.ready, null, { timeout: 15000 });
  await page.evaluate(() => document.fonts?.ready);
  const info = await page.evaluate(() => ({ duration: __iso.duration, poster: __iso.poster, view: __iso.view, subtitles: __iso.subtitles, chapters: __iso.chapters }));
  const stage = page.locator(".iso-stage").first();
  return { page, stage, info, errors, size: { w: Math.round(view.w * 2 * scale), h: Math.round(view.h * 2 * scale) } };
}
