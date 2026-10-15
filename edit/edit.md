# Edit mode (`--edit`): dress up a talking-head video

**Status: in progress.** Edit mode takes a talking-head source video (one person to camera, 9:16, up to about 3 min, Indonesian/English code-mixed) and produces jump cuts, kinetic captions, inserts, camera moves, music and SFX as an edit that Claude opens in Remotion Studio for the person to correct, then renders. **Everything runs locally with no paid APIs.** The one online step is the optional search for openly licensed pictures, icons, 3D models and sound (`assets/find.mjs`), which only uses free public APIs.

This folder holds the parts that are built and tested: the **audio pipeline** (music, SFX, mix), the **four style presets** with reference implementations, the **motion kit** (`motion/`: kinetic type, marks, camera moves, transitions, boards, 3D objects; catalogue in `motion/motion.md`), the **asset finder** and subject cutouts (`assets/`), **person segmentation**, and the recipe for **learning a new reference style** (`reference/measure.sh`). The full `/isostory --edit` flow (edit file, Studio sync) is still being specified. Until it lands, build an edit by hand from the pieces below.

Every path here is relative to this skill's folder. Run the tools from the person's working directory.

## 1. The pipeline (decided so far)

| Step | Tool (local) | Output |
|---|---|---|
| Working copy | ffmpeg: bake rotation, 1080x1920 proxy, 1 s GOP; never touch the source | `proxy.mp4`, `audio.wav` |
| Words | whisper.cpp `ggml-large-v3-turbo` (`-l id`, Silero VAD), then the WhisperX Indonesian wav2vec2 aligner | word timestamps |
| Jump cuts | the transcript decides what goes (fillers, repeats, retakes, pauses ≥ 0.30 s); `silencedetect` decides where the edge lands; pad 0.08 s / 0.12 s; 8 ms fades | cut list (source seconds) |
| Face | MediaPipe Face Landmarker on a 540x960 proxy, smoothed | normalised face box per source frame |
| Stage | Remotion 4.0.535: `<Video>` from `@remotion/media` as a `Series` of `trimBefore` segments | the edit |
| Audio | built **once** by ffmpeg (§4) and played as one file | `mix.wav` |

`edit/cut.py` runs the first three rows:

```bash
python3 -I edit/cut.py scan <source.mov> <work>          # proxy.mp4, voice.wav, source transcript + silences
# read the transcript: note retakes ("oh sorry, ulang ya…") and false starts as source-second ranges
python3 -I edit/cut.py cut <work> --drop 35.0-42.9 --fix loongan=lowongan --hold 1.1   # data.json, voice_cut.wav
bash edit/audio/master.sh <work>/voice_cut.wav <work>/voice_m.wav "highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=80" -14 -2
python3 -I edit/audio/mixer.py --voice <work>/voice_m.wav --out public/mix.wav --event=sfx/whoosh.wav@1.19@-6 …
```

It cuts first and transcribes the cut audio, so word times are edit seconds. Without the WhisperX aligner the times are good to about ±0.1 s, which is enough to anchor captions. Face tracking (MediaPipe) is not in it yet: when the speaker sits still, a fixed focus point (`camStyle({ s, x: 540, y: <face y> })`) is enough.

In zsh, pass a list of `--event=` flags held in a variable as `${=EV}`, because zsh does not split unquoted variables.

The preset compositions read one `data.json`:
`{ fps, durationInFrames, segs: [{ fromF, toF, outF }], words: [{ i, text, start, end }] }`.
`segs` are the kept pieces in source frames, placed at `outF` in the edit; word times are in edit seconds. They also read `face.json`: `[[x, y, size], …]` per source frame, normalised.

## 2. Pick a style preset

Four presets, each measured from reference edits the person supplied. Ask which one, or infer it from the content: a listicle or how-to → `panel`; numbers or an argument → `datapop`; a story or a demo → `podcast`; an opinion or commentary piece (career, money, education, "the system is unfair") → `editorial`.

