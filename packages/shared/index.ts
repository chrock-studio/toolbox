/**
 * A simply library for `@chrock-studio`'s packages.
 *
 * @example import and use
 * ```
 * import { delegate } from "@chrock-studio/shared";
 *
 * let answer = 42;
 * const num = delegate(() => answer, (value) => answer = value);
 * console.log(num()); // -> 42
 * console.log(num(100)); // -> undefined
 * console.log(num()); // -> 100
 * ```
 *
 * @example with tree-shakes
 * ```
 * import { delegate } from "@chrock-studio/shared/delegate";
 * ```
 *
 * @module
 */

export * from "./delegate.ts";

export type * from "./types.ts";
