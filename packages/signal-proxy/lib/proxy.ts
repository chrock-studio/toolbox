import type { Flatten } from "@chrock-studio/shared/types";

export type MatchFunction<O, K extends keyof O = keyof O> = keyof {
  [key in K as O[key] extends (...args: any[]) => any ? key : never]: true;
};

export type MatchGetter<
  O,
  K extends MatchFunction<O, keyof O> = MatchFunction<O, keyof O>,
  F = O[K],
> = F extends (...args: infer R) => any ? (R extends { length: 0 } ? K : never) : never;

export type MatchSetter<
  O,
  K extends MatchFunction<O, keyof O> = MatchFunction<O, keyof O>,
  F = O[K],
> = F extends (...args: infer R) => any ? (R extends { length: 0 } ? never : K) : never;

export type SignalProxySetters<
  T extends object,
  K extends MatchFunction<T, Exclude<keyof T, symbol>> = MatchFunction<T, Exclude<keyof T, symbol>>,
> = {
  [key in MatchSetter<T, K> as `${string & key}$`]: T[key] extends (arg: infer R) => any
    ? R
    : never;
};

export type SignalProxyWrapper<T> = T extends object ? SignalProxy<T> : T;

export type SignalProxyGetters<
  T extends object,
  K extends MatchFunction<T, Exclude<keyof T, symbol>> = MatchFunction<T, Exclude<keyof T, symbol>>,
> = {
  readonly [key in MatchGetter<
    T,
    Exclude<K, keyof SignalProxySetters<T, K>>
  > as `${string & key}$`]: SignalProxyWrapper<ReturnType<T[key]>>;
};

export type SignalProxy<
  T extends object,
  K extends MatchFunction<T, Exclude<keyof T, symbol>> = MatchFunction<T, Exclude<keyof T, symbol>>,
> = Flatten<T & SignalProxySetters<T, K> & SignalProxyGetters<T, K>>;

/**
 * Creates a signal proxy for the given object and returns the proxy directly.
 *
 * This is a convenience function that creates a revocable signal proxy and
 * immediately returns the proxy, discarding the revoke function. Use this
 * when you don't need to manually revoke the proxy.
 *
 * @typeParam T - The type of the object to proxy.
 * @param obj - The object to create a signal proxy for.
 * @returns A signal proxy that wraps the original object.
 *
 * @example
 * ```ts
 * import { delegate } from "@chrock-studio/shared";
 *
 * const obj = {
 *   __name: 'John',
 *   name: delegate(
 *     () => obj.__name,
 *     (val) => void (obj.__name = val),
 *   ),
 * };
 *
 * const proxy = createSignalProxy(obj);
 *
 * // Access getter
 * console.log(proxy.name$); // "John"
 *
 * // Set value
 * proxy.name$ = 'Jane';
 * console.log(proxy.name$); // "Jane"
 * ```
 *
 * @see {@link revocableSignalProxy} For creating a revocable proxy.
 */
export const createSignalProxy = <T extends object>(obj: T) => revocableSignalProxy(obj).proxy;