| Switch | `panel` | `datapop` | `podcast` | `editorial` |
|---|---|---|---|---|
| caption | **one word at a time**, white bold sans, lowercase, between the panel and the inset (chest height when full frame) | **no running captions**; only keywords and numbers as big kinetic type | **phrase box**: 2–5 words, white bold sans on a black rectangle, at ~57 % height | **kinetic stack**: 2–5 short lines in mixed type that build up word by word at chest height (~60 % on the speaker, top third on boards); not every word, the strong lines; one stack per thought, blur-out together |
| layout | dark panel on top (#0b0b0b + gold glow) with a **rounded speaker inset** below (87 % wide, 55–83 % of the height); full frame on bridge lines | full frame; speaker **shrinks into a rounded PiP** under graphics; full-screen white grid **boards** | full frame, dark grade; top-1/3 screen recording + speaker below; white flow diagram | full frame, dark **warm** grade with vignette and grain; **full-frame inserts** replace the speaker: cinematic photos, white paper boards, screenshots, a black retro list |
| type | geometric sans (Plus Jakarta Sans): bold + light italic, gold tracked eyebrow, yellow highlight wipe | tight grotesk (Inter 900): yellow numbers with glow, magenta/yellow highlight bars | condensed caps title (Bebas Neue) white + gold; Poppins caption | black-weight grotesk (Inter Tight 900, tight tracking) for key words in **yellow #F6C81B** or white, bold sans for leads, **serif italic** (Instrument Serif) for tails; black ink on boards; red #E3262B only for marks |
| signature moves | UI cards that land on the word naming them; live counter; rubber stamp; checklist rows lighting up per item; light-cream CTA card | typewriter labels; **count-up numbers**; floating word stack with depth blur; scramble-in; **focus pull** on reveals; neon icons; charts; neon outlined CTA | **zoom-out hook** with the title **behind the speaker's head** (§5); wide/tight crop alternation every ~2.5 s with a slow push-in; B/W flash on punch lines; logo pop above the caption | zoom-out hook; **punch-ins** on punch words; red **hand-drawn ellipse** / strike / arrows; **B/W cutout people and 3D objects on white boards** with diagonal swooshes; count-up numbers; document screenshots that rise into focus over the dimmed speaker and get a highlight; money/paper **rain**; retro ▶ list; light-leak / film-burn / slice / glitch transitions on changes of place |
| inserts / min | 6–8 | 10+ | 3–4 | 8–14 (a third to half of the runtime is inserts) |
| music | continuous lo-fi bed, 80–90 BPM, voice − bed ≈ 13 LU | none | almost dry: voice − bed ≈ 23 LU | not measured yet (delivers at −14.2 LUFS); start from the `panel` bed and check with §7 step 4 |
| SFX | ≤ 1 per 10 s: UI dings, a stamp thump | up to ~6 per 10 s, **each on a visible pop**: dings on numbers/keywords, ticks under count-ups and typewriters, whoosh on transitions, boom on the biggest reveals only | clustered: whooshes on the hook, clicks as diagram cards land, a whoosh + boom on one big transition | not measured yet; a whoosh under each designed transition, a pop on each mark, one boom with the shake |
| cuts | | | | 18–40 hard cuts/min; designed transitions only on a change of place, ≈ 1 per 10 s |
| reference | `presets/Panel.tsx` | `presets/DataPop.tsx` | `presets/Podcast.tsx` | `presets/Editorial.tsx` (kit: `motion/`) |

All four references deliver at −14 LUFS, start speaking at 0.0 s and keep no pause longer than ~0.3 s.

### Reference implementations

`presets/*.tsx` are working Remotion compositions written on the sample clip. **The copy and the word indices (`at(17)`, …) belong to that clip.** Keep the structure, the components (Header, Hi, Card, NotifCard, Stack, BigPop, Typewriter, Scramble, Board, NeonIcon, PhraseBox, LogoPop, Diagram, Inset, camera helpers, and everything in `motion/`) and the timing habits. The motion kit works in any preset: a `LightLeak` or a `Mark` in `panel` is fine. Write new copy and anchor every element to the word that says it.

To run them, use a Remotion 4.0.535 project with `@remotion/media`, `@remotion/paths`, `@remotion/noise`, `@fontsource/plus-jakarta-sans`, `@fontsource/inter`, `@fontsource/inter-tight`, `@fontsource/instrument-serif`, `@fontsource/bebas-neue` and `@fontsource/poppins` (for `Model3D` also `@remotion/three@4.0.535`, `three@0.178.0`, `@react-three/fiber@9.1.0`). Copy `presets/` and `motion/` side by side into `src/` with that edit's `data.json` and `face.json`, register the compositions (1080x1920, 30 fps, `durationInFrames` from `data.json`), and put these in `public/`:
- `proxy.mp4`
- the mix (`panel-mix.wav`, `datapop-mix.wav`, `podcast-mix.wav`)
- `ada-logo.png`-style brand assets
- `matte/fNNN.png` for the podcast hook
- `assets/…` for the editorial inserts (photos, cutouts, `doc.png`, a glTF model), fetched with `assets/find.mjs`; keep `assets/credits.json`

Render: `npx remotion render src/index.ts Panel-Demo out.mp4`. A 40 s edit took 62–113 s on an M2; the 27 s editorial sample took 79 s at `--scale 0.5` (the 3D model is the slow part).

Timing habits that make it read as edited, not generated:
- Every graphic enters **on the word that names it**, ±0.1 s.
- Highlights wipe in 0.15–0.5 s after their line lands.
- Panel sections change on sentence starts.
- At most one big reveal per sentence.
- Nothing moves on a bare jump cut, except the podcast crop alternation.
- Editorial: an insert covers **the words that name it** and leaves on the next thought; the caption stack stays on top across the cut, so the eye never loses the line.

## 3. Music

**Default: generate it locally with ACE-Step 1.5.** MIT code and weights; the model card says generated music may be used commercially. It is the only tested path with near-zero claim risk on TikTok, Reels and Shorts. Never register a generated bed with a distributor or rights service: that is how your own beds come back as claims.

```bash
# one-time (~1.3 GB venv + ~9.4 GB weights on first generation)
git clone --depth 1 https://github.com/ACE-Step/ACE-Step-1.5.git ~/.isostory/ace-step
(cd ~/.isostory/ace-step && uv sync)

# a bed: <secs> <bpm> "<caption>" nolm <seed>   (DiT only; 60 s took 106 s + ~100 s load on an M2)
~/.isostory/ace-step/.venv/bin/python -I edit/audio/gen_ace.py ~/.isostory/ace-step ~/isostory-audio/music/generated \
  44 104 "uplifting modern pop instrumental, warm sustained synth pad chords, bright plucky marimba, steady soft kick, light shaker, lively, full and continuous, no vocals, background music for a tech product video" nolm 21
```

- Ask for **sustained, continuous** material (pads, held chords, a steady kick). Plucks and claps alone vanish under a voice, and what survives the ducking sounds like random clicks. The person heard exactly that and called it "SFX that keep popping up" and "no backsound".
- Set the BPM from the preset (panel 80–90, otherwise 95–110). Generate two seeds and keep the steadier one. Don't name artists or songs in the caption.
- Output: 48 kHz stereo, a real intro and ending, peak −1 dBTP. It lands within 0.5 BPM of the request.
- MusicGen, AudioLDM 2 and Essentia's mood models are **non-commercial**: never use them for published edits.

**Library music, when the person prefers it:** Mixkit first (free commercial use, no attribution, contributors may not register tracks). Pixabay second (no attribution; skip tracks with the Content ID shield icon; keep the licence certificate). The YouTube Audio Library is YouTube-centred and login-gated. Incompetech requires a credit line. Freesound needs an account and a per-sound licence check.

**Folder convention:** one library per person, reused by every edit:

```
~/isostory-audio/            (override: ISOSTORY_AUDIO)
  index.json                 written by audio_index.py; Claude reads this, never the audio
  music/generated/  music/mixkit/  music/pixabay/  music/own/ …
  sfx/pop/  sfx/whoosh/  sfx/ding/  sfx/ticks/  sfx/boom/  sfx/click/ …
  _packs/                    untouched source ZIPs + licences
```

Each track gets a `<file>.license.json` sidecar:
- library track: `{source, url, license, commercial_ok, attribution, content_id}`
- generated bed: `{generator, weights_license, prompt, bpm_requested, seed}`

A track without a sidecar counts as `commercial_ok: unknown`: ask before using it.

**Index and pick:** `python3 -I edit/audio/audio_index.py ~/isostory-audio` writes tempo and key (Essentia), loudness, and mood/genre (LAION CLAP zero-shot), at about 1 s per track. Filter on `license.commercial_ok`, then BPM (treat ×2 and ÷2 as the same tempo), then mood. The CLAP tags are coarse; for generated beds the prompt in the sidecar is the better description.
- Install: `uv venv -p 3.11 ~/.isostory/venv-audio && VIRTUAL_ENV=~/.isostory/venv-audio uv pip install essentia torch transformers librosa soundfile`.

## 4. SFX and the mix

**SFX kit:** `edit/audio/sfx.sh ~/isostory-audio/sfx` synthesises it with ffmpeg alone (no samples, no licences): pop, whoosh (two bands panning L→R), ding, ding-hi, ticks, boom, stamp thump, zip, mouse click. It prints each file's loudness. For more variety, add Kenney CC0 packs (no account, no attribution) or Mixkit SFX.

**SFX rules:**
- **An SFX plays only when something visible happens at that moment** (a card lands, a number pops, a transition).
- Density follows the preset (§2).
- Never on a bare jump cut, never on the key word of a sentence, never louder than the voice, no meme sounds.
- Don't repeat the same whoosh more than ~3 times.
- Target about −22 LUFS momentary for each SFX: gain = −22 − (the loudness `sfx.sh` printed).
- Place the whoosh so its peak (0.38 s in) lands on the frame the insert settles.
- Place the pop on the last character of a reveal.

**Mix:**

```bash
# 1. cut the voice (ticket-05 recipe), then master it: HPF + compressor -> static gain -> limiter
edit/audio/master.sh voice-cut.wav voice.wav "highpass=f=80,acompressor=threshold=-24dB:ratio=3:attack=5:release=80:knee=4" -14 -2
# 2. pre-level the bed: -21 for panel (present), -28 for podcast (almost dry); a 3 dB dip at 2.5 kHz leaves room for the voice
edit/audio/master.sh bed-raw.wav bed.wav "equalizer=f=2500:t=o:w=1.5:g=-3,acompressor=threshold=-20dB:ratio=2:attack=20:release=200" -21 -5
# 3. mix: stereo, ducked bed, SFX events (file@seconds@gain), mastered to -14 LUFS / -1.5 dBTP
python3 -I edit/audio/mixer.py --voice voice.wav --bed bed.wav --out public/mix.wav \
  --event sfx/ding.wav@8.45@3.6 --event sfx/thump.wav@5.83@-2.6
```

Levels the person approved on the sample:
- panel/default bed: about **−27 LUFS under speech** (13 LU below the voice; 19 LU was too quiet on a laptop)
- podcast: about −37 (23 LU below)
- datapop: no bed

## 5. Person segmentation (title behind the head, speaker over a recording)

Apple Vision on macOS needs no model download. In the test it gave clean cutouts of hair and hands at 0.23 s per 1080x1920 frame.

```bash
swiftc -O edit/segment/seg.swift -o ~/.isostory/seg
ffmpeg -i proxy.mp4 -vf "select='between(n,27,161)'" -fps_mode passthrough frames/f%03d.png   # only the frames you need
~/.isostory/seg frames public/matte                                                           # RGBA PNG per frame, person only
```

Layer it as: footage → title → matte, with **the same camera transform on the footage and the matte** (see `Podcast.tsx`). Let the hair cover the bottom of the last title line, not most of it. Segment only the seconds that need it, because the PNGs are large (194 MB for 4.5 s).

## 6. Inserts: finding pictures, icons, 3D models and sound

The motion kit (`motion/motion.md`) needs pictures. Use the person's own asset folder first. When it has nothing for a beat, search openly licensed material:

```bash
node edit/assets/find.mjs search "<english words>" --kind photo|illustration|video|icon|model|hdri|texture|audio [--orient portrait] --out public/assets
# READ public/assets/sheet-<query>.png, then:
node edit/assets/find.mjs get <id> [<id> …] --out public/assets      # file + public/assets/credits.json
swiftc -O edit/assets/cutout.swift -o ~/.isostory/cutout              # once (macOS 14+)
~/.isostory/cutout in.jpg out.png --bw --crop                          # subject only, B/W: for WhiteBoard + Placed, or parallax fg
```

No key: Openverse, Wikimedia Commons, Iconify, Poly Haven. Free keys make photos much better: `PEXELS_API_KEY`, `UNSPLASH_ACCESS_KEY`, `PIXABAY_API_KEY` (Pexels and Pixabay also give stock video). Licences that forbid commercial use or changes are filtered out. Hand over `credits.json` with the edit; CC BY and BY-SA need the credit line in the post. The full rules are at the end of `motion/motion.md`.

## 7. Learning a new reference style

When the person hands in a reference edit (a file or a link to a reel, TikTok or Short), measure it before copying. `edit/reference/measure.sh <out_dir> <url-or-file> …` does steps 1–2 for several clips at once: it downloads links with yt-dlp, writes the cut list, a 1 fps contact sheet, and 24 fps strips around each cluster of cuts (that is where the designed transitions are), and prints cuts per minute. Read every sheet and strip it writes.

1. Hard cuts: `ffmpeg -i ref.mp4 -vf "select='gt(scene,0.25)',showinfo" -an -f null -`. Every visual change: the same with `0.06`.
2. A contact sheet at 1 fps (`fps=1,scale=180:320,tile=8x4`) and 6 fps strips of key moments. Read the layout, caption kind, type and inserts from them.
3. Words: whisper.cpp → words per second, first-word time, pauses.
4. Voice vs background: Demucs `htdemucs --two-stems=vocals` (MIT, local, MPS). Then `python3 -I edit/reference/audio_style.py <stems>/<name> scenes.txt` gives:
   - voice and background LUFS
   - bed level during speech
   - background tempo and key
   - SFX-like events, with which ones fall on cuts
5. `edit/reference/sfx_classify.py <no_vocals.wav> <t…>` labels each event with CLAP (ding, whoosh, click, boom, …). The labels are rough; the counts and times are reliable.
6. Write the result as a preset row (§2): caption kind, layout, type, signature moves, inserts per minute, music level, SFX density.

Copy **behaviours**, never the reference's assets, footage, fonts or music.

## What goes wrong

- **Mono mix.** ffmpeg `amix` with a mono voice first gives a mono file. Remotion plays it dual-mono (+3 LU, render measured −10.8 instead of −14) and the stereo bed collapses. `mixer.py` upmixes the voice and masters the stereo sum.
- **A hung ffmpeg mix.** An `apad` branch that nothing consumes never ends. Pad the sidechain key only when there is a bed.
- **A silent synth.** `bandpass` defaults to `width_type=q`, so `w=900` is a needle. Use `width_type=h`.
- **The bed reads as clicks.** The material was too percussive or too low. See §3.
- **The PiP flies off screen.** Scale with `transformOrigin: 50% 100%` and only a small upward translate.
- **Board vignette too dark.** Keep it at about 0.28 from 65 % out.
- **A marker ellipse that draws only a corner.** An absolutely placed `<svg>` with `width/height: auto` falls back to 300x150. Give it an explicit box (`motion/marks.tsx` does).
- **Captions that read small on a phone.** The editorial key word should span 50–80 % of the width (152 px+ on the 1080 stage); shorten the word rather than shrink it.
- **Editorial on a bright, white-wall clip.** The look wants a dark field behind the type. Grade the footage `contrast(1.12) saturate(.85) brightness(.82) sepia(.18)`, add a vignette to 0.6 and a bottom gradient to 0.45, and put the stack on the chest (about y 1270), not on the wall.
- **Long key lines overflow.** "NOMOR BERAPA?" at 136 px is wider than the stage. Split it into `key` + `tail` ("NOMOR" / "berapa?"); do not shrink it.
- **Empty photo search.** `--orient portrait` with only the no-key sources often returns nothing; search without it and let `Photo` crop (cover + `objectPosition`), or add a Pexels/Unsplash key.
- **Word times drift across long pauses.** whisper.cpp (even with `--dtw`) smears words over a 5 s silence. Cut first (`silencedetect` keeps, retakes out), then transcribe the cut audio with `-ml 1 -sow --dtw large.v3.turbo`: the word times are then already edit seconds.
- **404 on `public/` files in a render.** Remotion does not follow symlinks in `public/`; copy the proxy and assets in.
- **The title hidden behind the head.** Move it up until the hair only touches the last line.
