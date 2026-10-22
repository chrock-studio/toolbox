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
 * Every overloaded function also exposes an `aot()` method that returns an
 * ahead-of-time compiled counterpart, and `Overload.aot` mirrors the builder
 * API for functions that should be compiled from the start.
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
import { compile, type Dispatch } from "./compile.ts";
import { type InferProps, Matcher } from "./matcher.ts";
import type { UnionToIntersection } from "type-fest";

/**
 * Represents an overloaded function created by the `Overload` class.
 *
 * Combines the implementations of multiple `Matcher` instances into a single
 * callable intersection type. When `F` (fallback) is provided, it is included
 * in the intersection. The type also exposes an `overload` method for chaining
 * additional branches, and an `aot` method for obtaining a precompiled variant.
 *
 * @template T - Tuple of matchers whose implementations form the callable.
 * @template F - Optional fallback function signature.
 */
export type Overload<T extends Matcher[], F extends ((...args: any[]) => any) | undefined = undefined> = (T extends {
  length: 0;
}
  ? F extends undefined
    ? Record<PropertyKey, never>
    : F
  : UnionToIntersection<{ [key in keyof T]: T[key]["implement"] }[number]>) & {
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
} & {
  /**
   * Returns an ahead-of-time compiled version of this overloaded function.
   *
   * The returned function behaves identically but dispatches through a
   * specialized function generated when it is created. It captures the branches
   * present at call time, so build the whole chain first and call `aot()` once.
   * Calling `aot()` on an already compiled function returns the same function.
   *
   * When the runtime forbids code generation (for example a strict Content
   * Security Policy), a warning is printed once and an interpreted function is
   * returned instead.
   *
   * @returns The precompiled counterpart, or `this` when already precompiled.
   */
  aot: () => Overload<T, F>;
} & (F extends undefined ? Record<PropertyKey, never> : F);

/**
 * Constructor surface of the `Overload` value.
 *
 * Exposes the interpreted builder (`new Overload(...)`, `Overload.withFallback`)
 * and its precompiled mirror (`Overload.aot`).
 */
export type OverloadConstructor = {
  new <const M extends Matcher[]>(matchers: M): Overload<M>;
  withFallback<Fn extends (...args: any[]) => any>(fn: Fn): Overload<[], Fn>;
  /**
   * Builder for precompiled overloaded functions.
   *
   * Mirrors the `Overload` surface: use `Overload.aot.withFallback(...)` to get
   * functions whose dispatcher is generated ahead of time, or reach for
   * `fn.aot()` to upgrade an existing function.
   *
   * Each `.overload()` compiles its intermediate function, so building a long
   * chain this way compiles once per step. Call `aot()` on a finished chain when
   * a single compilation is preferred.
   */
  readonly aot: OverloadConstructor;
};

/** Any function usable as an overload fallback. */
type Fallback = (...args: any[]) => any;

/** Builds the callable returned by an `Overload` constructor. */
type DispatchFactory = (matchers: Matcher[], fallback?: Fallback) => Dispatch;

/**
 * Interpreted dispatcher: walks matchers in order and forwards every argument.
 *
 * Used by `Overload`, and also as the fallback whenever AOT compilation is not
 * possible.
 */
const interpret: DispatchFactory = (matchers, fallback) =>
  function (this: unknown, ...args: any[]): any {
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
  };

/** Dispatcher used by precompiled overloads: compile first, interpret on failure. */
const aotDispatch: DispatchFactory = (matchers, fallback) =>
  compile(matchers, fallback) ?? interpret(matchers, fallback);

/** Runtime implementation shared by `Overload` and its precompiled variant. */
class OverloadImpl extends Callable {
  /** Ordered list of matchers to test against on each invocation. */
  matchers: Matcher[];
  /** Optional fallback function invoked when no matcher matches. */
  fallback?: Fallback;

  /**
   * Creates an `Overload` instance with the given matchers and optional fallback.
   *
   * Wraps the dispatch logic in a callable function that iterates through
   * matchers and invokes the first matching implementation, or the fallback
   * if none match.
   *
   * @param matchers - The matchers to check against in order.
   * @param fallback - Optional function to call when no matcher matches.
   * @param makeDispatch - Dispatcher factory; internal, defaults to the interpreter.
   */
  constructor(matchers: Matcher[], fallback?: Fallback, makeDispatch: DispatchFactory = interpret) {
    super(makeDispatch(matchers, fallback));
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
    const Ctor = this.constructor as new (matchers: Matcher[], fallback?: Fallback) => OverloadImpl;
    return new Ctor([Matcher.make(...(args as [any, any])), ...this.matchers], this.fallback);
  }

  /**
   * Returns a precompiled counterpart of this overloaded function.
   *
   * The counterpart captures the branches present now, so call `aot()` once the
   * chain is complete rather than after every `overload()`.
   *
   * @returns A new, ahead-of-time compiled function.
   */
  aot(): any {
    return new AOTOverload(this.matchers, this.fallback);
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
  static withFallback(fn: Fallback) {
    return new this([], fn);
  }
}

/**
 * Precompiled variant of `Overload`.
 *
 * Instances are produced by `Overload.aot` and `.aot()`. When code generation is
 * unavailable they transparently fall back to interpreted dispatch.
 */
class AOTOverload extends OverloadImpl {
  constructor(matchers: Matcher[], fallback?: Fallback) {
    super(matchers, fallback, aotDispatch);
  }

  override aot(): any {
    return this;
  }
}

Object.defineProperty(OverloadImpl, "aot", { value: AOTOverload, enumerable: false, configurable: true });

/**
 * The `Overload` class provides type-safe runtime function overloading.
 *
 * Combines multiple `Matcher` instances with an optional fallback function.
 * When called, it iterates through matchers to find the first matching
 * implementation. Supports type inference through a chainable API.
 *
 * Use `Overload.aot` instead of `Overload` to build a function whose dispatcher
 * is compiled ahead of time, or call `fn.aot()` on an existing function. See
 * `Overload.aot` for details.
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
 * greet(true);    // "Unknown"
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
 * greet(true);    // "Unknown"
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
 *
 * @example Precompiled dispatch
 *
 * ```ts
 * import { check, Overload } from "@chrock-studio/overload";
 *
 * const str = check((x): x is string => typeof x === "string");
 * const num = check((x): x is number => typeof x === "number");
 *
 * // Build normally, then upgrade the finished function.
 * const greet = Overload
 *   .withFallback((..._args: unknown[]) => "Unknown")
 *   .overload([str], (name) => `Hello, ${name}!`)
 *   .overload([num], (age) => `Age: ${age}`);
 *
 * const fast = greet.aot();
 * fast("Alice"); // "Hello, Alice!"
 * ```
 */
export const Overload = OverloadImpl as unknown as OverloadConstructor;
