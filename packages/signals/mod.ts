/**
 * # `@chrock-studio/signals` - A utility collections for `alien-signals`.
 *
 * @module "@chrock-studio/signals"
 *
 * @example with blocks
 *
 * ```
 * import { batch, untrack } from "@chrock-studio/signals/blocks";
 *
 * const items = Array.from({ length: 10 }).map((_, i) => signal(i));
 * effectScope(() => {
 *   effect(() => console.log("items:", items.map((item) => item())));
 *   // "items: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]"
 *
 *   batch(() => {
 *     items.forEach((item) => item(item() + 1));
 *   });
 *   // "items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]"
 *
 *   untrack(() => {
 *     items.forEach((item) => item(item() + 1));
 *   });
 *   // Nothing happened.
 * });
 * ```
 *
 * @example with decorators
 *
 * ```
 * import { signalization } from "@chrock-studio/signals/decorators";
 *
 * class State {
 *   // Readonly computed signal from getter
 *   \@signalization
 *   get fullName() {
 *     return `${this.first} ${this.last}`;
 *   }
 *
 *   // Writable signal from accessor
 *   \@signalization
 *   accessor count = 0;
 * }
 * ```
 *
 * @example with SignalProxy
 *
 * ```
 * import { createSignalProxy } from "@chrock-studio/signals";
 *
 * const obj = createSignalProxy({
 *   first: signal("John"),
 *   last: signal("Doe"),
 *   name: computed(() => `${obj.first$} ${obj.last$}`),
 * });
 *
 * effect(() => console.log(obj.name)); // > "John Doe"
 * obj.first$ = "Jane"; // > "Jane Doe"
 * ```
 */

export * from "./blocks/mod.ts";
export * from "./decorators/mod.ts";

export { type Delegate, delegate } from "@chrock-studio/shared/delegate";
export { createSignalProxy, revocableSignalProxy, type SignalProxy } from "@chrock-studio/signal-proxy";
