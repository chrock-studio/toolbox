/**
 * Zod Schema Matcher Module
 *
 * This module provides integration with Zod schema validation library,
 * allowing Zod schemas to be used as type checkers in pattern matchers.
 * It converts Zod schemas into Checker functions that validate input
 * using Zod's safeParse method.
 *
 * @example Basic usage
 *
 * ```ts
 * import { z } from "zod";
 * import { zod } from "@chrock-studio/overload/matcher/zod";
 * import { Matcher } from "@chrock-studio/overload/matcher";
 *
 * // Create checkers from Zod schemas
 * const stringSchema = z.string();
 * const numberSchema = z.number();
 *
 * const matcher = Matcher.make(
 *   zod(stringSchema, numberSchema),
 *   (name, age) => `Name: ${name}, Age: ${age}`
 * );
 *
 * matcher.check(["John", 25]); // true
 * matcher.implement("John", 25); // "Name: John, Age: 25"
 * ```
 *
 * @example Using zod.item for single schema
 *
 * ```ts
 * import { z } from "zod";
 * import { zod } from "@chrock-studio/overload/matcher/zod";
 *
 * // Create a single checker from a Zod schema
 * const isString = zod.item(z.string());
 *
 * isString("hello"); // true
 * isString(123); // false
 * ```
 *
 * @module "@chrock-studio/overload/matcher/zod"
 */

import type z from "zod";
import type { Checker } from "../checker.ts";

/**
 * Converts multiple Zod schemas into an array of Checker functions.
 *
 * This function accepts any number of Zod schemas and converts each schema
 * into a corresponding Checker function. The returned array of Checker functions
 * can be used with Matcher.make() to create pattern matchers.
 *
 * @typeParam S - The Zod schema array type, inferred from the input arguments.
 * @param schema - The Zod schemas to convert.
 * @returns An array of Checker functions, each corresponding to an input schema.
 *
 * @example Converting multiple schemas
 * ```ts
 * import { z } from "zod";
 * import { zod } from "@chrock-studio/overload/matcher/zod";
 *
 * const [isString, isNumber] = zod(z.string(), z.number());
 *
 * isString("hello"); // true
 * isString(123);     // false
 *
 * isNumber(42);      // true
 * isNumber("42");    // false
 * ```
 *
 * @example Using with Matcher
 * ```ts
 * import { z } from "zod";
 * import { zod } from "@chrock-studio/overload/matcher/zod";
 * import { Matcher } from "@chrock-studio/overload/matcher";
 *
 * const matcher = Matcher.make(
 *   zod(z.string(), z.number()),
 *   (name, age) => `${name} is ${age} years old`
 * );
 *
 * matcher.implement("Alice", 30); // "Alice is 30 years old"
 * ```
 */
export const zod = <const S extends z.ZodType[]>(...schema: S) =>
  schema.map(zod.item) as { [key in keyof S]: Checker<z.output<S[key]>> };

/**
 * Converts a single Zod schema into a Checker function.
 *
 * This function accepts a Zod schema and returns a Checker function that validates
 * input values using Zod's safeParse method. Returns true if validation succeeds,
 * false otherwise.
 *
 * This is the underlying implementation of the zod function, and can also be used
 * standalone to create individual Checkers.
 *
 * @typeParam S - The Zod schema type.
 * @param schema - The Zod schema to convert.
 * @returns A Checker function that validates if input conforms to the schema.
 *
 * @example Basic usage
 * ```ts
 * import { z } from "zod";
 * import { zod } from "@chrock-studio/overload/matcher/zod";
 *
 * const isEmail = zod.item(z.string().email());
 *
 * isEmail("test@example.com"); // true
 * isEmail("invalid-email");   // false
 * ```
 *
 * @example Complex schema
 * ```ts
 * import { z } from "zod";
 * import { zod } from "@chrock-studio/overload/matcher/zod";
 *
 * const isUser = zod.item(z.object({
 *   name: z.string(),
 *   age: z.number().min(0)
 * }));
 *
 * isUser({ name: "John", age: 25 }); // true
 * isUser({ name: "John", age: -1 }); // false
 * isUser({ name: 123 });             // false
 * ```
 *
 * @example Custom type guard
 * ```ts
 * import { z } from "zod";
 * import { zod } from "@chrock-studio/overload/matcher/zod";
 *
 * const isPositiveNumber = zod.item(z.number().positive());
 *
 * function process(value: unknown) {
 *   if (isPositiveNumber(value)) {
 *     // In this branch, TypeScript knows value is a positive number
 *     console.log(value.toFixed(2));
 *   }
 * }
 * ```
 */
zod.item = <const S extends z.ZodType>(schema: S) => ((x) => schema.safeParse(x).success) as Checker<z.output<S>>;
