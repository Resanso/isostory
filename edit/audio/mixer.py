"""Edit-mode audio mix: mastered voice + ducked music bed + SFX events -> one stereo WAV at -14 LUFS.

usage:
  python3 -I mixer.py --voice voice.wav --out mix.wav [--bed bed.wav --bed-gain -3] \
      [--event sfx/ding.wav@8.45@0.6 ...]

- voice.wav: the cut voice, already mastered to -14 LUFS (master.sh). Mono is fine: it is upmixed to
  centred stereo here. Always deliver STEREO: a mono mix played as dual-mono by Remotion measures +3 LU
  and collapses a stereo bed.
- bed: pre-levelled music (master.sh ... -21 for a present bed, -26 to -30 for "almost dry"), ducked by
  the voice (sidechain ratio 2, 500 ms release, 80 ms look-ahead), 0.3 s fade in, 1.5 s fade out.
- event: file@seconds@gain_dB, placed with adelay. Put every SFX on a visible event (edit.md, SFX rules).
- the sum is gain-matched to -14 LUFS with a -1.5 dBTP limiter (two measurement passes).
"""
import argparse, json, subprocess, sys

ap = argparse.ArgumentParser()
ap.add_argument("--voice", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--bed")
ap.add_argument("--bed-gain", type=float, default=0.0)
ap.add_argument("--event", action="append", default=[])
ap.add_argument("--target", type=float, default=-14.0)
a = ap.parse_args()

def run(cmd):
    return subprocess.run(cmd, check=True, capture_output=True, text=True)

D = float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", a.voice]).stdout.strip())
inputs, fc, mix, n = ["-i", a.voice], [], ["[v]"], 1
if a.bed:
    fc += ["[0:a]pan=stereo|c0=c0|c1=c0,asplit=2[v][k0]", "[k0]atrim=start=0.08,asetpts=PTS-STARTPTS,apad[k]"]
    inputs += ["-i", a.bed]
    fc.append(f"[1:a]aformat=channel_layouts=stereo,atrim=0:{D},asetpts=PTS-STARTPTS,volume={a.bed_gain}dB,"
              f"afade=t=in:d=0.3,afade=t=out:st={max(0, D - 1.5)}:d=1.5[b]")
    fc.append("[b][k]sidechaincompress=threshold=0.1:ratio=2:attack=20:release=500:knee=4[duck]")
    mix.append("[duck]"); n = 2
else:
    fc.append("[0:a]pan=stereo|c0=c0|c1=c0[v]")  # no apad branch here: an unconsumed apad never ends
for j, e in enumerate(a.event):
    f, t, g = e.split("@")
    inputs += ["-i", f]
    fc.append(f"[{n}:a]aformat=channel_layouts=stereo,volume={g}dB,adelay={int(float(t) * 1000)}:all=1[e{j}]")
    mix.append(f"[e{j}]"); n += 1
fc.append("".join(mix) + f"amix=inputs={len(mix)}:normalize=0:duration=first[m]")
raw = a.out + ".raw.wav"
run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *inputs, "-filter_complex", ";".join(fc), "-map", "[m]", "-ar", "48000", "-c:a", "pcm_s24le", raw])

def integrated(path, chain="anull"):
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", f"{chain},ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float([l for l in err.splitlines() if l.strip().startswith("I:")][-1].split()[1])

lim = "alimiter=limit=-1.5dB:attack=2:release=50:level=disabled"
g = a.target - integrated(raw)
g += a.target - integrated(raw, f"volume={g:.2f}dB,{lim}")
run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", raw, "-af", f"volume={g:.2f}dB,{lim}", "-ar", "48000", "-c:a", "pcm_s16le", a.out])
subprocess.run(["rm", "-f", raw])
print(json.dumps({"out": a.out, "dur": round(D, 2), "events": len(a.event), "gain_db": round(g, 2), "lufs": integrated(a.out)}))
