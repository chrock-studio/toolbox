/**
 * Internal shared state for `@chrock-studio/overload`.
 *
 * This module is intentionally excluded from the package export map. It only
 * exists so that {@link ./checker.ts}, {@link ./matcher.ts} and
 * {@link ./compile.ts} can share implementation details without widening the
 * public API.
 *
 * @module "@chrock-studio/overload/internal.ts"
 */
import type { StandardSchemaV1 } from "@standard-schema/spec";

/**
 * A normalized type guard: returns `true` when the value passes the check.
 *
 * Both {@link check} predicates and Standard Schema validators are reduced to
 * this shape so the AOT compiler can emit a single call form for either.
 */
export type Guard = (value: unknown) => boolean;

/** The raw building blocks a {@link Matcher} was constructed from. */
export interface MatcherInternals {
  /** Original schemas, in parameter order. */
  readonly schemas: readonly StandardSchemaV1[];
  /** Original rest-parameter schema, when present. */
  readonly rest?: StandardSchemaV1;
}

/**
 * Symbol key under which a {@link Matcher} stores its {@link MatcherInternals}.
 *
 * A symbol keeps the payload invisible to normal property enumeration while
 * still being readable by the AOT compiler.
 */
export const GUARDS: unique symbol = Symbol("chrock.overload/guards");

/** Fast predicates registered by {@link check}, keyed by their schema object. */
const FAST_CHECKS = new WeakMap<object, (value: unknown) => unknown>();

/**
 * Associates a schema created by {@link check} with the raw predicate it wraps.
 *
 * @param schema - The schema to tag.
 * @param predicate - The original type guard.
 */
export const registerFastCheck = (schema: StandardSchemaV1, predicate: (value: unknown) => unknown): void => {
  FAST_CHECKS.set(schema, predicate);
};

/**
 * Returns the raw predicate behind a schema created by {@link check}.
 *
 * @param schema - The schema to inspect.
 * @returns The predicate, or `undefined` for third-party schemas.
 */
export const getFastCheck = (schema: StandardSchemaV1): ((value: unknown) => unknown) | undefined =>
  FAST_CHECKS.get(schema);

/**
 * Stores the raw building blocks of a matcher under {@link GUARDS}.
 *
 * @param matcher - The matcher instance to tag.
 * @param internals - The schemas the matcher was built from.
 */
export const setInternals = (matcher: object, internals: MatcherInternals): void => {
  Object.defineProperty(matcher, GUARDS, { value: internals, enumerable: false, configurable: true });
};

/**
 * Reads the raw building blocks of a matcher.
 *
 * @param matcher - Any value; non-matcher values yield `undefined`.
 * @returns The matcher internals, or `undefined` when not a `Matcher`.
 */
export const internalsOf = (matcher: unknown): MatcherInternals | undefined =>
  typeof matcher === "object" && matcher !== null ? (matcher as { [GUARDS]?: MatcherInternals })[GUARDS] : undefined;

/** Reason keys already surfaced through {@link warnOnce}. */
const warned = new Set<string>();

/** Clears the {@link warnOnce} dedupe table. Exposed for tests only. */
export const resetWarningsForTest = (): void => {
  warned.clear();
};

/**
 * Emits a warning at most once per reason key.
 *
 * Used by the AOT layer to report that it is falling back to interpreted
 * dispatch without flooding the console when a chain has many branches.
 *
 * @param key - Dedupe key identifying the reason.
 * @param message - Human readable explanation, without the package prefix.
 */
export const warnOnce = (key: string, message: string): void => {
  if (warned.has(key)) {
    return;
  }
  warned.add(key);
  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(`[@chrock-studio/overload] ${message}`);
  }
};
