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
 * Checker to Parameter.
 */
export type CheckerToParam<C extends Checker> = C extends Checker<infer D> ? D : never;
/**
 * Checkers to Parameters.
 */
export type CheckersToParams<C extends Checker[]> = { [key in keyof C]: CheckerToParam<C[key]> };
