/**
 * Type Checker Module
 *
 * This module provides type definitions for runtime type checking. The Checker type
 * is a type predicate function used to validate unknown values against specific types
 * and provide type narrowing in type guards.
 *
 * @example
 * ```ts
 * import { Checker } from "@chrock-studio/overload/checker";
 *
 * // Define a string checker
 * const isString: Checker<string> = (input): input is string => typeof input === "string";
 *
 * // Use the checker for type narrowing
 * function process(input: unknown) {
 *   if (isString(input)) {
 *     // input is narrowed to string type in this branch
 *     console.log(input.toUpperCase());
 *   }
 * }
 * ```
 *
 * @module "@chrock-studio/overload/checker.ts"
 */
export type Checker<T = any> = (input: unknown) => input is T;

/**
 * Extracts the parameter type from a {@link Checker} type predicate function.
 *
 * Given a `Checker<T>`, this utility type extracts the type `T` that the checker
 * narrows to. This is useful for deriving parameter types from checker definitions.
 *
 * @typeParam C - A {@link Checker} type from which to extract the parameter type.
 *
 * @example
 * ```ts
 * import type { Checker, CheckerToParam } from "@chrock-studio/overload/checker";
 *
 * const isString: Checker<string> = (input): input is string => typeof input === "string";
 *
 * // Extract the parameter type from the checker
 * type StringType = CheckerToParam<typeof isString>; // string
 * ```
 */
export type CheckerToParam<C extends Checker> = C extends Checker<infer D> ? D : never;

/**
 * Maps an array of {@link Checker} types to their corresponding parameter types.
 *
 * Given an array of checkers `[Checker<A>, Checker<B>, ...]`, this utility type
 * produces a tuple of the extracted parameter types `[A, B, ...]`. This is used
 * internally to derive parameter lists from matcher checker arrays.
 *
 * @typeParam C - An array of {@link Checker} types to map to parameter types.
 *
 * @example
 * ```ts
 * import type { Checker, CheckersToParams } from "@chrock-studio/overload/checker";
 *
 * const checkers = [
 *   (x): x is string => typeof x === "string",
 *   (x): x is number => typeof x === "number",
 * ] as const;
 *
 * type Params = CheckersToParams<typeof checkers>; // [string, number]
 * ```
 */
export type CheckersToParams<C extends Checker[]> = { [key in keyof C]: CheckerToParam<C[key]> };
