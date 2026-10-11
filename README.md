# isostory

A Claude Code skill for storytelling motion: isometric, coloured, branded stories that play on the web (autoplay, scroll-scrubbed, embeddable component) and render frame-exact to video (MP4, WebM, GIF, ProRes 4444 with alpha) in 16:9, 9:16 and 1:1 — with kinetic text, karaoke subtitles (+ SRT/VTT), logo decals and end cards.

Built on the [Hairline](https://github.com/lucasmarkes/hairline) kernel (MIT).

## Install

```sh
# into Claude Code's user skills
git clone https://github.com/Resanso/isostory ~/.claude/skills/isostory
# or, with the skills CLI
npx skills add Resanso/isostory
```

Then in Claude Code: `/isostory a 15s ad for … --logo ./logo.svg --accent #1b61ee`.

## Tools (run from your project folder)

| command | does |
|---|---|
| `node <skill>/build.mjs story.js --logo logo.svg` | a self-contained page with aspect/theme switches and a scroll demo |
| `node <skill>/look.mjs story.js --aspect 9:16,16:9,1:1` | contact sheets + checks (NaN, frame, text collisions, hook, held end) |
| `node <skill>/render.mjs story.js --aspect 9:16 --formats mp4,srt,poster` | video; `--alpha` for WebM-alpha + ProRes 4444; `--audio track.mp3` |

Needs Node 18+, and ffmpeg for `render.mjs`. `look`/`render` install `playwright-core` once into your user cache and drive your Chrome.

## Files

- `SKILL.md` — the workflow Claude follows
- `rules.md` — story, motion, colour, text and brand rules
- `isostory.js` — engine + player (API index at the top)
- `kernel.js` — Hairline kernel
- `examples/hiring.js` (motion component), `examples/ad.js` (15 s ad)
- `embed.md` — React/Next and plain-HTML embedding
