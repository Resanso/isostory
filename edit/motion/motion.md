# Motion kit (`edit/motion/`)

Remotion components and functions for edit mode. Each one is a pure function of `t` (edit seconds), like the presets, so a frame never depends on the frames before it. Import them from a preset or an edit composition (`../motion/…`). They need `@remotion/paths`, `@remotion/noise`, and for `three.tsx` also `@remotion/three`, `three` and `@react-three/fiber` (all open source).

Anchor everything to a word: `at(i)` is when word `i` starts. Nothing lands between words.

## Type (`type.tsx`)

| Piece | What it is | Use when |
|---|---|---|
| `KineticStack` | 2–5 lines in mixed type (`lead` small bold sans, `key` huge black sans, `tail` serif italic, `num`) that build up as they are spoken, then blur out together at `until` | the main caption of the editorial look; one stack per thought, not per sentence |
| `Line.ats` | per-word times inside a line: the line grows like speech | long lead or tail lines (≥ 3 words) |
| `Line.enter` | `rise` (default), `pop` (scale + blur, for one-word punches), `focus` (rack-focus in), `slide`, `type` | `pop` on BUKAN / INTINYA, `focus` on a word that answers a question |
| `Punch` | one big word on its own | turning points ("BUKAN", "BUKTINYA", "DISCLAIMER") |
| `NameStrip` | name in a yellow-outlined box + role bar | the first time the speaker appears |
| `dark` | black ink, no shadow | any stack on a white board |

Sizes (stage 1080×1920): lead 56, key 152, tail 76, num 176. A key word should span 50–80 % of the width; if it does not fit, shorten it, do not shrink it below 120.

## Marks (`marks.tsx`)

`<Mark kind=…>` wraps the words it marks, so nothing is measured.

| kind | look | use on |
|---|---|---|
| `ellipse` | red hand-drawn loop, drawn in 0.42 s | the one word that matters in a stack (a number, a twist) |
| `underline` | marker swipe | a contrast word |
| `highlight` | yellow marker behind (multiply) | a line inside a document |
| `strike` | red line through | the wrong answer ("~~HRD~~") |
| `box` | red bar behind white text | a label ("sama dengan", "DISCLAIMER!") |

`<Arrow>` draws a curved hand-drawn arrow between two points on the stage, from a number to the thing it describes.

## Camera (`camera.ts`)

Compose by multiplying scales and adding offsets, then call `camStyle()` once. Use the same camera on footage and on anything glued to it (a person matte).

| Move | Function | In the reference |
|---|---|---|
| zoom-out hook | `zoomOut(t, 0, 1.45, 0.55)` | first 0.5 s of most reels |
| punch-in | `punch(t, at, until, 1.2–1.35)` | on the punch word, then snap back; never two in a row |
| slow push | `push(t, a, b, 1, 1.04–1.1)` | under every shot and every still |
| Ken Burns | `kenBurns(t, a, b, from, to)` | photos: push + drift toward the subject |
| parallax 2.5D | `parallax()` → `{ bg, fg }` | a photo plus its cutout (`assets/cutout`): the person moves 1.8× the background |
| handheld | `handheld(t, 5)` | boards and stills, so nothing is dead still |
| shake | `shake(t, at, 14)` | the one boom per video |
| rack focus | `rackFocus(t, at)` → blur px | a layer coming in behind the text |
| whip | `whip(t, c)` | see `Between kind="whip"` |

## Transitions (`transitions.tsx`)

Hard cuts are the default (about 70 % of changes in the reference). Use a transition only on a change of place (speaker → board, board → photo), never between two speaker shots, and at most one every ~8 s.

