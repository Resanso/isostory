# Embedding a story in an app

Copy three files into the app, side by side (e.g. `components/isostory/`): `kernel.js`, `isostory.js`, and the story file. Fix the story's import to `./isostory.js`.

## React / Next.js (client component)

```tsx
"use client";
import { useEffect, useRef } from "react";
import { ISO } from "./isostory/isostory.js";
import story from "./isostory/hiring.js";

export function StoryMotion({ mode = "autoplay", aspect = "16:9", transparent = false, controls = false }: {
  mode?: "autoplay" | "scroll"; aspect?: "16:9" | "9:16" | "1:1"; transparent?: boolean; controls?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    // brand: the logo for decals, cards and the watermark (any URL the page can load), the accent, the font
    const player = ISO.mount(ref.current, story, { mode, aspect, transparent, controls, brand: { logo: "/logo.svg", accent: "#1b61ee" } });
    return () => player.destroy();
  }, [mode, aspect, transparent, controls]);
  return <div ref={ref} />;
}
```

- The story's poses are functions, so pick the story **inside** the client component; never pass it as a prop from a server component.
- `mode: "scroll"` builds its own tall track (`track: "320vh"`, `stickyTop: "8vh"` to tune).
- `controls: false` for a component; `true` gives a play button, a scrubber and chapter buttons.
- `captions: false` hides the chapter line (use when the page already says it).
- `onChapter(i, chapter)` fires on chapter change (sync page copy, analytics).
- `transparent: true` drops the backdrop and radius so the drawing sits on the page.
- Reduced motion shows the story's `poster` frame. The loop pauses off screen.
- Fonts: the player uses `--iso-font` (default Inter); set `brand.font` to the page's font family.
- TypeScript: the files are plain JS; add `// @ts-expect-error` on the imports or `allowJs` if the project needs it.

## Turbopack in a git worktree

Turbopack refuses a `node_modules` symlinked from outside the project root. In a worktree, clone it instead: `cp -cR ../main/node_modules ./node_modules` (APFS clone, fast, no extra space).

## Plain HTML

`node build.mjs story.js --logo logo.svg` gives a self-contained page; or in any page:

```html
<div id="motion"></div>
<script type="module">
  import { ISO } from "./isostory.js";
  import story from "./story.js";
  ISO.mount(document.getElementById("motion"), story, { controls: false });
</script>
```
