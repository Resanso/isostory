"""ACE-Step 1.5 instrumental bed: gen_ace.py <ace-root> <out-dir> <secs> <bpm> "<caption>" [lm|nolm] [seed]"""
import sys, time, os
root = sys.argv[1]; out = sys.argv[2]; secs = float(sys.argv[3]); bpm = int(sys.argv[4])
caption = sys.argv[5]
use_lm = (sys.argv[6] if len(sys.argv) > 6 else "nolm") == "lm"
seed = int(sys.argv[7]) if len(sys.argv) > 7 else 42
sys.path.insert(0, root)
from acestep.handler import AceStepHandler
from acestep.llm_inference import LLMHandler
from acestep.inference import GenerationParams, GenerationConfig, generate_music

t0 = time.time()
dit = AceStepHandler()
print(dit.initialize_service(project_root=root, config_path="acestep-v15-turbo", device="auto"))
llm = LLMHandler()
if use_lm:
    print(llm.initialize(checkpoint_dir=os.path.join(root, "checkpoints"),
                         lm_model_path=os.environ.get("ACE_LM","acestep-5Hz-lm-1.7B"), backend="mlx", device="auto"))
t1 = time.time()
params = GenerationParams(caption=caption, lyrics="[Instrumental]", instrumental=True,
                          bpm=bpm, duration=secs, thinking=use_lm, seed=seed)
cfg = GenerationConfig(batch_size=1, audio_format="wav", use_random_seed=False, seeds=[seed])
r = generate_music(dit, llm, params, cfg, save_dir=out)
t2 = time.time()
print("success", r.success, r.error if not r.success else [a["path"] for a in r.audios])
print(f"lm={use_lm} init={t1-t0:.1f}s gen={t2-t1:.1f}s secs={secs} rtf={(t2-t1)/secs:.2f}")
