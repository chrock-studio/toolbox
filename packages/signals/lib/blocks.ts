import { createBlock } from "@chrock-studio/code-block";
import { endBatch, setActiveSub, startBatch } from "alien-signals";

export const batch = createBlock(startBatch, endBatch);
export const untrack = createBlock(
  () => setActiveSub(undefined),
  (prev) => setActiveSub(prev),
);
