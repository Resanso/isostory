// Shared data for the preset compositions. data.json is written per edit (never committed):
// { fps, durationInFrames, segs: [{ fromF, toF, outF }], words: [{ i, text, start, end }] }
// segs = jump-cut segments in source frames (fromF..toF) placed at outF in the edit; word times are edit seconds.
import data from "./data.json";

export type Word = { i: number; text: string; start: number; end: number };
export const words: Word[] = data.words;
export const FPS: number = data.fps;

// group words into caption phrases: break after punctuation, on a pause, or at max words
export const chunk = (ws: Word[], max: number, gap = 0.35): Word[][] => {
  const out: Word[][] = [];
  let cur: Word[] = [];
  ws.forEach((w, k) => {
    const prev = ws[k - 1];
    if (cur.length && (cur.length >= max || /[.,?!]$/.test(prev.text) || w.start - prev.end > gap || w.i !== prev.i + 1)) { out.push(cur); cur = []; }
    cur.push(w);
  });
  if (cur.length) out.push(cur);
  return out;
};
