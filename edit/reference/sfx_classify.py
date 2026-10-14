"""CLAP zero-shot label for each SFX-like event (window -0.15..+0.85 s on the background stem).
usage: sfx_classify.py <no_vocals.wav> <t1> <t2> ..."""
import sys, json, librosa, torch
from transformers import ClapModel, ClapProcessor
L = ["whoosh", "swoosh transition", "pop", "click", "mouse click", "keyboard typing", "riser", "impact hit", "boom",
     "ding bell", "cash register", "camera shutter", "glitch", "notification sound", "drum beat", "bass drop",
     "paper sound", "coin sound", "scratch", "musical chord"]
m = ClapModel.from_pretrained("laion/clap-htsat-unfused").eval(); p = ClapProcessor.from_pretrained("laion/clap-htsat-unfused")
def emb(x):
    x = x if torch.is_tensor(x) else x.pooler_output
    return x / x.norm(dim=-1, keepdim=True)
with torch.no_grad():
    T = emb(m.get_text_features(**p(text=[f"the sound of a {l}" for l in L], return_tensors="pt", padding=True)))
y, sr = librosa.load(sys.argv[1], sr=48000, mono=True)
for t in map(float, sys.argv[2:]):
    w = y[max(0, int((t - 0.15) * sr)): int((t + 0.85) * sr)]
    with torch.no_grad():
        a = emb(m.get_audio_features(**p(audio=[w], sampling_rate=48000, return_tensors="pt")))
    s = (a @ T.T * 100).softmax(-1)[0]
    top = s.argsort(descending=True)[:2]
    print(json.dumps({"t": t, "top": [[L[i], round(float(s[i]), 2)] for i in top]}))
