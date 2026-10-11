// Example: a 15 s video ad, cut to a 120 bpm track (one beat = 0.5 s). Works in 9:16, 1:1 and 16:9.
//   0.0 hook     "200 lamaran. 1 posisi." lands on the first beats over a falling pile
//   2.5 problem  the pile grows; a quote: "Butuh 3 minggu cuma untuk menyaring."
//   5.5 turn     the AIDA bar sweeps; kinetic title with an emphasised word
//   9.0 proof    a stat counts up: 92% cocok, with a lower-third
//  12.0 CTA      end card with logo and CTA
// Subtitles run underneath for sound-off viewing (most feeds autoplay muted).
import { ISO } from "../isostory.js";

const { body, prog, mix, ease, settle, arc, jitter, beat, window: win } = ISO;
const B = (n) => beat(n, 120);
const N = 18;

function sheet(i) {
  const fall = 0.15 + i * 0.13;
  const gx = ((i % 6) - 2.5) * 28, gy = (Math.floor(i / 6) - 1) * 36;
  const best = i === 7;
  return body(`cv-${i}`, (t) => {
    const p = prog(t, fall, fall + 0.5, ease.lift);
    const pile = { x: jitter(i, 1) * 4, y: jitter(i, 2) * 4, z: i * 1.3, rot: jitter(i, 3) * 12 };
    const spread = prog(t, B(11) + i * 0.03, B(11) + i * 0.03 + 0.7);
    const read = prog(t, B(13) + (gx + 70) / 140 * 1.4, B(13) + (gx + 70) / 140 * 1.4 + 0.25);
    const lift = best ? 10 * settle(prog(t, B(17), B(18), ease.lift)) : 0;
    return {
      w: 24, d: 30, h: 1.2, r: 1.6, b: 0.8, detail: "cv",
      x: mix(pile.x, gx, spread), y: mix(pile.y, gy, spread), z: mix(pile.z + 80 * (1 - p), 0, spread) + arc(spread, 20) + lift,
      rot: mix(pile.rot + (1 - p) * 30, 0, spread),
      color: read > 0.5 ? (best ? "accent" : "paper") : ["paper", "amber", "paper", "blue"][i % 4],
      tone: read > 0.5 ? (best ? "accent" : "lo") : "base",
      opacity: prog(t, fall, fall + 0.15) * (1 - prog(t, B(23), B(24))),
    };
  });
}

export default ISO.story({
  name: "ad-hire",
  duration: 15,
  aspect: "9:16",
  theme: "studio",
  backdrop: "grid",
  brand: { name: "AdaCareer Hire", accent: "#1b61ee", watermark: true },
  bodies: [
    body("desk", (t) => ({ x: 0, y: 0, z: -5, w: 200, d: 150, h: 5, r: 12, b: 2, layer: 0, color: "ground", opacity: prog(t, 0, 0.4) * (1 - prog(t, B(23), B(24))) })),
    body("bar", (t) => ({ x: mix(-95, 95, prog(t, B(13), B(16))), y: 0, z: 14, w: 4, d: 130, h: 2, r: 1.5, layer: 3, color: "accent", tone: "accent",
      opacity: win(t, B(12.5), B(16.5), 0.25) })),
    ...Array.from({ length: N }, (_, i) => sheet(i)),
  ],
  // the camera reads the view: a tall frame is narrow, so it pulls back
  camera: (t, { view }) => {
    const fit = Math.min(1, view.w / 520); // the desk is ~520 units wide on screen at full scale

    return { S: mix(2.2, 1.55, prog(t, B(10), B(12))) * fit, focus: [0, 0, mix(14, 0, prog(t, B(10), B(12)))], dy: view.h > view.w ? 30 : 38 };
  },
  texts: [
    { t0: B(1), t1: B(5), text: "200 lamaran.", style: "big", at: "top", group: "hook", anim: "mask", emphasis: ["200"] },
    { t0: B(2.5), t1: B(5), text: "1 posisi.", style: "title", group: "hook", anim: "rise" },
    { t0: B(5.5), t1: B(10), text: "“Butuh 3 minggu\ncuma untuk menyaring.”", style: "quote", at: "top", anim: "blur" },
    { t0: B(11), t1: B(17), text: "Biarkan AIDA\nyang menyaring.", style: "title", at: "top", anim: "rise", emphasis: ["AIDA"] },
    { t0: B(17.5), t1: B(23.5), text: "{n}%", style: "stat", at: "top", group: "proof", anim: "pop", count: { from: 0, to: 92, dur: 1.1 } },
    { t0: B(18.5), t1: B(23.5), text: "cocok dengan brief kamu", style: "caption", group: "proof", anim: "rise" },
    { t0: B(19), t1: B(23.5), text: "Raka P. · Senior Backend", style: "lower", anim: "slide" },
  ],
  subtitles: [
    { t0: 0.2, t1: B(5), text: "Dua ratus lamaran untuk satu posisi." },
    { t0: B(5.2), t1: B(10.5), text: "Biasanya butuh tiga minggu cuma untuk menyaring." },
    { t0: B(10.8), t1: B(17), text: "Dengan AIDA, semua profil dinilai dalam menit." },
    { t0: B(17.2), t1: B(23.5), text: "Kandidat terbaik langsung di depan kamu." },
  ],
  cards: [{ t0: B(24), logo: true, title: "Rekrut lebih cepat dengan AIDA.", sub: "AdaCareer Hire", cta: "Coba gratis di hire.ada4career.com" }],
  poster: B(20),
});
