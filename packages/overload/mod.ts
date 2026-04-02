/**
 * # `@chrock-studio/overload` - Type-safe runtime function overloading.
 *
 * This module provides a type-safe function overloading system that allows
 * runtime dispatch based on argument types. It combines TypeScript's type
 * system with JavaScript's dynamic nature to create overloaded functions
 * that are both type-safe at compile time and flexible at runtime.
 *
 * ## Key Features
 *
 * - **Type-safe overloading**: Full TypeScript support with type inference
 * - **Runtime dispatch**: Dynamic function selection based on argument types
 * - **Chainable API**: Fluent interface for adding overload branches
 * - **Fallback support**: Optional fallback function when no match found
 * - **Rest parameters**: Support for variadic arguments with rest checkers
 *
 * @example Basic usage
 *
 * ```ts
 * import { Overload } from "@chrock-studio/overload";
 *
 * const greet = Overload
 *   .withFallback(() => console.log("Unknown input"))
 *   .overload(
 *     [(x): x is string => typeof x === "string"],
 *     (name) => console.log(`Hello, ${name}!`)
 *   )
 *   .overload(
 *     [(x): x is number => typeof x === "number"],
 *     (age) => console.log(`Age: ${age}`)
 *   );
 *
 * greet("Alice"); // "Hello, Alice!"
 * greet(25);      // "Age: 25"
 * greet(true);    // "Unknown input"
 * ```
 *
 * @example Multiple parameters
 *
 * ```ts
 * import { Overload } from "@chrock-studio/overload";
 *
 * const process = Overload
 *   .withFallback(() => console.log("No match"))
 *   .overload(
 *     [
 *       (x): x is string => typeof x === "string",
 *       (x): x is number => typeof x === "number",
 *     ],
 *     (name, age) => console.log(`${name} is ${age} years old`)
 *   );
 *
 * process("Bob", 30); // "Bob is 30 years old"
 * ```
 *
 * @example With rest parameters
 *
 * ```ts
 * import { Overload } from "@chrock-studio/overload";
 *
 * const log = Overload
 *   .withFallback(() => {})
 *   .overload(
 *     [(x): x is string => typeof x === "string"],
 *     (x): x is number => typeof x === "number",
 *     (first, second, ...rest) => console.log(first, second, rest)
 *   );
 *
 * log("item", 1, 2, 3, 4); // "item" 1 [2, 3, 4]
 * ```
 *
 * @example With `Zod`
 *
 * ```ts
 * import { Overload } from "@chrock-studio/overload";
 * import { zod } from "@chrock-studio/overload/matcher/zod";
 * import z from "zod";
 *
 * const log = Overload
 *   .withFallback(() => {})
 *   .overload(
 *     zod(z.string()),
 *     zod.item(z.number()),
 *     (first, second, ...rest) => console.log(first, second, rest)
 *   );
 *
 * log("item", 1, 2, 3, 4); // "item" 1 [2, 3, 4]
 * ```
 *
 * @module "@chrock-studio/overload"
 */

export * from "./callable.ts";
export * from "./checker.ts";
export * from "./matcher.ts";
export * from "./overload.ts";
