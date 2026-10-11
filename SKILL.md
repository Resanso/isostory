---
name: isostory
description: Use when someone wants an animated isometric story — an explainer, a product "how it works", a landing-page motion component, a scroll-driven section, or a video ad with kinetic text and subtitles — or runs /isostory with an idea. Builds one story file on a Hairline-based engine (coloured rounded solids, camera, logo decals, animated text, subtitles, title/end cards) that plays on the web (autoplay, scroll, embeddable component) and renders to MP4/WebM/GIF/ProRes in 16:9, 9:16 and 1:1.
argument-hint: "[idea] [--ad | --component] [--logo path] [--accent #hex]"
---

# isostory: storytelling motion, for the web and for video

You write **one story file**. The engine (`isostory.js`, on the Hairline kernel `kernel.js`), the bench page and the tools are fixed: never edit them to make a story work; change the story.

A story is bodies whose poses are **pure functions of time**, a camera, and an HTML layer (chapters, pins, animated texts, subtitles, title/end cards). Because every frame is `f(t)`, the same file is a looping web component, a scroll-scrubbed section, and a frame-exact video.

Every file named here is in this skill's folder. Run the tools from the person's working directory, by their path in this folder.

## 0. What kind of piece is it?

Ask (or infer from the request) which of these, because it changes the defaults:

| | **Motion component** (web) | **Video ad / explainer video** |
|---|---|---|
| length | 8–20 s loop | 6 s, 15 s, 30 s (platform slots) |
| aspect | 16:9 or the section's box | 9:16 first (Reels/TikTok/Shorts), then 1:1, 16:9 |
| text | chapter lines, pins | hook in the first second, kinetic titles, **subtitles always** (feeds autoplay muted), end card + CTA |
| sound | none | optional track; cut on beats with `beat(n, bpm)` |
| output | `mount()` in the page, `transparent` to sit on the page's own background | `render.mjs` → mp4 (+ srt, poster); `--alpha` for overlays in an editor |

## 1. Brief → storyboard (before any code)

Read `rules.md` first: the story rules (S), motion rules (M), colour rules (C), text rules (T), brand rules (B). Then write the storyboard in the chat as a table and get a yes (skip only if nobody is there to ask; then say which you took):

| t | beat | what moves (bodies, camera) | text on screen | subtitle |
|---|---|---|---|---|

- One idea per beat, 2.5–4 s per beat. 3–5 beats. The last 1.5 s holds still (an end card or a held frame).
- Name the **objects** first. They must be things from the product or the domain (résumés, cards, a board, a phone, a chart), not metaphors (rule S2).
- For an ad: the hook text must be on screen by 0.6 s (rule T1).

## 2. Build

1. Read the index at the top of `isostory.js` (down to the `====` line). It is everything you may call. Read `examples/hiring.js` (component) or `examples/ad.js` (ad), whichever is nearer.
2. Write `<name>.js` in the working directory, shaped like the examples:
   `import { ISO } from "<this folder>/isostory.js"; const { body, prog, … } = ISO; … export default ISO.story({ … });`
   The import line is stripped when the page is built, so its path only matters when the file is imported by an app.
3. Brand: pass the logo and colour at build time (`--logo`, `--accent`) or set `brand` in the story. The logo goes **on an object** as a decal (`decal: "logo"` or `{ href: ISO.brand.logo, w, d, u, v }`), on the end card (`cards: [{ logo: true, … }]`), and/or as a watermark (`brand.watermark: true`). See rule B1–B4.
4. Build the page to look at it: `node build.mjs <name>.js --logo <file> [--accent #hex]` → `isostory-<name>.html` (open it; it has aspect/theme switches and a scroll demo).

## 3. Check (every time, every aspect you will ship)

`node look.mjs <name>.js --logo <file> --aspect 9:16,16:9,1:1`

It writes `isostory-<name>-<aspect>-look.png` (a contact sheet: every chapter, every text's landing, even samples) and prints checks: console, NaN paths, bodies settled outside the frame, text outside the stage, **texts colliding**, the hook (something on screen by 0.6 s), and the end (the last 1.4 s holds). Fix every FAIL and run it again until it exits 0. A "warn frame" is an entrance or a camera move: look at it on the sheet and decide.

Then **read the sheet** and answer, in writing: Does each frame read with no sound? Is there one focal point per frame? Do the colours carry meaning (accent = the thing that matters) rather than decorate? Is the logo legible but not shouting? Fix what fails, then check again. Do not say it is done if you did not look.

## 4. Deliver

- **Web component**: copy `kernel.js` + `isostory.js` + the story into the app and mount it; `embed.md` has the React/Next wrapper, scroll mode, reduced motion and the transparent option.
- **Video**: `node render.mjs <name>.js --logo <file> --aspect 9:16,1:1,16:9 [--audio track.mp3] [--formats mp4,srt,poster]`. `--size` is the short side (1080 default). `--alpha` writes WebM-with-alpha + ProRes 4444 for an editor. Needs ffmpeg.
- Hand over: the files and where they are, the storyboard as built, which checks passed, and anything not verified (no ffmpeg, no browser, an aspect not checked). For ads, remind them the SRT is there for platforms that take caption files.

## 5. Adjust

Edit only the story file, then `look.mjs` again. Timing changes are changes to numbers in the story; do not add timers, CSS animations or `requestAnimationFrame` (rule M1).

## What goes wrong

| If you catch yourself | Do this instead |
|---|---|
| writing `setTimeout`, CSS `@keyframes`, a `transition` for story motion | a pose or text that is a function of `t` (M1) |
| placing two texts with separate `at` percentages | one `group` so they stack (T4); `look.mjs` will flag the collision anyway |
| a camera with fixed `S` | scale by `view.w` (`Math.min(1, view.w / <scene width>)`) so 9:16 pulls back (M6) |
| every body the same white | palette keys with meaning: neutral `paper`/`card`, a tint per category, `accent` only for what matters (C1–C3) |
| a logo pasted in a corner on every frame of a component | the logo as an object in the scene or on the end card (B1) |
| subtitles that repeat the on-screen title word for word | subtitles say the voice line; titles say the idea in 2–5 words (T3) |
| a 9:16 ad whose subtitle sits at the very bottom | the built-in safe area (`subtitle` sits at 80% on tall); keep CTAs above 85% (T5) |
| a long text animated by character | by word for titles, by char only for ≤ 2 short words or kickers (T2) |
| editing the engine because something cannot be expressed | say so to the person; the story is wrong or the request needs an engine change they should approve |
