"""Index an audio folder for edit mode: BPM, key, duration, loudness, mood and genre tags.

Usage:  python -I audio_index.py <audio-root>        (writes <audio-root>/index.json)

- Tempo/key: Essentia RhythmExtractor2013 + KeyExtractor(edma)   (AGPL-3.0, local use)
- Loudness:  Essentia LoudnessEBUR128 (integrated LUFS)
- Mood/genre: LAION CLAP zero-shot (laion/clap-htsat-unfused, Apache-2.0), scored on the middle 30 s
- Licence:   read from a sidecar <file>.license.json if present (written by hand when downloading)
Files already in index.json with the same size+mtime are skipped.
"""
import sys, os, json, time
from pathlib import Path
import essentia.standard as es
import librosa, torch
from transformers import ClapModel, ClapProcessor

EXT = {".wav", ".mp3", ".flac", ".m4a", ".aac", ".ogg", ".aiff"}
MOODS = ["calm", "uplifting", "energetic", "dark", "sad", "playful", "tense", "inspiring", "corporate", "dreamy"]
GENRES = ["lo-fi hip hop", "acoustic guitar", "piano", "electronic", "cinematic orchestral", "funk", "rock", "ambient"]

root = Path(sys.argv[1]).expanduser()
idx_path = root / "index.json"
index = json.loads(idx_path.read_text()) if idx_path.exists() else {}

clap = ClapModel.from_pretrained("laion/clap-htsat-unfused").eval()
proc = ClapProcessor.from_pretrained("laion/clap-htsat-unfused")

def emb(x):
    x = x if torch.is_tensor(x) else x.pooler_output
    return x / x.norm(dim=-1, keepdim=True)

with torch.no_grad():
    T = {name: emb(clap.get_text_features(**proc(text=texts, return_tensors="pt", padding=True)))
         for name, texts in (("mood", [f"{m} background music" for m in MOODS]),
                             ("genre", [f"music in the style of {g}" for g in GENRES]))}

def tags(a, name, labels):
    s = (a @ T[name].T * 100).softmax(-1)[0]
    return [[labels[i], round(float(s[i]), 2)] for i in s.argsort(descending=True)[:3]]

for f in sorted(p for p in root.rglob("*") if p.suffix.lower() in EXT):
    rel = str(f.relative_to(root)); st = f.stat()
    stamp = f"{st.st_size}:{int(st.st_mtime)}"
    if index.get(rel, {}).get("stamp") == stamp:
        continue
    t0 = time.time()
    y = es.MonoLoader(filename=str(f), sampleRate=44100)()
    dur = len(y) / 44100
    rec = {"stamp": stamp, "kind": rel.split("/")[0], "dur": round(dur, 2)}
    stereo, sr, *_ = es.AudioLoader(filename=str(f))()
    if stereo.shape[1] == 1:
        stereo = stereo.repeat(2, axis=1)
    rec["lufs"] = round(float(es.LoudnessEBUR128(sampleRate=sr)(stereo)[2]), 1)
    if dur >= 8:  # music: tempo, key, tags
        bpm, _, conf, _, _ = es.RhythmExtractor2013(method="multifeature")(y)
        key, scale, strength = es.KeyExtractor(profileType="edma")(y)
        rec.update(bpm=round(float(bpm), 1), bpm_conf=round(float(conf), 2),
                   key=f"{key} {scale}", key_strength=round(float(strength), 2))
        w, _ = librosa.load(str(f), sr=48000, mono=True)
        mid = len(w) // 2; w = w[max(0, mid - 15 * 48000): mid + 15 * 48000]
        with torch.no_grad():
            a = emb(clap.get_audio_features(**proc(audio=[w], sampling_rate=48000, return_tensors="pt")))
        rec.update(mood=tags(a, "mood", MOODS), genre=tags(a, "genre", GENRES))
    lic = f.with_name(f.name + ".license.json")
    rec["license"] = json.loads(lic.read_text()) if lic.exists() else None
    rec["secs"] = round(time.time() - t0, 2)
    index[rel] = rec
    print(rel, json.dumps({k: v for k, v in rec.items() if k != "stamp"}))

for rel in [r for r in index if not (root / r).exists()]:
    del index[rel]
idx_path.write_text(json.dumps(index, indent=1, ensure_ascii=False))
print(f"{len(index)} files -> {idx_path}")
