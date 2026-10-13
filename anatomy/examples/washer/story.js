// Example: a 10 s square product loop: one Anatomy-built front-loader, the drum spinning up and the LCD
// counting down, then a phone pings "Ready ✓". Shows the washer's live parts (drum angle, LCD text) driven by t.
//   0.0 the washer lands on its plate; title "Every wash, on the clock."
//   1.0 the drum spins up; the LCD counts 0:09 → 0:00, then reads DONE
//   7.0 "Done." + the customer's phone; the frame holds
import { basePlate } from "./engine/lib.js";
import { washer, washerFrame } from "./objects/washer.js";
import { bag, phone, customerScreen } from "./objects/props.js";
import { prog, mix, ease, settle } from "./engine/ease.js";

const PLATE = basePlate({ x: -70, y: -50, w: 150, d: 110, r: 8 });
const W = washer("w-hero", { towels: true, hose: [44, 26], lcd: "0:09" });
const drop = (t, t0, o, h = 80) => {
  const p = prog(t, t0, t0 + 0.7, ease.lift);
  return { o: [o[0], o[1], o[2] + h * (1 - settle(p, 1.25))], opacity: prog(t, t0, t0 + 0.2) };
};

function hero(t) {
  // drum: speed rises over 1.2 s, then holds; the angle is the integral of the speed
  const s = Math.max(0, t - 1.0), spinning = t < 7.0;
  const end = 6.0, at = (x) => (x < 1.2 ? (0.5 * 300 * x * x) / 1.2 : 300 * (x - 0.6));
  const angle = spinning ? at(s) : at(end) + 120 * (1 - Math.exp(-(t - 7.0) * 2)) / 2;
  const left = Math.max(0, 9 - Math.floor(s * 1.5));
  const lcd = t >= 7.0 ? "DONE" : `0:0${left}`;
  const buzz = spinning && s > 1.2 ? Math.sin(t * 60) * 0.4 : 0;
  const wa = settle(prog(t, 7.4, 7.9, ease.lift), 1.4);
  const items = [
    { o: [0, 0, 0], svg: PLATE, key: -1e9 },
    { ...drop(t, 0.1, [-8 + buzz, -10, 0]), svg: washerFrame(W, angle, lcd) },
    { ...drop(t, 0.5, [-52, 26, 0], 50), svg: bag("blue", 1) },
    { ...drop(t, 7.1, [52, 38, 0], 40), svg: phone("w-ph", customerScreen(wa, "Ready ✓")), scale: 1.5 },
  ];
  const lean = prog(t, 1.0, 6.0);
  return { items, cam: { c: [mix(0, -4, lean), mix(0, 6, lean), mix(62, 58, lean)], w: mix(205, 185, lean), h: mix(215, 200, lean) } };
}

export default {
  name: "washer",
  duration: 10,
  aspects: ["1:1"],
  brand: { name: "LaundryBob", accent: "#0ea5c6" },
  captions: false,
  poster: 8.5,
  scenes: [{ from: 0, to: 10.5, build: hero }],
  texts: [
    { t0: 0.4, t1: 6.8, text: "Every wash,\non the clock.", style: "title", emphasis: ["clock."] },
    { t0: 7.1, t1: 10.5, text: "Done.", style: "big", group: "done", emphasis: ["Done."] },
    { t0: 7.5, t1: 10.5, text: "and the customer already knows", style: "caption", group: "done" },
  ],
};