| Transition | Kind | Length | In the reference |
|---|---|---|---|
| `LightLeak` | overlay on a cut | 0.5–0.7 s | warm bloom into a board or out of a doc (the most common one) |
| `FilmBurn` | overlay | 0.5 s | into the black retro list |
| `Flash` | overlay | 2–4 frames | a beat, a punch line; yellow or white |
| `Glitch` | overlay | 6–10 frames | "no signal" / error moments |
| `Between kind="blurzoom"` | blend | 0.35–0.45 s | speaker → document, scene → scene |
| `Between kind="slice"` | blend | 0.35 s | the split-frame cut: B wipes in in bands from the bottom |
| `Between kind="whip"` | blend | 0.25 s | fast change of topic |
| `Between kind="push"` | blend | 0.35 s | doc → doc, list → list |
| `Between kind="dip"` | blend | 0.5 s | into the black terminal board |
| `Grain` | always on | – | 0.06–0.08 on graded footage |

For more presentations (`slide`, `wipe`, `flip`, `clockWipe`, `iris`) Remotion's own `@remotion/transitions` works with `TransitionSeries`; prefer the ones here for the editorial look.

## Inserts (`boards.tsx`, `three.tsx`)

| Insert | What | Assets |
|---|---|---|
| `WhiteBoard` | white vignette paper with soft diagonal swooshes and a handheld drift | – |
| `Placed` | a picture on a board: B/W cutout person, an object, an icon | `assets/cutout --bw --crop`, Iconify SVG |
| `Model3D` | a glTF object turning and dropping in (dice, mortarboard, hourglass) | Poly Haven models via `find.mjs --kind model` |
| `Photo` | full-bleed photo, graded warm/cool/B&W, slow push, darker bottom for captions; `fg` for parallax | Pexels / Unsplash / Openverse photos |
| `DocCard` | a screenshot of an article or AI answer that rises into focus, scrolls, and gets a highlight | a screenshot the person gives, or one Claude takes of a public page |
| `TerminalList` | black retro list with ▶ ◀ on the current row, scanlines, red tape bar | – |
| `LineChart` | graph paper with a line that draws on | – |
| `Rain` | falling sprites with depth blur (banknotes, papers, icons) | a transparent PNG |
| `countTo` | number counting up | – |

## Finding pictures, icons, 3D models and sound (`edit/assets/`)

```bash
node edit/assets/find.mjs search "man working on laptop" --kind photo --orient portrait --out public/assets
# → prints candidates with licence, writes public/assets/sheet-<query>.png. READ the sheet, then:
node edit/assets/find.mjs get man-working-on-laptop-2 --out public/assets   # file + credits.json entry
swiftc -O edit/assets/cutout.swift -o ~/.isostory/cutout                     # once
~/.isostory/cutout public/assets/man-working-on-laptop-2.jpg public/assets/man.png --bw --crop
```

| `--kind` | Sources (no key) | Sources (free key in env) |
|---|---|---|
| `photo` | Openverse, Wikimedia Commons | Pexels `PEXELS_API_KEY`, Unsplash `UNSPLASH_ACCESS_KEY`, Pixabay `PIXABAY_API_KEY` |
| `illustration` | Openverse, Commons | Pixabay |
| `video` (stock B-roll) | – | Pexels, Pixabay |
| `icon` | Iconify (200k+ icons, licence per set) | – |
| `model` / `hdri` / `texture` | Poly Haven (CC0) | – |
| `audio` (SFX) | Openverse | – |

Rules:
- Search in English. Look at the sheet before picking; reject anything that does not read at phone size in 0.5 s.
- Without a key the photo pool is Openverse and Commons: real, but uneven. For cinematic people-at-work shots (the reference look), ask the person for a free Pexels or Unsplash key; it is the biggest quality jump.
- Only licences that allow commercial use and changes are kept (CC0, PDM, CC BY, CC BY-SA, Pexels, Unsplash, Pixabay, MIT, Apache, OFL). `--any-license` drops the filter; then check before use.
- CC BY / BY-SA need a credit: `credits.json` holds the lines. Put them in the caption or description of the post, and say so in the hand-over.
- Never use a real person's photo to stand for someone in the story without saying so in the hand-over (a stranger's face presented as "a fresh graduate who got rejected"). Prefer backs, hands and silhouettes for story people.
- No screenshots of a real article presented with words it does not contain. A `DocCard` shows a real page as it is, or a mock that is clearly a mock.
