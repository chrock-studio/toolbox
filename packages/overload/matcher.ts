import type { StandardSchemaV1 } from "@standard-schema/spec";

/**
 * Infers the output types from an array of {@link StandardSchemaV1} checkers.
 *
 * Maps each checker in the array to its inferred output type, preserving the
 * tuple structure for use as implementation parameters.
 *
 * @template C - The tuple of StandardSchemaV1 checkers.
 */
export type InferProps<C extends StandardSchemaV1[]> = {
  [key in keyof C]: C[key] extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<C[key]> : C[key];
};

/**
 * Pattern matcher module for type-checking and pattern matching on input arrays.
 *
 * This module provides the `Matcher` class, which combines standard schema
 * checkers and implementation functions to validate whether input arrays
 * conform to expected type patterns and execute corresponding implementation
 * logic when validation passes.
 *
 * @example without Rest Parameters (using `check()`)
 *
 * ```typescript
 * import { check } from "./checker.ts";
 * import { Matcher } from "./matcher.ts";
 *
 * const str = check((x): x is string => typeof x === "string");
 * const num = check((x): x is number => typeof x === "number");
 *
 * const matcher = Matcher.make(
 *   [str, num],
 *   (name, age) => console.log(`Name: ${name}, Age: ${age}`),
 * );
 *
 * matcher.check(["John Doe", 18]); // => true
 * matcher.check(["John Doe", "18"]); // => false
 * matcher.implement("John Doe", 18); // => "Name: John Doe, Age: 18"
 * ```
 *
 * @example without Rest Parameters (using `zod`)
 *
 * ```typescript
 * import { z } from "zod";
 * import { Matcher } from "./matcher.ts";
 *
 * const matcher = Matcher.make(
 *   [z.string(), z.number()],
 *   (name, age) => console.log(`Name: ${name}, Age: ${age}`),
 * );
 *
 * matcher.check(["John Doe", 18]); // => true
 * matcher.check(["John Doe", "18"]); // => false
 * matcher.implement("John Doe", 18); // => "Name: John Doe, Age: 18"
 * ```
 *
 * @example with Rest Parameters (using `check()`)
 *
 * ```typescript
 * import { check } from "./checker.ts";
 * import { Matcher } from "./matcher.ts";
 *
 * const str = check((x): x is string => typeof x === "string");
 * const num = check((x): x is number => typeof x === "number");
 * const bool = check((x): x is boolean => typeof x === "boolean");
 *
 * const matcher = Matcher.make(
 *   [str, num],
 *   bool,
 *   (name, age, ...other) => console.log(`Name: ${name}, Age: ${age}, other: [${other.join(", ")}]`),
 * );
 *
 * matcher.check(["John Doe", 18, true, false]); // => true
 * matcher.check(["John Doe", 18, "bad"]); // => false
 * matcher.implement("John Doe", 18, true, false); // => "Name: John Doe, Age: 18, other: [true, false]"
 * ```
 *
 * @example with Rest Parameters (using `zod`)
 *
 * ```typescript
 * import { z } from "zod";
 * import { Matcher } from "./matcher.ts";
 *
 * const matcher = Matcher.make(
 *   [z.string(), z.number()],
 *   z.boolean(),
 *   (name, age, ...other) => console.log(`Name: ${name}, Age: ${age}, other: [${other.join(", ")}]`),
 * );
 *
 * matcher.check(["John Doe", 18, true, false]); // => true
 * matcher.check(["John Doe", 18, "bad"]); // => false
 * matcher.implement("John Doe", 18, true, false); // => "Name: John Doe, Age: 18, other: [true, false]"
 * ```
 *
 * @module "@chrock-studio/overload/matcher.ts"
 */
export class Matcher<Implement extends (...args: any[]) => any = (...args: any[]) => any> {
  /** Ordered list of standard schema validators for fixed parameters. */
  checkers: StandardSchemaV1["~standard"]["validate"][];
  /** Optional standard schema validator for rest parameters. */
  rest?: StandardSchemaV1["~standard"]["validate"];
  /** The implementation function called when input passes all checks. */
  implement: Implement;

  private constructor(
    checkers: StandardSchemaV1[],
    rest: StandardSchemaV1 | undefined,
    implement: Implement,
  ) {
    this.checkers = checkers.map((checker) => (data: unknown) => checker["~standard"].validate(data));
    this.rest = rest ? (data: unknown) => rest["~standard"].validate(data) : undefined;
    this.implement = implement;
  }

  /**
   * Checks whether the given input array matches all checker schemas.
   *
   * Validates each element against the corresponding checker in order.
   * If a rest checker is defined, any remaining elements are validated
   * against it. Returns `true` only when all validations pass.
   *
   * @param input - The array of values to validate.
   * @returns `true` if all elements pass their schema validations.
   */
  check(input: unknown[]): input is Parameters<Implement> {
    let i = 0;
    for (; i < this.checkers.length; i++) {
      if ((this.checkers[i](input[i]) as StandardSchemaV1.Result<unknown>).issues) {
        return false;
      }
    }
    if (this.rest && i < input.length) {
      for (; i < input.length; i++) {
        if ((this.rest(input[i]) as StandardSchemaV1.Result<unknown>).issues) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Creates a {@link Matcher} instance from checkers and an implementation.
   *
   * Supports two signatures:
   * - **2-arg**: `Matcher.make(checkers, implement)` — fixed parameters only.
   * - **3-arg**: `Matcher.make(checkers, rest, implement)` — with rest parameter checker.
   *
   * @param args - Either `(checkers, implement)` or `(checkers, rest, implement)`.
   * @returns A new `Matcher` instance.
   */
  static make = ((...args: any[]) => {
    let checkers, rest: any = void 0, implement;
    if (args.length === 2) {
      [checkers, implement] = args;
    } else if (args.length >= 3) {
      [checkers, rest, implement] = args;
    }
    return new Matcher(checkers, rest, implement);
  }) as {
    <
      const C extends StandardSchemaV1[],
      Rest extends StandardSchemaV1,
      R,
      P extends InferProps<C>,
      I extends (...args: [...P, ...StandardSchemaV1.InferOutput<Rest>[]]) => R = (
        ...args: [...P, ...StandardSchemaV1.InferOutput<Rest>[]]
      ) => R,
    >(
      checkers: C,
      rest: Rest,
      implement: I,
    ): Matcher<typeof implement>;
    <
      const C extends StandardSchemaV1[],
      R,
      P extends InferProps<C>,
      I extends (...args: [...P]) => R = (...args: [...P]) => R,
    >(checkers: C, implement: I): Matcher<typeof implement>;
  };
}
