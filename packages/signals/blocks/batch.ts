import { endBatch, startBatch } from "alien-signals";
import { createBlock } from "@chrock-studio/code-block";

/**
 * The block of `alien-signals`' `startBatch` and `endBatch`.
 *
 * @example
 * ```
 * const items = Array.from({ length: 10 }).map((_, i) => signal(i));
 *
 * effectScope(() => {
 *   effect(() => console.log("items:", items.map((item) => item())));
 *   // "items: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]"
 *
 *   batch(() => {
 *     items.forEach((item) => item(item() + 1));
 *   });
 *   // "items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]"
 * });
 * ```
 *
 * @module "@chrock-studio/signals/blocks/batch"
 */
export const batch: <Result>(body: () => Result) => Result = createBlock(startBatch, endBatch);
