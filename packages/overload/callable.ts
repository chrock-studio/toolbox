/**
 * Provides a utility class for creating callable objects.
 *
 * This module exports the `Callable` class and `Callable` type:
 * - `Callable` class: Wraps a function as a callable object, allowing it to be
 *   invoked as a function while still having prototype methods.
 * - `Callable<Fn>` type: Represents the function type after being constructed
 *   by the `Callable` class.
 *
 * @example
 * ```ts
 * import { Callable } from "./callable.ts";
 *
 * const fn = new Callable((x: number) => x * 2);
 * fn(5); // 10
 * ```
 *
 * @module "@chrock-studio/overload/callable.ts"
 */

/**
 * Wraps a function as a callable object, allowing it to be invoked as a
 * function while still having prototype methods.
 *
 * The constructor replaces the function's prototype with the class instance,
 * enabling method access on the returned callable.
 */
export const Callable = class {
  constructor(fn: (...args: any[]) => any) {
    Object.setPrototypeOf(fn, this);
    return fn;
  }
} as {
  new <Fn extends (...args: any[]) => any = (...args: any[]) => any>(fn: Fn): Fn;
};

/**
 * Represents the function type after being constructed by the `Callable` class.
 */
export type Callable<Fn extends (...args: any[]) => any = (...args: any[]) => any> = InstanceType<typeof Callable<Fn>>;
