// Start an anatomy-mode project: node <skill>/anatomy/new.mjs <dir> [--example laundrybob|courier|washer] [--no-install]
// Copies the template (engine, vendored Anatomy kit, object library, look/render/vo) and one example story.
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const dir = resolve(args.find((a) => !a.startsWith("--")) ?? "anatomy-story");
const ex = args.includes("--example") ? args[args.indexOf("--example") + 1] : "courier";
if (existsSync(join(dir, "src", "story.js"))) throw new Error(`${dir} already has a story; pick another folder`);
mkdirSync(dir, { recursive: true });
cpSync(join(HERE, "template"), dir, { recursive: true, filter: (p) => !p.includes("node_modules") });
const exDir = join(HERE, "examples", ex);
if (!existsSync(exDir)) throw new Error(`no example "${ex}" (have: ${readdirSync(join(HERE, "examples")).join(", ")})`);
cpSync(join(exDir, "story.js"), join(dir, "src", "story.js"));
if (existsSync(join(exDir, "public"))) cpSync(join(exDir, "public"), join(dir, "public"), { recursive: true });
mkdirSync(join(dir, "public"), { recursive: true });
console.log(`story project in ${dir} (from example "${ex}")`);
if (!args.includes("--no-install")) execSync("npm install --no-audit --no-fund", { cwd: dir, stdio: "inherit" });
console.log(`next: cd ${dir} && node look.mjs   (then node render.mjs)`);
