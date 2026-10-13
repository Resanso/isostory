// One composition per aspect: ids "Story9x16", "Story1x1", "Story16x9".
import { Composition } from "remotion";
import story from "./story.js";
import { Stage } from "./engine/Stage.jsx";
import { FPS } from "./engine/ease.js";

const SIZE = { "9:16": [1080, 1920], "1:1": [1080, 1080], "16:9": [1920, 1080], "4:5": [1080, 1350] };
export const idOf = (aspect) => "Story" + aspect.replace(":", "x");

export const Root = () => (
  <>
    {(story.aspects ?? ["9:16", "1:1", "16:9"]).map((a) => (
      <Composition key={a} id={idOf(a)} component={Stage} durationInFrames={Math.round(story.duration * FPS)} fps={FPS} width={SIZE[a][0]} height={SIZE[a][1]} />
    ))}
  </>
);
