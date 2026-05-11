/**
 * Function Overloading Module
 *
 * This module provides the core `Overload` class and type for implementing
 * type-safe runtime function overloading. It allows creating functions that
 * dispatch to different implementations based on argument types, with full
 * TypeScript type inference support.
 *
 * The `Overload` type represents an overloaded function that combines multiple
 * `Matcher` instances with an optional fallback function. When called, it
 * iterates through matchers to find the first matching implementation.
 *
 * @example Creating an overloaded function (using `check()`)
 *
 * ```ts
 * import { check } from "@chrock-studio/overload";
 * import { Overload } from "@chrock-studio/overload";
 *
 * const str = check((x): x is string => typeof x === "string");
 * const num = check((x): x is number => typeof x === "number");
 *
 * // Create an overloaded function with fallback
 * const greet = Overload
 *   .withFallback((..._args: unknown[]) => "Unknown")
 *   .overload(
 *     [str],
 *     (name) => `Hello, ${name}!`
 *   )
 *   .overload(
 *     [num],
 *     (age) => `Age: ${age}`
 *   );
 *
 * greet("Alice"); // "Hello, Alice!"
 * greet(25);      // "Age: 25"
 * greet(true);    // "Unknown" (fallback)
 * ```
 *
 * @example Creating an overloaded function (using `zod`)
 *
 * ```ts
 * import { Overload } from "@chrock-studio/overload";
 * import { z } from "zod";
 *
 * // Create an overloaded function with fallback
 * const greet = Overload
 *   .withFallback((..._args: unknown[]) => "Unknown")
 *   .overload(
 *     [z.string()],
 *     (name) => `Hello, ${name}!`
 *   )
 *   .overload(
 *     [z.number()],
 *     (age) => `Age: ${age}`
 *   );
 *
 * greet("Alice"); // "Hello, Alice!"
 * greet(25);      // "Age: 25"
 * greet(true);    // "Unknown" (fallback)
 * ```
 *
 * @example Chaining multiple overloads (using `check()`)
 *
 * ```ts
 * import { check } from "@chrock-studio/overload";
 * import { Overload } from "@chrock-studio/overload";
 *
 * const str = check((x): x is string => typeof x === "string");
 * const num = check((x): x is number => typeof x === "number");
 *
 * const process = Overload
 *   .withFallback((...args: unknown[]) => console.log("No match for", args))
 *   .overload(
 *     [str],
 *     (s) => s.toUpperCase()
 *   )
 *   .overload(
 *     [num],
 *     (n) => n * 2
 *   );
 * ```
 *
 * @example Chaining multiple overloads (using `zod`)
 *
 * ```ts
 * import { Overload } from "@chrock-studio/overload";
 * import { z } from "zod";
 *
 * const process = Overload
 *   .withFallback((...args: unknown[]) => console.log("No match for", args))
 *   .overload(
 *     [z.string()],
 *     (s) => s.toUpperCase()
 *   )
 *   .overload(
 *     [z.number()],
 *     (n) => n * 2
 *   );
 * ```
 *
 * @module "@chrock-studio/overload/overload.ts"
 */
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { Callable } from "./callable.ts";
import { type InferProps, Matcher } from "./matcher.ts";
import type { UnionToIntersection } from "type-fest";

/**
 * Represents an overloaded function created by the `Overload` class.
 *
 * Combines the implementations of multiple `Matcher` instances into a single
 * callable intersection type. When `F` (fallback) is provided, it is included
 * in the intersection. The type also exposes an `overload` method for chaining
 * additional branches.
 *
 * @template T - Tuple of matchers whose implementations form the callable.
 * @template F - Optional fallback function signature.
 */
export type Overload<T extends Matcher[], F extends ((...args: any[]) => any) | undefined = undefined> =
  & (T extends { length: 0 } ? F extends undefined ? Record<PropertyKey, never> : F
    : UnionToIntersection<{ [key in keyof T]: T[key]["implement"] }[number]>)
  & {
    overload: {
      <
        const C extends StandardSchemaV1[],
        R = void,
        I extends (...args: InferProps<C>) => R = (...args: InferProps<C>) => R,
      >(
        checkers: C,
        implement: I,
      ): Overload<[Matcher<I>, ...T], F>;
      <
        const C extends StandardSchemaV1[],
        Rest extends StandardSchemaV1,
        R = void,
        I extends (...args: [...InferProps<C>, ...StandardSchemaV1.InferOutput<Rest>[]]) => R = (
          ...args: [...InferProps<C>, ...StandardSchemaV1.InferOutput<Rest>[]]
        ) => R,
      >(
        checkers: C,
        rest: Rest,
        implement: I,
      ): Overload<[Matcher<I>, ...T], F>;
    };
  }
  & (F extends undefined ? Record<PropertyKey, never> : F);
