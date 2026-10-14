"""Per style video: voice vs background loudness, ducking, music tempo/key, SFX-like transients.
usage: audio_style.py <stems_dir>/<name> <scenes.txt>"""
import sys, json, numpy as np, librosa
import essentia.standard as es

d = sys.argv[1]; scenes = [float(x) for x in open(sys.argv[2]).read().split()]
def lufs(path):
    a, sr, *_ = es.AudioLoader(filename=path)()
    if a.shape[1] == 1: a = a.repeat(2, 1)
    m, s, i, lra = es.LoudnessEBUR128(sampleRate=sr, hopSize=0.1)(a)
    return np.array(s), float(i), float(lra)  # short-term (3 s) every 100 ms
sv, iv, _ = lufs(f"{d}/vocals.wav")
sb, ib, lrab = lufs(f"{d}/no_vocals.wav")
# frame-level RMS (50 ms) for speech activity and bed level
hop = 0.05
v, sr = librosa.load(f"{d}/vocals.wav", sr=22050, mono=True)
b, _ = librosa.load(f"{d}/no_vocals.wav", sr=22050, mono=True)
H = int(hop * sr)
rv = librosa.amplitude_to_db(librosa.feature.rms(y=v, frame_length=2 * H, hop_length=H)[0], ref=1.0)
rb = librosa.amplitude_to_db(librosa.feature.rms(y=b, frame_length=2 * H, hop_length=H)[0], ref=1.0)
n = min(len(rv), len(rb)); rv, rb = rv[:n], rb[:n]
speech = rv > (rv.max() - 30)
# smooth speech mask: speaking if any speech within +-150 ms
k = 3; sm = np.convolve(speech.astype(float), np.ones(2 * k + 1), "same") > 0
bed_speech = float(np.median(rb[sm])) if sm.any() else None
bed_gap = float(np.median(rb[~sm])) if (~sm).sum() > 10 else None
# music presence: fraction of frames where bed is within 35 dB of its peak
present = float((rb > rb.max() - 35).mean())
# tempo/key on background stem
y = es.MonoLoader(filename=f"{d}/no_vocals.wav", sampleRate=44100)()
bpm, beats, conf, _, _ = es.RhythmExtractor2013(method="multifeature")(y)
key, scale, strength = es.KeyExtractor(profileType="edma")(y)
# SFX-like events: frames where bed jumps >= 9 dB over its 1.5 s rolling median, merged within 0.4 s
w = int(1.5 / hop)
med = np.array([np.median(rb[max(0, i - w):i + w]) for i in range(n)])
cand = np.where((rb - med) >= 9)[0]
events = []
for c in cand:
    t = c * hop
    if not events or t - events[-1][0] > 0.4:
        events.append([round(t, 2), round(float(rb[c] - med[c]), 1)])
def near(t, xs, tol=0.25): return any(abs(t - x) <= tol for x in xs)
for e in events: e.append("cut" if near(e[0], scenes) else "")
dur = n * hop
print(json.dumps({
    "dur": round(dur, 1), "voice_I": round(iv, 1), "bg_I": round(ib, 1), "voice_minus_bg_LU": round(iv - ib, 1),
    "bg_LRA": round(lrab, 1), "bg_present_frac": round(present, 2),
    "bed_rms_db_during_speech": round(bed_speech, 1) if bed_speech else None,
    "bed_rms_db_in_gaps": round(bed_gap, 1) if bed_gap else None,
    "bg_bpm": round(float(bpm), 1), "bg_bpm_conf": round(float(conf), 2), "bg_key": f"{key} {scale}",
    "sfx_like_events": len(events), "per_10s": round(len(events) / dur * 10, 1),
    "events_on_cuts": sum(1 for e in events if e[2] == "cut"), "events": events}, ensure_ascii=False))
