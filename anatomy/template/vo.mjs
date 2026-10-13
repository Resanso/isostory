// Voice-over with ElevenLabs, one clip per line, laid on the story's timeline.
//   ELEVENLABS_API_KEY=… node vo.mjs [voiceId] [--only 3,5] [--model eleven_multilingual_v2]
// Lines come from story.voice (spoken text, may differ from the subtitle) or story.subtitles.
// A clip longer than its window is sped up to 1.15× at most; past that it is reported so you shorten the line.
// Writes public/vo/line-N.mp3 and public/voiceover.mp3; set `audio: "voiceover.mp3"` in the story.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import story from "./src/story.js";

const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt; };
const dotenv = existsSync(".env") ? Object.fromEntries(readFileSync(".env", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => l.split(/=(.*)/s).slice(0, 2).map((s) => s.trim()))) : {};
const KEY = process.env.ELEVENLABS_API_KEY ?? process.env.ELEVEN_LABS_API_KEY ?? dotenv.ELEVENLABS_API_KEY ?? dotenv.ELEVEN_LABS_API_KEY;
if (!KEY) throw new Error("Set ELEVENLABS_API_KEY (environment or .env)");
const positional = process.argv.slice(2).filter((a, i, all) => !a.startsWith("--") && !(all[i - 1] ?? "").startsWith("--"));
const VOICE = positional[0] ?? story.voiceId;
if (!VOICE) throw new Error("Pass a voice id (curl -H 'xi-api-key: …' https://api.elevenlabs.io/v1/voices lists yours)");
const MODEL = arg("--model", "eleven_multilingual_v2");
const ONLY = arg("--only", null)?.split(",").map(Number);
const LINES = story.voice ?? story.subtitles;
const dur = (f) => +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString();

mkdirSync("public/vo", { recursive: true });
for (const [i, l] of LINES.entries()) {
  if (ONLY && !ONLY.includes(i + 1)) continue;
  const raw = `public/vo/line-${i + 1}-raw.mp3`, out = `public/vo/line-${i + 1}.mp3`;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "content-type": "application/json" },
    body: JSON.stringify({ text: l.text, model_id: MODEL, ...(story.language ? { language_code: story.language } : {}),
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true } }),
  });
  if (!res.ok) throw new Error(`line ${i + 1}: ${res.status} ${await res.text()}`);
  writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", raw, "-af", "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse", out]);
  const slot = l.t1 - l.t0, d = dur(out);
  if (d > slot) {
    execFileSync("ffmpeg", ["-y", "-v", "error", "-i", out, "-af", `atempo=${Math.min(1.15, d / slot).toFixed(3)}`, raw]);
    execFileSync("ffmpeg", ["-y", "-v", "error", "-i", raw, "-c", "copy", out]);
  }
  const fin = dur(out);
  console.log(`line ${i + 1}: ${d.toFixed(2)}s → ${fin.toFixed(2)}s in a ${slot.toFixed(1)}s window${fin > slot + 0.05 ? "  ! TOO LONG: shorten the line or widen its window" : ""}`);
}
const inputs = LINES.flatMap((_, i) => ["-i", `public/vo/line-${i + 1}.mp3`]);
const delays = LINES.map((l, i) => `[${i}:a]adelay=${Math.round(l.t0 * 1000)}:all=1[a${i}]`).join(";");
execFileSync("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex",
  `${delays};${LINES.map((_, i) => `[a${i}]`).join("")}amix=inputs=${LINES.length}:normalize=0,apad,atrim=0:${story.duration},loudnorm=I=-14:TP=-1.5[out]`,
  "-map", "[out]", "-ar", "44100", "-b:a", "192k", "public/voiceover.mp3"]);
console.log(`public/voiceover.mp3 (${dur("public/voiceover.mp3").toFixed(2)}s)`);
