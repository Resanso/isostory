// Example: a 12 s motion component for a courier-tracking feature (16:9 and 9:16, no audio).
//   0.0 a small city lands block by block; the laundry shop is where the route starts
//   1.6 the courier scooter rides the road under a GPS pin; the route lights up behind it
//   8.0 it arrives; the customer's phone gets "Delivered ✓"; the frame holds to the end
// Shows: a moving kit object rebuilt per frame (scooter heading), overlay trail, a pin with a pulse ring.
import { k, P, at, L, basePlate } from "./engine/lib.js";
import { phone, customerScreen, pin } from "./objects/props.js";
import { ruko, block, tree, scooter } from "./objects/city.js";
import { prog, mix, ease, settle } from "./engine/ease.js";

const PLATE = basePlate({ x: -150, y: -110, w: 300, d: 220, r: 8 });
const ROADS = [
  { x: -140, y: -40, w: 280, d: 22, r: 1 },
  { x: -10, y: -100, w: 22, d: 200, r: 1 },
  { x: -10, y: 40, w: 150, d: 22, r: 1 },
];
const ROAD_SVG = ROADS.map((r) => k.solidSvg(k.slabOf(r, 0, 0.6, P, 2), { tone: "lo", crease: "none", className: "ax-roadslab" }) +
  L(k.lineOnTop(r.w > r.d ? [r.x + 4, r.y + r.d / 2] : [r.x + r.w / 2, r.y + 4], r.w > r.d ? [r.x + r.w - 4, r.y + r.d / 2] : [r.x + r.w / 2, r.y + r.d - 4], 0.6, P), { tone: "faint", dashed: true })).join("");
const SHOP = ruko("c-shop", { sign: "LAUNDRY" });
const HOME = ruko("c-home", { sign: "HOME", tint: "ax-home" });
const BLOCKS = [[-100, 60, 36, 30, 54], [60, -78, 40, 30, 72], [110, -76, 26, 26, 42], [-130, 10, 22, 22, 30], [-60, 70, 24, 24, 36]].map(([x, y, w, d, h]) => ({ o: [x, y, 0], svg: block(w, d, h) }));
const TREES = [[-40, 6], [30, 6], [55, 6], [-30, 80], [40, 82], [-120, -70]].map(([x, y], i) => ({ o: [x, y, 0], svg: tree(18 + (i % 3) * 4) }));

// the route on the road centrelines: out of the shop, right, down the cross street, right to the house
const ROUTE = [[-95, -29], [1, -29], [1, 51], [80, 51]];
const LEGS = ROUTE.slice(1).map((p, i) => Math.hypot(p[0] - ROUTE[i][0], p[1] - ROUTE[i][1]));
const TOTAL = LEGS.reduce((a, b) => a + b, 0);
function along(u) {
  let d = u * TOTAL;
  for (let i = 0; i < LEGS.length; i++) {
    if (d <= LEGS[i] || i === LEGS.length - 1) {
      const a = ROUTE[i], b = ROUTE[i + 1], q = Math.min(1, d / LEGS[i]);
      return { p: [mix(a[0], b[0], q), mix(a[1], b[1], q)], h: Math.atan2(b[1] - a[1], b[0] - a[0]), i };
    }
    d -= LEGS[i];
  }
}
const drop = (t, t0, o, h = 70) => {
  const p = prog(t, t0, t0 + 0.6, ease.lift);
  return { o: [o[0], o[1], o[2] + h * (1 - settle(p, 1.3))], opacity: prog(t, t0, t0 + 0.2) };
};

function city(t) {
  const items = [{ o: [0, 0, 0], svg: PLATE, key: -1e9 }, { o: [0, 0, 0], svg: ROAD_SVG, key: -1e8, opacity: prog(t, 0.1, 0.4) }];
  items.push({ ...drop(t, 0.2, [-95, -72, 0]), svg: SHOP });
  items.push({ ...drop(t, 0.35, [118, 4, 0]), svg: HOME });
  BLOCKS.forEach((b, i) => items.push({ ...drop(t, 0.3 + i * 0.07, b.o, 60), svg: b.svg }));
  TREES.forEach((b, i) => items.push({ ...drop(t, 0.5 + i * 0.05, b.o, 30), svg: b.svg }));
  // ride: 1.6 → 8.0 s, easing in and out; the heading blends across each corner
  const u = prog(t, 1.6, 8.0, ease.inOut);
  const now = along(u), ahead = along(Math.min(1, u + 0.025));
  const h = ahead.i !== now.i ? mix(now.h, ahead.h, 0.5) : now.h;
  const trail = [];
  for (let j = 0; j <= 48; j++) {
    const s = along(j / 48), shown = prog(t, 0.8 + (j / 48) * 0.6, 1.0 + (j / 48) * 0.6);
    if (shown <= 0) continue;
    const q = at([s.p[0], s.p[1], 0.8]), on = j / 48 <= u;
    trail.push(`<circle class="${on ? "ax-trail-on" : "ax-trail"}" cx="${q[0]}" cy="${q[1]}" r="${on ? 1.5 : 1.1}" opacity="${shown}"/>`);
  }
  items.push({ o: [0, 0, 0.8], svg: trail.join(""), key: -1e7 });
  const enter = prog(t, 1.0, 1.5, ease.lift);
  items.push({ o: [now.p[0], now.p[1], 30 * (1 - enter)], svg: scooter(h, t * 8), opacity: prog(t, 1.0, 1.2) });
  items.push({ o: [now.p[0], now.p[1], 56 + Math.sin(t * 6) * 1.5], svg: pin(((t - 1) * 1.1) % 1), opacity: enter, key: 1e8 });
  const wa = settle(prog(t, 8.1, 8.6, ease.lift), 1.4);
  items.push({ ...drop(t, 1.4, [140, 92, 0], 40), svg: phone("c-ph", customerScreen(wa, "Delivered ✓")), scale: 1.7 });
  const f = prog(t, 1.6, 8.0);
  return { items, cam: { c: [mix(-15, 25, f), mix(-10, 15, f), 34], w: 340, h: 320 } };
}

export default {
  name: "courier",
  duration: 12,
  aspects: ["16:9", "9:16"],
  brand: { name: "LaundryBob", accent: "#0ea5c6" },
  captions: false,
  poster: 9.5,
  scenes: [{ from: 0, to: 12.5, build: city }],
  texts: [
    { t0: 0.3, t1: 7.7, text: "Every delivery,\nlive on the map.", style: "title", emphasis: ["live"] },
    { t0: 8.2, t1: 12.5, text: "Delivered.", style: "big", group: "done", emphasis: ["Delivered."] },
    { t0: 8.6, t1: 12.5, text: "the customer is told on WhatsApp", style: "caption", group: "done" },
  ],
};
