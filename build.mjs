#!/usr/bin/env node
/**
 * Puts a story on the bench: one self-contained page, nothing to install.
 *
 *   node build.mjs <story.js> [--logo logo.svg|png] [--accent #1b61ee] [--theme studio] [--out file.html]
 *
 * The page holds kernel.js, isostory.js and the story in one module. --logo is
 * inlined as a data URI (so file:// pages and video renders can use it) and
 * wins over a logo the story names; --accent and --theme likewise.
 */
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const MIME = { ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

export const dataUri = (file) => `data:${MIME[extname(file).toLowerCase()] ?? "application/octet-stream"};base64,${readFileSync(file).toString("base64")}`;

/** The story's name, from its ISO.story({ name: … }) call. */
export const nameOf = (src) => /\bname:\s*["'`]([a-z0-9][a-z0-9-]*)["'`]/i.exec(src)?.[1] ?? "story";

/** The page for a story source. Each part keeps its own block scope, so a story may name what it destructures freely. */
export function assemble(src, { logo, accent, theme } = {}) {
  const kernel = readFileSync(here("./kernel.js"), "utf8").replace(/^export \{ HL \};?\s*$/m, "");
  const iso = readFileSync(here("./isostory.js"), "utf8")
    .replace(/^\s*import[^\n]*\n/gm, "")
    .replace(/^export const ISO =/m, "const ISO =");
  const story = src.replace(/^\s*import[^\n]*\n/gm, "").replace(/^export default\s+/m, "globalThis.__STORY__ = ");
  const brand = [
    logo ? `ISO.brand.logo = ${JSON.stringify(dataUri(logo))};` : "",
    accent ? `ISO.brand.accent = ${JSON.stringify(accent)};` : "",
  ].join("\n");
  const bundle = [
    kernel,
    `{\n${iso}\nglobalThis.ISO = ISO;\n}`,
    brand,
    `{\n${story}\n}`,
    theme ? `globalThis.__STORY__.theme = ${JSON.stringify(theme)};` : "",
  ].join("\n");
  return readFileSync(here("./bench.html"), "utf8")
    .replace("/*TITLE*/", () => nameOf(src))
    .replace("/*BUNDLE*/", () => bundle);
}

const same = (a, b) => (process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b);
if (process.argv[1] && same(realpathSync(process.argv[1]), realpathSync(here("./build.mjs")))) {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { logo: { type: "string" }, accent: { type: "string" }, theme: { type: "string" }, out: { type: "string" } } });
  if (!positionals[0]) {
    console.error("usage: node build.mjs <story.js> [--logo file] [--accent #hex] [--theme name] [--out file.html]");
    process.exit(2);
  }
  const src = readFileSync(positionals[0], "utf8");
  const out = resolve(values.out ?? `isostory-${nameOf(src)}.html`);
  writeFileSync(out, assemble(src, values));
  console.log(out);
}
