import { createBlock } from "@chrock-studio/code-block";
import { setActiveSub } from "alien-signals";
import type { ReactiveNode } from "alien-signals/system";

/**
 * The block of `alien-signals`' `setActiveSub`.
 *
 * @example
 * ```
 * const items = Array.from({ length: 10 }).map((_, i) => signal(i));
 *
 * effectScope(() => {
 *   effect(() => console.log("items:", items.map((item) => item())));
 *   // "items: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]"
 *
 *   untrack(() => {
 *     items.forEach((item) => item(item() + 1));
 *   });
 *   // Nothing happened.
 * });
 * ```
 *
 * @module "@chrock-studio/signals/blocks/untrack"
 */
export const untrack: <Result>(body: (cache: ReactiveNode | undefined) => Result) => Result = createBlock(
  () => setActiveSub(undefined),
  (prev) => setActiveSub(prev),
);