/**
 * Creates a revocable signal proxy for the given object.
 *
 * This function creates a Proxy that provides a reactive signal-like API for
 * accessing and mutating object properties. It automatically detects getter/setter
 * patterns in the object and exposes them through a `$` suffix convention.
 *
 * ## How It Works
 *
 * The proxy analyzes the object's methods to determine which are getters (methods
 * with no parameters) and which are setters (methods with parameters). These are
 * then exposed through properties with a `$` suffix:
 *
 * - **Getter**: A method with zero parameters becomes accessible as `prop$`
 *   (e.g., `name()` → `name$`)
 * - **Setter**: A method with one or more parameters becomes settable as `prop$`
 *   (e.g., `name(value)` → `proxy.name$ = value`)
 *
 * ## Disposal
 *
 * The returned proxy object implements the `Symbol.dispose` and `Symbol.asyncDispose`
 * protocols, allowing it to be used in `using` statements for automatic cleanup.
 *
 * @typeParam T - The type of the object to proxy.
 * @param obj - The object to create a revocable signal proxy for.
 * @returns An object containing:
 *   - `proxy`: The signal proxy that wraps the original object.
 *   - `revoke`: A function to revoke the proxy, disabling all traps.
 *
 * @example
 * ```ts
 * import { delegate } from "@chrock-studio/shared";
 *
 * const obj = {
 *   __name: 'John',
 *   name: delegate(
 *     () => obj.__name,
 *     (val) => void (obj.__name = val),
 *   ),
 * };
 *
 * const { proxy, revoke } = revocableSignalProxy(obj);
 *
 * // Access getter
 * console.log(proxy.name$); // "John"
 *
 * // Set value
 * proxy.name$ = 'Jane';
 * console.log(proxy.name$); // "Jane"
 *
 * // Revoke the proxy when done
 * revoke();
 * ```
 *
 * @example Using with `using` statement (explicit resource management)
 * ```ts
 * {
 *   using proxy = revocableSignalProxy(obj);
 *   console.log(proxy.proxy.name$); // "John"
 *   // proxy is automatically revoked at end of scope
 * }
 * ```
 *
 * @remarks
 * - The recommended `Getter`/`Setter` pattern is preferably an **idempotent operation**.
 *   This means calling the getter multiple times should return the same value without
 *   side effects, and setting the same value multiple times should have the same effect
 *   as setting it once.
 * - The proxy caches getter/setter lookups for performance.
 * - Nested objects are automatically wrapped in signal proxies when accessed.
 *
 * @see {@link createSignalProxy} For a non-revocable version.
 * @see {@link SignalProxy} For the type definition of the proxy.
 */
export const revocableSignalProxy = <T extends object>(obj: T) => {
  let result = caches.get(obj) as RevocableProxy<SignalProxy<T>>;
  if (!result) {
    const getters = new Map<unknown, () => unknown>();
    const setters = new Map<unknown, (value: unknown) => void>();

    caches.set(
      obj,
      (result = Proxy.revocable(obj as SignalProxy<T>, {
        get(target, prop: string | symbol) {
          if (prop === Symbol.dispose || prop === Symbol.asyncDispose) {
            return result.revoke;
          }
          let getter = getters.get(prop);
          if (!getter) {
            getters.set(
              prop,
              (getter = doMatch(
                obj,
                prop,
                (_, getter) => () => hit(getter.call(target)),
                () => () => Reflect.get(target, prop),
              )),
            );
          }
          return getter();
        },

        set(target, prop: string | symbol, newValue: unknown) {
          let setter = setters.get(prop);
          if (!setter) {
            setters.set(
              prop,
              (setter = doMatch(
                obj,
                prop,
                (_, setter) => (value) => setter.call(target, value),
                () => (value) => Reflect.set(target, prop, value),
              )),
            );
          }
          setter(newValue);
          return true;
        },
      })),
    );
  }

  return result;
};
createSignalProxy.revocable = revocableSignalProxy;

//#region Utilities
interface RevocableProxy<T> {
  proxy: T;
  revoke: () => void;
}

const getProp = (obj: object, prop: PropertyKey) => {
  const value = Reflect.get(obj, prop);
  if (typeof value !== "function") throw errors.NOT_FUNCTION(prop);
  return value;
};

// Create a cache for proxy instances to store getter results
// This ensures that the same getter property always returns the same proxy instance
const caches = new WeakMap<object, RevocableProxy<object>>();

const match = (prop: unknown): prop is string => typeof prop === "string" && prop.endsWith("$");
const doMatch = <T, R>(
  obj: object,
  prop: unknown,
  on: (prop: string, value: (...args: any[]) => any) => T,
  off: () => R,
) => (match(prop) ? on(prop.slice(0, -1), getProp(obj, prop)) : off());

const hit = (obj: unknown) =>
  obj !== null && typeof obj === "object" ? createSignalProxy(obj) : obj;

const errors = {
  NOT_FUNCTION: (prop: unknown) =>
    new TypeError(`Property '${String(prop)}' is not a function, cannot use '$' accessor`),
};
//#endregion Utilities
