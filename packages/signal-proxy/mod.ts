/**
 * # Signal Proxy - A reactive signal-like API for accessing and mutating object properties.
 *
 * This module provides a Proxy-based solution that automatically detects getter/setter
 * patterns in objects and exposes them through a `$` suffix convention, creating a
 * signal-like reactive API.
 *
 * ## Key Features
 *
 * - **Automatic Detection**: Automatically identifies getter (zero-parameter) and setter
 *   (parameterized) methods in objects
 * - **`$` Suffix Convention**: Exposes getters and setters through properties with `$` suffix
 * - **Nested Object Support**: Automatically wraps nested objects in signal proxies
 * - **Revocable Proxies**: Supports both revocable and non-revocable proxy creation
 * - **Resource Management**: Implements `Symbol.dispose` and `Symbol.asyncDispose` protocols
 *
 * ## Convention
 *
 * - **Getter**: A method with zero parameters becomes accessible as `prop$`
 *   (e.g., `name()` → `name$`)
 * - **Setter**: A method with one or more parameters becomes settable as `prop$`
 *   (e.g., `name(value)` → `proxy.name$ = value`)
 *
 * @example Basic usage with delegate pattern
 * ```ts
 * import { delegate } from "@chrock-studio/shared";
 * import { createSignalProxy } from "@chrock-studio/signal-proxy";
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
 * @example Using with revocable proxy
 * ```ts
 * import { delegate } from "@chrock-studio/shared";
 * import { revocableSignalProxy } from "@chrock-studio/signal-proxy";
 *
 * const obj = {
 *   __count: 0,
 *   count: delegate(
 *     () => obj.__count,
 *     (val) => void (obj.__count = val),
 *   ),
 * };
 *
 * const { proxy, revoke } = revocableSignalProxy(obj);
 *
 * proxy.count$ = 10;
 * console.log(proxy.count$); // 10
 *
 * // Revoke when done
 * revoke();
 * ```
 *
 * @example Using with `using` statement (explicit resource management)
 * ```ts
 * import { delegate } from "@chrock-studio/shared";
 * import { revocableSignalProxy } from "@chrock-studio/signal-proxy";
 *
 * const obj = {
 *   __value: 'test',
 *   value: delegate(
 *     () => obj.__value,
 *     (val) => void (obj.__value = val),
 *   ),
 * };
 *
 * {
 *   using { proxy } = revocableSignalProxy(obj);
 *   console.log(proxy.value$); // "test"
 *   // proxy is automatically revoked at end of scope
 * }
 * ```
 *
 * @example Nested object support
 * ```ts
 * import { delegate } from "@chrock-studio/shared";
 * import { createSignalProxy } from "@chrock-studio/signal-proxy";
 *
 * const nested = {
 *   __data: { id: 1 },
 *   data: delegate(
 *     () => nested.__data,
 *     (val) => void (nested.__data = val),
 *   ),
 * };
 *
 * const proxy = createSignalProxy(nested);
 *
 * // Nested objects are automatically wrapped
 * const dataProxy = proxy.data$;
 * console.log(dataProxy.id$); // Access nested properties
 * ```
 *
 * @see {@link createSignalProxy} For creating a non-revocable signal proxy
 * @see {@link revocableSignalProxy} For creating a revocable signal proxy
 * @see {@link SignalProxy} For the type definition of the proxy
 *
 * @module signal-proxy
 */

// deno-lint-ignore-file no-explicit-any
import type { Flatten } from "@chrock-studio/shared/types";

type MatchFunction<O, K extends keyof O = keyof O> = keyof {
  [key in K as O[key] extends (...args: any[]) => any ? key : never]: true;
};

type MatchGetter<
  O,
  K extends MatchFunction<O, keyof O> = MatchFunction<O, keyof O>,
  F = O[K],
> = F extends (...args: infer R) => any ? (R extends { length: 0 } ? K : never) : never;

type MatchSetter<
  O,
  K extends MatchFunction<O, keyof O> = MatchFunction<O, keyof O>,
  F = O[K],
> = F extends (...args: infer R) => any ? (R extends { length: 0 } ? never : K) : never;

type SignalProxySetters<
  T extends object,
  K extends MatchFunction<T, Exclude<keyof T, symbol>> = MatchFunction<T, Exclude<keyof T, symbol>>,
> = {
  [key in MatchSetter<T, K> as `${string & key}$`]: T[key] extends (arg: infer R) => any ? R : never;
};

type SignalProxyWrapper<T> = T extends object ? SignalProxy<T> : T;

type SignalProxyGetters<
  T extends object,
  K extends MatchFunction<T, Exclude<keyof T, symbol>> = MatchFunction<T, Exclude<keyof T, symbol>>,
> = {
  readonly [
    key in MatchGetter<T, Exclude<K, keyof SignalProxySetters<T, K>>> as `${string & key}$`
  ]: SignalProxyWrapper<ReturnType<T[key]>>;
};

/**
 * SignalProxy.
 */
export type SignalProxy<T extends object> = Flatten<
  T & SignalProxySetters<T> & SignalProxyGetters<T> & Disposable & AsyncDisposable
>;

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
export const createSignalProxy = <T extends object>(obj: T): SignalProxy<T> => revocableSignalProxy(obj).proxy;

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
 *   using proxy = createSignalProxy(obj);
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
export const revocableSignalProxy = <T extends object>(obj: T): RevocableProxy<SignalProxy<T>> => {
  let result = caches.get(obj) as RevocableProxy<SignalProxy<T>>;
  if (!result) {
    const getters = new Map<unknown, () => unknown>();
    const setters = new Map<unknown, (value: unknown) => void>();

    caches.set(
      obj,
      result = Proxy.revocable(obj as SignalProxy<T>, {
        get(target, prop: string | symbol) {
          if (prop === Symbol.dispose || prop === Symbol.asyncDispose) {
            return result.revoke;
          }
          let getter = getters.get(prop);
          if (!getter) {
            getters.set(
              prop,
              getter = doMatch(
                obj,
                prop,
                (_, getter) => () => hit(getter.call(target)),
                () => () => Reflect.get(target, prop),
              ),
            );
          }
          return getter();
        },

        set(target, prop: string | symbol, newValue: unknown) {
          let setter = setters.get(prop);
          if (!setter) {
            setters.set(
              prop,
              setter = doMatch(
                obj,
                prop,
                (_, setter) => (value) => setter.call(target, value),
                () => (value) => Reflect.set(target, prop, value),
              ),
            );
          }
          setter(newValue);
          return true;
        },
      }),
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
) => (match(prop) ? on(prop = prop.slice(0, -1), getProp(obj, prop as string)) : off());

const hit = (obj: unknown) => obj !== null && typeof obj === "object" ? createSignalProxy(obj) : obj;

const errors = {
  NOT_FUNCTION: (prop: unknown) =>
    new TypeError(`Property '${String(prop)}' is not a function, cannot use '$' accessor`),
};
//#endregion Utilities
