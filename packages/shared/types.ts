/**
 * Utilities for type-check.
 * @module
 */

/**
 * Expand the given `<T>` if it's `object`.
 */
export type Flatten<T> = T extends object ? { [key in keyof T]: T[key] } : T;

/**
 * Either of `Promise<T>` or `T`.
 */
export type MaybePromise<T> = T | PromiseLike<T>;

/**
 * Empty object.
 */
export type EmptyData = Record<PropertyKey, unknown>;
