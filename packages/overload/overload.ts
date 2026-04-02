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
 * @example Creating an overloaded function
 *
 * ```ts
 * import { Overload } from "@chrock-studio/overload";
 *
 * // Create an overloaded function with fallback
 * const greet = Overload
 *   .withFallback((..._args: unknown[]) => "Unknown")
 *   .overload(
 *     [(x): x is string => typeof x === "string"],
 *     (name) => `Hello, ${name}!`
 *   )
 *   .overload(
 *     [(x): x is number => typeof x === "number"],
 *     (age) => `Age: ${age}`
 *   );
 *
 * greet("Alice"); // "Hello, Alice!"
 * greet(25);      // "Age: 25"
 * greet(true);    // "Unknown" (fallback)
 * ```
 *
 * @example Chaining multiple overloads
 *
 * ```ts
 * import { Overload } from "@chrock-studio/overload";
 *
 * const process = Overload
 *   .withFallback((...args: unknown[]) => console.log("No match for", args))
 *   .overload(
 *     [(x): x is string => typeof x === "string"],
 *     (s) => s.toUpperCase()
 *   )
 *   .overload(
 *     [(x): x is number => typeof x === "number"],
 *     (n) => n * 2
 *   );
 * ```
 *
 * @module "@chrock-studio/overload/overload.ts"
 */
import { Callable } from "./callable.ts";
import type { Checker, CheckersToParams } from "./checker.ts";
import { Matcher } from "./matcher.ts";
import type { UnionToIntersection } from "type-fest";

export type Overload<T extends Matcher[], F extends ((...args: any[]) => any) | undefined = undefined> =
  & (T extends { length: 0 } ? F extends undefined ? Record<PropertyKey, never> : F
    : UnionToIntersection<{ [key in keyof T]: T[key]["implement"] }[number]>)
  & {
    overload: {
      <
        const C extends Checker[],
        R = void,
        I extends (...args: CheckersToParams<C>) => R = (...args: CheckersToParams<C>) => R,
      >(
        checkers: C,
        implement: I,
      ): Overload<[Matcher<I>, ...T], F>;
      <
        const C extends Checker[],
        Rest extends Checker,
        R = void,
        I extends (...args: CheckersToParams<C>) => R = (...args: CheckersToParams<C>) => R,
      >(
        checkers: C,
        rest: Rest,
        implement: I,
      ): Overload<[Matcher<I>, ...T], F>;
    };
  }
  & (F extends undefined ? Record<PropertyKey, never> : F);
/**
 * The `Overload` represents an overloaded function that combines multiple
 * `Matcher` instances with an optional fallback function. When called, it
 * iterates through matchers to find the first matching implementation.
 *
 * @example Creating an overloaded function
 *
 * ```ts
 * import { Overload } from "@chrock-studio/overload";
 *
 * // Create an overloaded function with fallback
 * const greet = Overload
 *   .withFallback((..._args: unknown[]) => "Unknown")
 *   .overload(
 *     [(x): x is string => typeof x === "string"],
 *     (name) => `Hello, ${name}!`
 *   )
 *   .overload(
 *     [(x): x is number => typeof x === "number"],
 *     (age) => `Age: ${age}`
 *   );
 *
 * greet("Alice"); // "Hello, Alice!"
 * greet(25);      // "Age: 25"
 * greet(true);    // "Unknown" (fallback)
 * ```
 *
 * @example Chaining multiple overloads
 *
 * ```ts
 * import { Overload } from "@chrock-studio/overload";
 *
 * const process = Overload
 *   .withFallback((...args: unknown[]) => console.log("No match for", args))
 *   .overload(
 *     [(x): x is string => typeof x === "string"],
 *     (s) => s.toUpperCase()
 *   )
 *   .overload(
 *     [(x): x is number => typeof x === "number"],
 *     (n) => n * 2
 *   );
 * ```
 */
export const Overload = (class Overload extends Callable {
  matchers: Matcher[];
  fallback?: (...args: any[]) => any;

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

  overload(...args: any[]): any {
    return new Overload([Matcher.make(...args as [any, any]), ...this.matchers], this.fallback);
  }

  static withFallback(fn: (...args: any[]) => any) {
    return new Overload([], fn);
  }
}) as {
  new <const M extends Matcher[]>(matchers: M): Overload<M>;
  withFallback<Fn extends (...args: any[]) => any>(fn: Fn): Overload<[], Fn>;
};
