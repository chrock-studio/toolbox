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
 * - **`check()` helper**: Create checkers from type guard functions without external dependencies
 *
 * @example Basic usage (using `check()`)
 *
 * ```ts
 * import { check, Overload } from "@chrock-studio/overload";
 *
 * const str = check((x): x is string => typeof x === "string");
 * const num = check((x): x is number => typeof x === "number");
 *
 * const greet = Overload
 *   .withFallback(() => console.log("Unknown input"))
 *   .overload(
 *     [str],
 *     (name) => console.log(`Hello, ${name}!`)
 *   )
 *   .overload(
 *     [num],
 *     (age) => console.log(`Age: ${age}`)
 *   );
 *
 * greet("Alice"); // "Hello, Alice!"
 * greet(25);      // "Age: 25"
 * greet(true);    // "Unknown input"
 * ```
 *
 * @example Basic usage (using `zod`)
 *
 * ```ts
 * import { Overload } from "@chrock-studio/overload";
 * import { z } from "zod";
 *
 * const greet = Overload
 *   .withFallback(() => console.log("Unknown input"))
 *   .overload(
 *     [z.string()],
 *     (name) => console.log(`Hello, ${name}!`)
 *   )
 *   .overload(
 *     [z.number()],
 *     (age) => console.log(`Age: ${age}`)
 *   );
 *
 * greet("Alice"); // "Hello, Alice!"
 * greet(25);      // "Age: 25"
 * greet(true);    // "Unknown input"
 * ```
 *
 * @example Multiple parameters (using `check()`)
 *
 * ```ts
 * import { check, Overload } from "@chrock-studio/overload";
 *
 * const str = check((x): x is string => typeof x === "string");
 * const num = check((x): x is number => typeof x === "number");
 *
 * const process = Overload
 *   .withFallback(() => console.log("No match"))
 *   .overload(
 *     [str, num],
 *     (name, age) => console.log(`${name} is ${age} years old`)
 *   );
 *
 * process("Bob", 30); // "Bob is 30 years old"
 * ```
 *
 * @example Multiple parameters (using `zod`)
 *
 * ```ts
 * import { Overload } from "@chrock-studio/overload";
 * import { z } from "zod";
 *
 * const process = Overload
 *   .withFallback(() => console.log("No match"))
 *   .overload(
 *     [z.string(), z.number()],
 *     (name, age) => console.log(`${name} is ${age} years old`)
 *   );
 *
 * process("Bob", 30); // "Bob is 30 years old"
 * ```
 *
 * @example With rest parameters (using `check()`)
 *
 * ```ts
 * import { check, Overload } from "@chrock-studio/overload";
 *
 * const str = check((x): x is string => typeof x === "string");
 * const num = check((x): x is number => typeof x === "number");
 *
 * const log = Overload
 *   .withFallback(() => {})
 *   .overload(
 *     [str],
 *     num,
 *     (first, second, ...rest) => console.log(first, second, rest)
 *   );
 *
 * log("item", 1, 2, 3, 4); // "item" 1 [2, 3, 4]
 * ```
 *
 * @example With rest parameters (using `zod`)
 *
 * ```ts
 * import { Overload } from "@chrock-studio/overload";
 * import { z } from "zod";
 *
 * const log = Overload
 *   .withFallback(() => {})
 *   .overload(
 *     [z.string()],
 *     z.number(),
 *     (first, second, ...rest) => console.log(first, second, rest)
 *   );
 *
 * log("item", 1, 2, 3, 4); // "item" 1 [2, 3, 4]
 * ```
 *
 * @example Precompiled dispatch (using `check()`)
 *
 * ```ts
 * import { check, Overload } from "@chrock-studio/overload";
 *
 * const str = check((x): x is string => typeof x === "string");
 * const num = check((x): x is number => typeof x === "number");
 *
 * // Build the function normally, then upgrade it once.
 * const greet = Overload
 *   .withFallback(() => "Unknown")
 *   .overload([str], (name) => `Hello, ${name}!`)
 *   .overload([num], (age) => `Age: ${age}`);
 *
 * const fast = greet.aot();
 * fast("Alice"); // "Hello, Alice!"
 *
 * // Or compile from the start with the mirrored builder.
 * const sum = Overload.aot
 *   .withFallback(() => 0)
 *   .overload([num, num], (a, b) => a + b);
 * ```
 *
 * ## Performance
 *
 * Dispatch walks the matcher list on every call, so hot overloaded functions
 * can opt into ahead-of-time compilation:
 *
 * - `fn.aot()` compiles a finished function and returns one with identical
 *   behaviour and types.
 * - `Overload.aot` mirrors the builder API, compiling as the chain is built.
 *
 * Compiled dispatch inlines the guards of every branch, avoids allocating the
 * arguments array, and calls the raw predicate behind `check()` instead of
 * building a `StandardSchemaV1` result object. Measured gains for `check()`
 * schemas are roughly 3x–10x depending on branch count; schemas from
 * third-party libraries keep their own validation cost and gain roughly 2x from
 * the dispatch side alone.
 *
 * Compilation relies on `new Function`. Runtimes that forbid code generation
 * (for example a strict Content Security Policy or some edge runtimes) are
 * detected automatically: a warning is printed once and the call falls back to
 * interpreted dispatch, so `aot()` is always safe to call.
 *
 * @module "@chrock-studio/overload"
 */

export * from "./callable.ts";
export * from "./checker.ts";
export * from "./matcher.ts";
export * from "./overload.ts";
