"""Edit mode, steps 1-3: working copy, jump cuts, word times -> data.json for the preset compositions.

  python3 -I cut.py scan <source.mov> <work_dir>
      proxy.mp4 (1080x1920, 30 fps, 1 s GOP, rotation baked), voice.wav (48 k mono), audio16.wav,
      and a first transcript of the SOURCE with times, so you can find retakes and fillers to drop.
  python3 -I cut.py cut <work_dir> [--drop 35.0-42.9 ...] [--fix loongan=lowongan ...] [--hold 1.1]
      keeps the speech (silencedetect), removes the --drop ranges (source seconds), pads 0.08/0.12 s,
      8 ms fades, writes voice_cut.wav, then transcribes the CUT audio, so word times are already edit
      seconds (whisper smears words across long pauses in the source). Writes data.json:
      { fps, durationInFrames, segs: [{ fromF, toF, outF }], words: [{ i, text, start, end }] }.
      --hold extends the last segment so the end card has a still beat (source must have the frames).

Needs ffmpeg and whisper-cli (brew install whisper-cpp). The model is fetched once to ~/.isostory/models.
"""
import json, os, re, subprocess, sys, urllib.request

FPS = 30
MODEL = os.path.expanduser("~/.isostory/models/ggml-large-v3-turbo-q5_0.bin")
MODEL_URL = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin"


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, capture_output=True, text=True, **kw)


def model():
    if not os.path.exists(MODEL):
        os.makedirs(os.path.dirname(MODEL), exist_ok=True)
        print(f"downloading {os.path.basename(MODEL)} (~550 MB) ...", flush=True)
        urllib.request.urlretrieve(MODEL_URL, MODEL + ".part")
        os.rename(MODEL + ".part", MODEL)
    return MODEL


def whisper(wav, out_base, words=False, lang="id"):
    cmd = ["whisper-cli", "-m", model(), "-f", wav, "-l", lang, "-ojf", "-of", out_base, "-np", "--dtw", "large.v3.turbo"]
    if words:
        cmd += ["-ml", "1", "-sow"]
    run(cmd)
    return json.load(open(out_base + ".json"))["transcription"]


def duration(path):
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).stdout)


def scan(src, work):
    os.makedirs(work, exist_ok=True)
    p = lambda f: os.path.join(work, f)
    # ffmpeg applies the rotation side data by default, so a portrait iPhone clip comes out upright
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,format=yuv420p",
         "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-g", "30", "-an", p("proxy.mp4")])
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-vn", "-ac", "1", "-ar", "48000", p("voice.wav")])
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-vn", "-ac", "1", "-ar", "16000", p("audio16.wav")])
    segs = whisper(p("audio16.wav"), p("source_words"))
    print(f"source {duration(p('voice.wav')):.1f} s. Transcript (segment times are rough; use them to find retakes):")
    for s in segs:
        print(f"  {s['offsets']['from'] / 1000:7.2f}  {s['text'].strip()}")
    print("\nsilences (where cut edges can land):")
    print("  " + " ".join(f"{a:.2f}-{b:.2f}" for a, b in silences(p("audio16.wav"))))


def silences(wav, db=-35, d=0.25):
    out = subprocess.run(["ffmpeg", "-hide_banner", "-i", wav, "-af", f"silencedetect=n={db}dB:d={d}", "-f", "null", "-"], capture_output=True, text=True).stderr
    ss = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", out)]
    se = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", out)]
    return list(zip(ss, se))


def cut(work, drops, fixes, hold):
    p = lambda f: os.path.join(work, f)
    dur = duration(p("voice.wav"))
    speech, prev = [], 0.0
    for a, b in silences(p("audio16.wav")):
        if a > prev:
            speech.append([prev, a])
        prev = b
    if prev < dur:
        speech.append([prev, dur])
    # a speech run is dropped when most of it falls inside a --drop range
    def dropped(a, b):
        return any(min(b, y) - max(a, x) > 0.5 * (b - a) for x, y in drops)
    speech = [s for s in speech if s[1] - s[0] > 0.05 and not dropped(*s)]
    keep = []
    for a, b in ([max(0, a - 0.08), min(dur, b + 0.12)] for a, b in speech):
        if keep and a - keep[-1][1] < 0.05:
            keep[-1][1] = b
        else:
            keep.append([a, b])
    segs, out_f = [], 0
    for a, b in keep:
        fa, fb = round(a * FPS), round(b * FPS)
        segs.append({"fromF": fa, "toF": fb, "outF": out_f})
        out_f += fb - fa
    flt = []
    for i, s in enumerate(segs):
        a, b = s["fromF"] / FPS, s["toF"] / FPS
        flt.append(f"[0]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d=0.008,afade=t=out:st={b - a - 0.008}:d=0.008[a{i}]")
    flt.append("".join(f"[a{i}]" for i in range(len(segs))) + f"concat=n={len(segs)}:v=0:a=1[o]")
    open(p("cut.filter"), "w").write(";".join(flt))
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", p("voice.wav"), "-filter_complex_script", p("cut.filter"), "-map", "[o]", p("voice_cut.wav")])
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", p("voice_cut.wav"), "-ar", "16000", p("cut16.wav")])
    words = []
    for s in whisper(p("cut16.wav"), p("cut_words"), words=True):
        t = s["text"].strip()
        if not t:
            continue
        for a, b in fixes:
            t = t.replace(a, b)
        words.append({"i": len(words), "text": t, "start": round(s["offsets"]["from"] / 1000, 3), "end": round(s["offsets"]["to"] / 1000, 3)})
    if hold > 0:
        extra = min(round(hold * FPS), round(dur * FPS) - segs[-1]["toF"])
        segs[-1]["toF"] += extra
        out_f += extra
        # pad the voice too, so mixer.py and the composition agree on the length
        run(["ffmpeg", "-y", "-loglevel", "error", "-i", p("voice_cut.wav"), "-af", f"apad=pad_dur={extra / FPS}", p("voice_cut_pad.wav")])
        os.replace(p("voice_cut_pad.wav"), p("voice_cut.wav"))
    json.dump({"fps": FPS, "durationInFrames": out_f, "segs": segs, "words": words}, open(p("data.json"), "w"))
    print(f"{dur:.1f} s -> {out_f / FPS:.1f} s, {len(segs)} segments, {len(words)} words -> {p('data.json')}")
    print(" ".join(f"{w['i']}:{w['text']}@{w['start']}" for w in words))


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] not in ("scan", "cut"):
        print(__doc__)
        sys.exit(1)
    if a[0] == "scan":
        scan(a[1], a[2])
    else:
        opt = lambda k: [a[i + 1] for i, x in enumerate(a) if x == k]
        drops = [tuple(map(float, r.split("-"))) for r in opt("--drop")]
        fixes = [tuple(f.split("=", 1)) for f in opt("--fix")]
        cut(a[1], drops, fixes, float((opt("--hold") or ["0"])[0]))
