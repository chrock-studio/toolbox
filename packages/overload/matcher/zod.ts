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
 * matcher("John", 25); // "Name: John, Age: 25"
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

export const zod = <const S extends z.ZodType[]>(...schema: S) =>
  schema.map(zod.item) as { [key in keyof S]: Checker<z.output<S[key]>> };
zod.item = <const S extends z.ZodType>(schema: S) => ((x) => schema.safeParse(x).success) as Checker<z.output<S>>;
