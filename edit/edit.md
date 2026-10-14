# Edit mode (`--edit`): dress up a talking-head video

**Status: in progress.** Edit mode takes a talking-head source video (one person to camera, 9:16, up to about 3 min, Indonesian/English code-mixed) and produces jump cuts, kinetic captions, inserts, camera moves, music and SFX as an edit that Claude opens in Remotion Studio for the person to correct, then renders. **Everything is local: no paid or cloud APIs.**

This folder holds the parts that are built and tested: the **audio pipeline** (music, SFX, mix), the **three style presets** with reference implementations, **person segmentation**, and the recipe for **learning a new reference style**. The full `/isostory --edit` flow (edit file, Studio sync) is still being specified. Until it lands, build an edit by hand from the pieces below.

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

The preset compositions read one `data.json`:
`{ fps, durationInFrames, segs: [{ fromF, toF, outF }], words: [{ i, text, start, end }] }`.
`segs` are the kept pieces in source frames, placed at `outF` in the edit; word times are in edit seconds. They also read `face.json`: `[[x, y, size], …]` per source frame, normalised.

## 2. Pick a style preset

Three presets, each measured from a reference edit the person supplied. Ask which one, or infer it from the content: a listicle or how-to → `panel`; numbers or an argument → `datapop`; a story or a demo → `podcast`.

| Switch | `panel` | `datapop` | `podcast` |
|---|---|---|---|
| caption | **one word at a time**, white bold sans, lowercase, between the panel and the inset (chest height when full frame) | **no running captions**; only keywords and numbers as big kinetic type | **phrase box**: 2–5 words, white bold sans on a black rectangle, at ~57 % height |
| layout | dark panel on top (#0b0b0b + gold glow) with a **rounded speaker inset** below (87 % wide, 55–83 % of the height); full frame on bridge lines | full frame; speaker **shrinks into a rounded PiP** under graphics; full-screen white grid **boards** | full frame, dark grade; top-1/3 screen recording + speaker below; white flow diagram |
| type | geometric sans (Plus Jakarta Sans): bold + light italic, gold tracked eyebrow, yellow highlight wipe | tight grotesk (Inter 900): yellow numbers with glow, magenta/yellow highlight bars | condensed caps title (Bebas Neue) white + gold; Poppins caption |
| signature moves | UI cards that land on the word naming them; live counter; rubber stamp; checklist rows lighting up per item; light-cream CTA card | typewriter labels; **count-up numbers**; floating word stack with depth blur; scramble-in; **focus pull** on reveals; neon icons; charts; neon outlined CTA | **zoom-out hook** with the title **behind the speaker's head** (§5); wide/tight crop alternation every ~2.5 s with a slow push-in; B/W flash on punch lines; logo pop above the caption |
| inserts / min | 6–8 | 10+ | 3–4 |
| music | continuous lo-fi bed, 80–90 BPM, voice − bed ≈ 13 LU | none | almost dry: voice − bed ≈ 23 LU |
| SFX | ≤ 1 per 10 s: UI dings, a stamp thump | up to ~6 per 10 s, **each on a visible pop**: dings on numbers/keywords, ticks under count-ups and typewriters, whoosh on transitions, boom on the biggest reveals only | clustered: whooshes on the hook, clicks as diagram cards land, a whoosh + boom on one big transition |
| reference | `presets/Panel.tsx` | `presets/DataPop.tsx` | `presets/Podcast.tsx` |

All three references deliver at −14 LUFS, start speaking at 0.0 s and keep no pause longer than ~0.3 s.

### Reference implementations

`presets/*.tsx` are working Remotion compositions written on the sample clip. **The copy and the word indices (`at(17)`, …) belong to that clip.** Keep the structure, the components (Header, Hi, Card, NotifCard, Stack, BigPop, Typewriter, Scramble, Board, NeonIcon, PhraseBox, LogoPop, Diagram, Inset, camera helpers) and the timing habits. Write new copy and anchor every element to the word that says it.

To run them, use a Remotion 4.0.535 project with `@remotion/media`, `@fontsource/plus-jakarta-sans`, `@fontsource/inter`, `@fontsource/bebas-neue` and `@fontsource/poppins`. Copy `presets/` into `src/` with that edit's `data.json` and `face.json`, register the compositions (1080x1920, 30 fps, `durationInFrames` from `data.json`), and put these in `public/`:
- `proxy.mp4`
- the mix (`panel-mix.wav`, `datapop-mix.wav`, `podcast-mix.wav`)
- `ada-logo.png`-style brand assets
- `matte/fNNN.png` for the podcast hook

Render: `npx remotion render src/index.ts Panel-Demo out.mp4`. A 40 s edit took 62–113 s on an M2.

Timing habits that make it read as edited, not generated:
- Every graphic enters **on the word that names it**, ±0.1 s.
- Highlights wipe in 0.15–0.5 s after their line lands.
- Panel sections change on sentence starts.
- At most one big reveal per sentence.
- Nothing moves on a bare jump cut, except the podcast crop alternation.

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

## 6. Learning a new reference style

When the person hands in a reference edit, measure it before copying:

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
- **The title hidden behind the head.** Move it up until the hair only touches the last line.
