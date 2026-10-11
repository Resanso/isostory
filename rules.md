# isostory rules

Numbers are defaults: change one only for a reason you can state. These rules patch what the parent skills could not do: Hairline (one monochrome figure, no timeline, no text), Anatomy (heavy objects, no timeline), motion-designer (principles without an engine).

## S · story

- **S1 · one idea per beat.** 2.5–4 s each, 3–5 beats. A beat that needs two sentences is two beats.
- **S2 · objects, not metaphors.** Résumés, cards, boards, phones, charts: things the viewer recognises from the product or the domain. A body earns its place by being something; give it the `detail` marks it really has.
- **S3 · change of state is the story.** Every beat changes something visible: a pile becomes a grid, a grid becomes a shortlist, a card becomes a hire. If two frames a beat apart look alike, the beat is empty.
- **S4 · the end holds.** The last 1.4 s holds still: a held frame or an end card. `look.mjs` checks it. Loops for components start from a frame that matches the end, or cut through the end card.
- **S5 · fewer bodies.** 10–40 bodies. Over ~60 the frame turns to noise at 360 px and renders slow.

## M · motion

- **M1 · time is the only clock.** Every pose, text and card is a function of `t`. No timers, CSS animations or transitions for story motion: they break scrubbing, scroll and video.
- **M2 · two curves.** Travel uses `ease.inOut`; landings and lifts use `ease.lift` (.32, .72, 0, 1); text uses `ease.out`. Nothing linear except a scanner or a counter's pace.
- **M3 · stagger by distance.** `delay = stagger(i, 0.04–0.12, origin)`: motion spreads from where the attention is, not down the list order. Per-word text 0.06 s, per-char 0.02–0.03 s.
- **M4 · arcs and landings.** Anything that travels rises on the way (`arc(p, h)`, h ≈ 15–30% of the distance) and lands with a small overshoot (`settle(p)`, amount 1.2–1.7). Don't overshoot what is set down on a surface; overshoot lifts and pops.
- **M5 · anticipation and follow-through.** A press dips before it acts (scale .93 → 1.03 → 1). A group arrives staggered so the last one lands after the first has settled (overlapping action).
- **M6 · the camera serves the focus.** One camera move per beat at most, 0.8–1.4 s, `ease.inOut`. Scale by the view: `S * Math.min(1, view.w / sceneWidth)` so 9:16 pulls back. End on the subject: lean in 10–15% on the final state.
- **M7 · layers, not guesses.** `layer` 0 for ground plates, 1 for what lies on them, 2 for movers, 3 for floaters (scanners, beams). Depth only orders inside a layer.
- **M8 · entrances fade, exits fade.** Bodies enter with `opacity` 0 → 1 over 0.15–0.3 s while moving; nothing pops into existence fully opaque.
- **M9 · reduced motion.** The player shows the poster frame (`poster`, default 1.2 s before the end) under `prefers-reduced-motion`. Make the poster the frame that tells the whole story.

## C · colour

- **C1 · colour carries meaning.** Neutral bodies use `paper`, `card`, `plate`, `lane`. A tint (`blue`, `amber`, `green`, `rose`, `violet`) marks a category. `accent` / `accentSoft` mark **the thing that matters** in this beat, at most one place at a time.
- **C2 · faces are shaded, not flat.** Top = the colour, side = the colour 16% darker (automatic). Override `side` only for materials (a wooden tray, a dark device).
- **C3 · state through tone.** `tone: "hi"` sharpens edges (chosen), `"lo"` fades into the ground (rejected), `"accent"` takes the brand edge (the winner). Don't hide rejected things abruptly: fade them over 0.5–0.7 s.
- **C4 · themes.** `paper` (warm, editorial), `studio` (cool, product), `midnight` (dark, night/tech). `brand.accent` re-tints any of them. For alpha video over footage choose by the footage: dark footage → `midnight` text colours; light footage → `studio`.
- **C5 · backdrops.** `dots` (default), `grid` (ads, tech), `plain`. `transparent` removes it entirely for components that sit on the page's own background.

## T · text

- **T1 · the hook.** Ads: a text or an object on screen by 0.6 s; the promise readable by 1.5 s. Components: the first chapter line is there at t = 0.
- **T2 · animate by the right unit.** Titles by word (`rise`, `mask`); big numbers `pop` + `count`; kickers by char (`blur`); quotes by word (`blur`); lower-thirds by line (`slide`). Never by char for more than ~12 characters.
- **T3 · say it once, two ways.** Titles carry the idea in 2–5 words; subtitles carry the voice line. Emphasise one word per title (`emphasis`), the word the viewer must remember.
- **T4 · stack, don't place.** Texts that share the screen go in one `group`: they stack in a column and keep their slots while hidden, so they never collide in any aspect. `look.mjs` fails on collisions.
- **T5 · safe areas.** 9:16: nothing important above 9% or below 85% (platform chrome); subtitles sit at 80%; lower-thirds at 64%. 16:9: subtitles at 92%, lower-thirds at 76%. Use the named anchors (`top`, `center`, `bottom`, `lower-left`, `upper-left`) before raw percentages.
- **T6 · reading time.** A text stays at least 0.4 s + 0.06 s per character after it lands (a 30-char line: ~2.2 s). Subtitles: max ~42 characters per line, 2 lines.
- **T7 · exits are quiet.** Default exit is a 0.35 s fade; `up` for a scene change; `none` when the next text replaces it in place.

## B · brand

- **B1 · the logo belongs to the scene.** Best: a decal on an object (the board, the device, the box). Then: the end card. A corner watermark only for ads that will be reposted.
- **B2 · one logo per frame.** Never a decal and a watermark in the same frame of a component.
- **B3 · legibility.** A decal at least 24 world units wide; on video the watermark at least 3% of the short side. SVG or a PNG of at least 512 px.
- **B4 · the end card** (`cards`): logo, one line (≤ 7 words), one CTA (≤ 5 words or a short URL). 2–3 s. It covers pins and captions; subtitles may continue under it only if there is still voice.
