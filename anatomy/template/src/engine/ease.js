// Time in seconds; every pose is a pure function of t (as in isostory).
export const FPS = 30;

const bez = (x1, y1, x2, y2) => {
  const A = (a, b) => 1 - 3 * b + 3 * a, B = (a, b) => 3 * b - 6 * a, C = (a) => 3 * a;
  const f = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
  const d = (t, a, b) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);
  return (x) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const s = d(t, x1, x2);
      if (Math.abs(s) < 1e-6) break;
      t -= (f(t, x1, x2) - x) / s;
    }
    return f(Math.min(1, Math.max(0, t)), y1, y2);
  };
};
export const ease = { lift: bez(0.32, 0.72, 0, 1), inOut: bez(0.65, 0, 0.35, 1), out: bez(0.22, 1, 0.36, 1), in: bez(0.55, 0, 1, 0.45), linear: (p) => p };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mix = (a, b, p) => a + (b - a) * p;
export function prog(t, a, b, e = ease.inOut) {
  if (t <= a) return 0;
  if (t >= b) return 1;
  return e((t - a) / (b - a));
}
export const settle = (p, amount = 1.4) => {
  const q = p - 1;
  return 1 + q * q * ((amount + 1) * q + amount);
};
export const arc = (p, h) => Math.sin(Math.PI * clamp(p, 0, 1)) * h;
export const win = (t, a, b, fade = 0.3) => prog(t, a, a + fade, ease.out) * (1 - prog(t, b - fade, b, ease.in));
export const jitter = (i, salt = 0) => {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
};