/**
 * The `Overload` class provides type-safe runtime function overloading.
 *
 * Combines multiple `Matcher` instances with an optional fallback function.
 * When called, it iterates through matchers to find the first matching
 * implementation. Supports type inference through a chainable API.
 *
 * @example Creating an overloaded function (using `check()`)
 *
 * ```ts
 * import { check, Overload } from "@chrock-studio/overload";
 *
 * const str = check((x): x is string => typeof x === "string");
 * const num = check((x): x is number => typeof x === "number");
 *
 * // Create an overloaded function with fallback
 * const greet = Overload
 *   .withFallback((..._args: unknown[]) => "Unknown")
 *   .overload(
 *     [str],
 *     (name) => `Hello, ${name}!`
 *   )
 *   .overload(
 *     [num],
 *     (age) => `Age: ${age}`
 *   );
 *
 * greet("Alice"); // "Hello, Alice!"
 * greet(25);      // "Age: 25"
 * greet(true);    // "Unknown" (fallback)
 * ```
 *
 * @example Creating an overloaded function (using `zod`)
 *
 * ```ts
 * import { Overload } from "@chrock-studio/overload";
 * import { z } from "zod";
 *
 * // Create an overloaded function with fallback
 * const greet = Overload
 *   .withFallback((..._args: unknown[]) => "Unknown")
 *   .overload(
 *     [z.string()],
 *     (name) => `Hello, ${name}!`
 *   )
 *   .overload(
 *     [z.number()],
 *     (age) => `Age: ${age}`
 *   );
 *
 * greet("Alice"); // "Hello, Alice!"
 * greet(25);      // "Age: 25"
 * greet(true);    // "Unknown" (fallback)
 * ```
 *
 * @example Chaining multiple overloads (using `check()`)
 *
 * ```ts
 * import { check, Overload } from "@chrock-studio/overload";
 *
 * const str = check((x): x is string => typeof x === "string");
 * const num = check((x): x is number => typeof x === "number");
 *
 * const process = Overload
 *   .withFallback((...args: unknown[]) => console.log("No match for", args))
 *   .overload(
 *     [str],
 *     (s) => s.toUpperCase()
 *   )
 *   .overload(
 *     [num],
 *     (n) => n * 2
 *   );
 * ```
 *
 * @example Chaining multiple overloads (using `zod`)
 *
 * ```ts
 * import { Overload } from "@chrock-studio/overload";
 * import { z } from "zod";
 *
 * const process = Overload
 *   .withFallback((...args: unknown[]) => console.log("No match for", args))
 *   .overload(
 *     [z.string()],
 *     (s) => s.toUpperCase()
 *   )
 *   .overload(
 *     [z.number()],
 *     (n) => n * 2
 *   );
 * ```
 */
export const Overload = (class Overload extends Callable {
  /** Ordered list of matchers to test against on each invocation. */
  matchers: Matcher[];
  /** Optional fallback function invoked when no matcher matches. */
  fallback?: (...args: any[]) => any;

  /**
   * Creates an `Overload` instance with the given matchers and optional fallback.
   *
   * Wraps the dispatch logic in a callable function that iterates through
   * matchers and invokes the first matching implementation, or the fallback
   * if none match.
   *
   * @param matchers - The matchers to check against in order.
   * @param fallback - Optional function to call when no matcher matches.
   */
  constructor(matchers: Matcher[], fallback?: (...args: any[]) => any) {
    super(function (this: unknown, ...args: any[]): any {
      let fn = fallback;

      for (const matcher of matchers) {
        if (matcher.check(args)) {
          fn = matcher.implement;
          break;
        }
      }

      if (fn) {
        return fn.apply(this, args);
      } else {
        throw new TypeError("No overload matched");
      }
    });
    this.matchers = matchers;
    this.fallback = fallback;
  }

  /**
   * Adds a new overload branch to the function.
   *
   * Accepts either `(checkers, implement)` or `(checkers, rest, implement)`
   * to define a new matcher. New matchers are prepended, so the last added
   * branch is checked first.
   *
   * @param args - Arguments forwarded to `Matcher.make()`.
   * @returns A new `Overload` instance with the added matcher.
   */
  overload(...args: any[]): any {
    return new Overload([Matcher.make(...args as [any, any]), ...this.matchers], this.fallback);
  }

  /**
   * Creates an `Overload` with only a fallback function and no matchers.
   *
   * This is the starting point for building an overloaded function.
   * Subsequent `.overload()` calls add typed branches.
   *
   * @param fn - The fallback function for unmatched calls.
   * @returns A new `Overload` instance with only the fallback.
   */
  static withFallback(fn: (...args: any[]) => any) {
    return new Overload([], fn);
  }
}) as {
  new <const M extends Matcher[]>(matchers: M): Overload<M>;
  withFallback<Fn extends (...args: any[]) => any>(fn: Fn): Overload<[], Fn>;
};
