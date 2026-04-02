import type { Checker, CheckersToParams, CheckerToParam } from "./checker.ts";

/**
 * Pattern matcher module for type-checking and pattern matching on input arrays.
 *
 * This module provides the `Matcher` class, which combines type guard checkers
 * and implementation functions to validate whether input arrays conform to
 * expected type patterns and execute corresponding implementation logic when
 * validation passes.
 *
 * @example without Rest Parameters
 *
 * ```typescript
 * const matcher = Matcher.make(
 *   [
 *     (x): x is string => typeof x === "string",
 *     (x): x is number => typeof x === "number",
 *   ],
 *   (name, age) => console.log(`Name: ${name}, Age: ${age}`),
 * );
 *
 * matcher.check(["John Doe", 18, true, false, true]); // with extra parameters => true
 * matcher.check(["John Doe", "18"]); // type not matched => false
 * matcher.implement("John Doe", 18, true, false, true); // call it => "Name: John Doe, Age: 18"
 * ```
 *
 * @example with Rest Parameters
 *
 * ```typescript
 * const matcher = Matcher.make(
 *   [
 *     (x): x is string => typeof x === "string",
 *     (x): x is number => typeof x === "number",
 *   ],
 *   (x): x is boolean => typeof x === "boolean",
 *   (name, age, ...other) => console.log(`Name: ${name}, Age: ${age}, and other: [${other.join(", ")}]`),
 * );
 *
 * matcher.check(["John Doe", 18, true, false, true]); with rest parameters // => true
 * matcher.check(["John Doe", "18"]); // type not matched => false
 * matcher.implement("John Doe", 18, true, false, true); // call it => "Name: John Doe, Age: 18, and other: [true, false, true]"
 * ```
 *
 * @module "@chrock-studio/overload/matcher.ts"
 */
export class Matcher<Implement extends (...args: any[]) => any = (...args: any[]) => any> {
  checkers: Checker[];
  rest?: Checker;
  implement: Implement;

  private constructor(
    checkers: Checker[],
    rest: Checker,
    implement: Implement,
  ) {
    this.checkers = checkers;
    this.rest = rest;
    this.implement = implement;
  }
  check(input: unknown[]): input is Parameters<Implement> {
    let i = 0;
    for (; i < this.checkers.length; i++) {
      if (!this.checkers[i](input[i])) {
        return false;
      }
    }
    if (this.rest && i < input.length) {
      for (; i < input.length; i++) {
        if (!this.rest(input[i])) {
          return false;
        }
      }
    }
    return true;
  }

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
      const C extends Checker[],
      Rest extends Checker,
      R,
      P extends CheckersToParams<C>,
    >(checkers: C, rest: Rest, implement: (...args: [...P, ...CheckerToParam<Rest>[]]) => R): Matcher<typeof implement>;
    <
      const C extends Checker[],
      R,
      P extends CheckersToParams<C>,
    >(checkers: C, implement: (...args: [...P]) => R): Matcher<typeof implement>;
  };
}
