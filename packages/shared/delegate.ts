/**
 * The `delegate` function creates a getter/setter delegate object that allows you to get or set a value through a single function call.
 * @module
 */

/**
 * Creates a delegate function that acts as both a getter and setter.
 * When called without arguments, it returns the current value.
 * When called with an argument, it sets the new value.
 *
 * @template T - The type of the value being delegated
 * @param getter - A function that returns the current value
 * @param setter - A function that sets a new value
 * @returns A Delegate function that can get or set the value
 *
 * @example
 * ```typescript
 * let value = 42;
 * const d = delegate(() => value, (v) => { value = v; });
 *
 * d();     // 42 (getter)
 * d(100);  // sets value to 100 (setter)
 * d();     // 100
 * ```
 */
export const delegate = <T>(getter: () => T, setter: (value: T) => void): Delegate<T> =>
  (delegateOperator as Delegate<T>).bind({ getter, setter });

/**
 * A delegate function type that combines getter and setter behavior.
 * - Called without arguments: returns the current value (getter)
 * - Called with an argument: sets the new value (setter)
 *
 * @template T - The type of the value
 */
export interface Delegate<T> {
  (): T;
  (value: T): void;
}

/**
 * Internal operator function that handles the getter/setter logic.
 * Uses `this` context to access the getter and setter functions.
 *
 * @template T - The type of the value
 * @param this - Context containing getter and setter functions
 * @param args - Either empty (for getter) or a single value (for setter)
 * @returns The current value when called as getter, undefined when called as setter
 */
function delegateOperator<T>(
  this: { getter: () => T; setter: (value: T) => void },
  ...args: [] | [value: T]
) {
  if (args.length) this.setter.apply(null, args);
  else return this.getter.apply(null);
}
