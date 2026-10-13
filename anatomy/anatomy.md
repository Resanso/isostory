# Anatomy mode

The default isostory engine draws **rounded solids**: fast to write, good for cards, piles, boards and simple devices. When the story needs **objects people must recognise at a glance** (a washing machine, a cash register, a scooter, a shop-house) built from many small parts, use anatomy mode: the objects are drawn with the [Anatomy](https://github.com/wheresryan22/anatomy) kit (MIT, vendored in `template/src/kit/`): four-tone solids, turned parts, tubes, recesses, screens drawn in a face's plane. A story still renders frame-exact to video; the stage is a small [Remotion](https://www.remotion.dev) project instead of `isostory.js`.

| | default (`isostory.js`) | anatomy mode |
|---|---|---|
| objects | rounded boxes, cylinders, decals | machines built from 40–150 parts: bevels, knurls, screws, glass, hoses |
| output | web component (autoplay/scroll) + video | video (MP4, GIF preview, SRT, poster); embeddable with `@remotion/player` |
| one file | `story.js` | `src/story.js` in a story project |
| cost | minutes per object | 20–60 min per new object, then reusable |

Choose it when a stranger must name the objects with the labels hidden and boxes can't get there (rule S6), or when the person asks for "detailed", "premium", "real" objects. Keep the default engine for abstract flows, data and web components.

## Workflow

1. **Storyboard first**, exactly as in `SKILL.md` §1 (beats, objects, texts, subtitles). Name the objects; check which already exist in the library below.
2. **Start a project**: `node <skill>/anatomy/new.mjs <dir> --example <laundrybob|courier|washer>` copies the template (engine, kit, object library, tools) and the nearest example as `src/story.js`, and runs `npm install`.
3. **Build missing objects** in `src/objects/` (see "Objects"). Draw each one alone first (put it in a one-scene story or a test sheet) and look at it at 2×: it must read as the real thing.
4. **Write the scenes** in `src/story.js` (see "Story file").
5. **Check**: `node look.mjs [--aspect 9:16,1:1,16:9] [--at 1.2,4.5]` → `out/look-<aspect>.png` + console errors. Read every sheet: nothing touches a title or a subtitle, one focal point per frame, each frame reads with no sound. Fix and look again.
6. **Voice-over** (optional): `ELEVENLABS_API_KEY=… node vo.mjs <voiceId>` → `public/voiceover.mp3`, one clip per subtitle window (or `story.voice` lines); it speeds a clip up to 1.15× at most and tells you which lines to shorten. Set `audio: "voiceover.mp3"`.
7. **Render**: `node render.mjs [--aspect …] [--formats mp4,gif,srt,poster]` → `out/<name>-<aspect>.*`.

## Story file

```js
import { basePlate } from "./engine/lib.js";
import { washer, washerFrame } from "./objects/washer.js";
import { prog, mix, ease, settle } from "./engine/ease.js";

const PLATE = basePlate({ x: -70, y: -50, w: 150, d: 110, r: 8 });   // built once: static SVG strings
const W = washer("hero", { towels: true, lcd: "0:09" });

function hero(t) {                                                      // a scene: a pure function of t
  return {
    items: [
      { o: [0, 0, 0], svg: PLATE, key: -1e9 },                          // o: world origin; key: force the paint order
      { o: [-8, -10, 0], svg: washerFrame(W, t * 200, "0:05"), opacity: prog(t, 0.1, 0.3) },
    ],
    overlay: "",                                                        // optional SVG in screen space (links, trails)
    cam: { c: [0, 0, 60], w: 205, h: 215 },                             // centre (world) + the size that must fit
  };
}

export default {
  name: "washer", duration: 10, aspects: ["1:1"],
  brand: { name: "LaundryBob", accent: "#0ea5c6", logo: "logo.svg" },   // logo/audio live in public/
  scenes: [{ from: 0, to: 10.5, build: hero }],                         // crossfaded at their edges
  texts: [{ t0: 0.4, t1: 6.8, text: "Every wash,\non the clock.", style: "title", emphasis: ["clock."] }],
  subtitles: [], captions: false,                                       // ads: subtitles always (rule T1)
  card: { t0: 26.2, title: "…", sub: "…", cta: "…" },                   // optional end card
  audio: "voiceover.mp3", voice: [/* spoken lines, same timing */], language: "id", voiceId: "…",
  poster: 8.5,
};
```

- **Items** are sorted far → near by the depth of `o` (or `key`). An object resting on another gets a higher `o[2]`, so it sorts after it. Ground plates take `key: -1e9`, things that must float over everything (a GPS pin) a large key.
- **Moving** an object is moving `o`. Changing its **shape** (a drawer opening, a scooter turning, a screen's content) means calling its builder again with new arguments in `build(t)`: builders are cheap. Build static objects once at module level.
- **`scale`** on an item scales it about its origin (a phone that must read next to a building). **`dim`** 0..1 greys an item out (rejected, old, broken).
- **Camera**: `cam.c` is centred inside the safe band (titles above, subtitles below, per aspect); `w`/`h` are kit units that must fit. Lean in by shrinking `w`/`h` over 0.8–1.4 s (rule M6). If an object touches a title in one aspect, raise `h` (or `c[2]`); don't move the text.
- Every rule in `rules.md` still holds: beats, arcs and settles (`settle`, `arc`), entrances that fade, one accent, text by word, the held end.

## Objects

The library (`src/objects/`), all built at the origin with the front facing +y, in one shared projection (`engine/lib.js`: azimuth 52°, elevation 30°, 1 unit ≈ 1 px of the real thing):

| file | builders |
|---|---|
| `washer.js` | `washer(id, { towels, hose, lcd })`, `washerFrame(W, angle, lcd)`: front-loader with drawer, LCD, knurled knob, door ring, glass, a drum that turns, optional drain hose and towels |
| `props.js` | `counter()`, `register(id, open, amount)`, `receipt()`, `bill()`, `bag(tint, tagged)`, `phone(id, screen, { dim })` + `oldScreen()`, `customerScreen(wa, label)`, `tablet(id, screen)` + `dashboard(grow, live, gps)`, `ironBoard()`, `iron()`, `rack()`, `pin(pulse)` |
| `city.js` | `ruko(id, { sign, tint })` (shop-house), `block(w, d, h)`, `tree(h)`, `scooter(heading, wheelTurn)` |

To make a new object, read the Anatomy skill's `references/craft.md` and `kit.md` (install it with `npx skills add wheresryan22/anatomy`), then follow the library's patterns:

- **A real object from parts.** Base, structure, mechanism, controls, the subject; every part sits on another part. Bevels 0.4–1.6, screws as 0.4–0.5 dots, seams with `k.sideSeam` passed as `inner`, knurls with `G.ribsOf(…, { fade, seams: true })`.
- **Tones, not colours.** Structure `mid`, base `lo`, subject `hi`; colour only for things that are coloured (laundry, money, an awning), through a tint class in `engine/style.js` (`tint("ax-x", top, shade0…3, hi, lo, faint)`), so four-tone shading still works.
- **Things on faces** (screens, doors, displays) are drawn in the face's plane: `onFace(y, svg)` / `planeOf(y)`, with `recess()` for a sunken window. A part that turns in that plane (a drum) is its own layer rotated about its centre, clipped by the window.
- **Unique ids.** Clip paths take the object's `id`; give every instance its own.
- **Turned and tilted parts** use `G.disc`, `G.ringBand`, `G.solidOf`, `G.prismOf` with a frame along any axis; balls with `G.sphereOf`; hoses with `tubePieces` from `kit/tube.mjs`.
- `ringBand` fills its whole outer disc: cut its hole with an even-odd clip (see the washer door) when something must show through.

## What goes wrong

| If you catch yourself | Do this instead |
|---|---|
| passing the story to a component as props | import it (`engine/Stage.jsx` does): Remotion serialises props and drops the scene functions |
| tuning one aspect's camera until it fits | widen `cam.h`/`cam.w`; `viewBoxOf` fits every aspect into its safe band |
| an object that is one big box with a colour | break it into parts, add the details the real one has (rule S6) |
| text drawn on a body that isn't a screen | at most one engraved label per object (`k.faceTextSvg`); words belong to the titles |
| a moving object hidden behind a static one at the key moment | move the static one back (smaller y) or the path forward; check the frame on the sheet |
