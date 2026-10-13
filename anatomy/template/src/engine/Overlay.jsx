// The HTML layer of an anatomy story: kinetic titles, karaoke subtitles and the end card.
// Same text rules as isostory (T1–T7): titles by word, one emphasised word, texts in a group stack.
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FPS, prog, ease, win, mix } from "./ease.js";

const FONT = 'Inter, "SF Pro Display", -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';
const SIZES = { big: 0.1, title: 0.074, caption: 0.034, stat: 0.16 };
const WEIGHT = { big: 750, title: 700, caption: 500, stat: 800 };
const clean = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}%]/gu, "");

/** One text: words rise (or come out of a mask for `big`/`stat`); an emphasised word gets the accent and an underline below the baseline. */
export function KineticText({ it, t, S, accent }) {
  const size = SIZES[it.style ?? "title"] * S;
  const emph = new Set((it.emphasis ?? []).map(clean));
  const exit = 1 - prog(t, (it.t1 ?? 1e9) - 0.35, it.t1 ?? 1e9, ease.in);
  const mask = it.style === "big" || it.style === "stat";
  let text = it.text;
  if (it.count) {
    const p = prog(t, it.t0, it.t0 + (it.count.dur ?? 1.2), ease.out);
    text = text.replace("{n}", Math.round(mix(it.count.from, it.count.to, p)));
  }
  let k = 0;
  return (
    <div style={{ fontSize: size, fontWeight: WEIGHT[it.style ?? "title"], lineHeight: 1.08, letterSpacing: it.style === "caption" ? "0" : "-0.025em",
      color: it.style === "caption" ? "rgba(214,223,242,0.78)" : "#eef2fb", textAlign: "center", opacity: exit, textWrap: "balance" }}>
      {text.split("\n").map((line, li) => (
        <div key={li}>
          {line.split(" ").map((w, wi) => {
            const d = it.t0 + k++ * 0.06;
            const p = prog(t, d, d + 0.55, ease.out);
            const isEm = emph.has(clean(w));
            const sweep = prog(t, d + 0.45, d + 0.85, ease.out);
            const word = (
              <span style={{ position: "relative", display: "inline-block", color: isEm ? accent : undefined,
                transform: `translateY(${(1 - p) * (mask ? 105 : 45)}%)`, opacity: mask ? 1 : p }}>
                {w}
                {isEm && (
                  // under the baseline, so it never sits on the glyphs
                  <span style={{ position: "absolute", left: "2%", right: "2%", bottom: "-0.1em", height: "0.075em", borderRadius: "0.05em",
                    background: accent, transform: `scaleX(${sweep})`, transformOrigin: "left center", boxShadow: `0 0 0.25em ${accent}66` }} />
                )}
              </span>
            );
            return (
              <span key={wi} style={{ display: "inline-block", marginRight: "0.24em",
                ...(mask ? { overflow: "hidden", padding: "0.04em 0.02em 0.2em", margin: "0 0.22em -0.2em 0", verticalAlign: "bottom" } : {}) }}>
                {word}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Titles({ story, t, S, tall }) {
  // a group stacks in one column; hidden items keep their slot, so nothing jumps or collides
  const groups = [];
  for (const it of story.texts ?? []) {
    const g = it.group ? groups.find((x) => x.name === it.group) : null;
    if (g) g.items.push(it);
    else groups.push({ name: it.group ?? Symbol(), items: [it] });
  }
  return groups.map((g, gi) => {
    const t0 = Math.min(...g.items.map((i) => i.t0)), t1 = Math.max(...g.items.map((i) => i.t1));
    if (t < t0 - 0.01 || t > t1 + 0.01) return null;
    return (
      <div key={gi} style={{ position: "absolute", left: "6%", right: "6%", top: tall ? "10.5%" : "7%", display: "flex", flexDirection: "column", alignItems: "center", gap: S * 0.012 }}>
        {g.items.map((it, i) => (
          <div key={i} style={{ visibility: t >= it.t0 && t <= it.t1 ? "visible" : "hidden" }}>
            <KineticText it={it} t={t} S={S} accent={story.brand.accent} />
          </div>
        ))}
      </div>
    );
  });
}

function Subtitles({ story, t, S, tall, wide }) {
  const c = (story.subtitles ?? []).find((s) => t >= s.t0 && t <= s.t1);
  const card = story.card;
  if (!c || (card && t >= card.t0 + 0.2)) return null;
  const words = c.text.split(" ");
  const spoken = ((t - c.t0) / (c.t1 - c.t0 - 0.3)) * words.length;
  return (
    <div style={{ position: "absolute", left: "8%", right: "8%", top: tall ? "79%" : wide ? "87%" : "85%", display: "flex", justifyContent: "center", opacity: win(t, c.t0, c.t1, 0.2) }}>
      <div style={{ fontSize: S * (wide ? 0.034 : 0.037), fontWeight: 600, lineHeight: 1.3, textAlign: "center", color: "#eef2fb", textWrap: "balance",
        background: "rgba(7,9,16,0.55)", padding: "0.3em 0.7em", borderRadius: "0.5em", maxWidth: tall ? "100%" : "80%" }}>
        {words.map((w, i) => (
          <span key={i} style={{ opacity: i < spoken ? 1 : 0.55, color: i < spoken && i > spoken - 1 ? story.brand.accent : undefined }}>
            {w}{i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function EndCard({ story, t, S }) {
  const card = story.card;
  if (!card) return null;
  const o = prog(t, card.t0, card.t0 + 0.45, ease.out);
  if (o <= 0) return null;
  const accent = story.brand.accent;
  const rise = (d) => {
    const p = prog(t, card.t0 + d, card.t0 + d + 0.5, ease.out);
    return { opacity: p, transform: `translateY(${(1 - p) * 30}px)` };
  };
  return (
    <AbsoluteFill style={{ opacity: o, background: "radial-gradient(ellipse at 50% 40%, #142037 0%, #0a0e18 70%)", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: S * 0.03, textAlign: "center", padding: "8%" }}>
      {story.brand.logo && <Img src={staticFile(story.brand.logo)} style={{ width: S * 0.15, height: S * 0.15, borderRadius: S * 0.035, boxShadow: `0 ${S * 0.02}px ${S * 0.06}px ${accent}55`, ...rise(0.1) }} />}
      <div style={{ fontSize: S * 0.066, fontWeight: 750, color: "#eef2fb", letterSpacing: "-0.025em", lineHeight: 1.1, textWrap: "balance", ...rise(0.25) }}>{card.title}</div>
      {card.sub && <div style={{ fontSize: S * 0.028, color: "#97a1b8", ...rise(0.4) }}>{card.sub}</div>}
      {card.cta && <div style={{ fontSize: S * 0.032, fontWeight: 700, color: "#fff", background: accent, padding: "0.6em 1.4em", borderRadius: 999, marginTop: S * 0.01, ...rise(0.55) }}>{card.cta}</div>}
    </AbsoluteFill>
  );
}

export function Overlay({ story }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame / FPS;
  const S = Math.min(width, height);
  const tall = height > width * 1.2, wide = width > height * 1.2;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, WebkitFontSmoothing: "antialiased" }}>
      <Titles story={story} t={t} S={S} tall={tall} />
      {story.captions !== false && <Subtitles story={story} t={t} S={S} tall={tall} wide={wide} />}
      <EndCard story={story} t={t} S={S} />
    </AbsoluteFill>
  );
}
