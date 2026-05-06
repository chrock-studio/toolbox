/**
 * SQL tagged template literal and raw SQL value utilities.
 *
 * This module provides tools for building SQL statements with proper
 * parameterization. Use {@link raw} to mark values that should be
 * interpolated directly (table names, column refs), and use the
 * {@link sql} tagged template to compile templates into SQL text
 * and parameter arrays.
 *
 * @module "@chrock-studio/sql-kv/sql"
 */

import type { RawSQL, SQLInputValue } from "./types.ts";

/**
 * Create a raw SQL value that bypasses parameterization.
 *
 * When used in a {@link sql} tagged template, the value will be
 * interpolated directly into the SQL text instead of being added
 * as a parameter placeholder.
 *
 * @param sql - The raw SQL fragment
 * @returns A frozen {@link RawSQL} marker object
 *
 * @example
 * ```ts
 * raw("__value->'$.name'")
 * raw("kv")
 * ```
 */
export function raw(sql: string): RawSQL {
  return Object.freeze({ _raw: true as const, sql });
}

/**
 * Check if a value is a {@link RawSQL} marker.
 *
 * @param value - The value to check
 * @returns `true` if the value is a {@link RawSQL} marker
 */
export function isRaw(value: unknown): value is RawSQL {
  return typeof value === "object" && value !== null && "_raw" in value && (value as RawSQL)._raw === true;
}

/**
 * A tagged template literal for building parameterized SQL statements.
 *
 * Values wrapped with {@link raw} are interpolated directly into the SQL
 * text. All other values are replaced with `?` placeholders and added to
 * the parameter array.
 *
 * @param strings - The template string array
 * @param values - The interpolated values
 * @returns The compiled SQL text and parameters
 *
 * @example
 * ```ts
 * const { text, params } = sql`SELECT * FROM ${raw("kv")} WHERE __value->'$.name' LIKE ${"John"}`;
 * // text: "SELECT * FROM kv WHERE __value->'$.name' LIKE ?"
 * // params: ["John"]
 * ```
 */
export function sql(
  strings: TemplateStringsArray,
  ...values: (SQLInputValue | RawSQL)[]
): { text: string; params: SQLInputValue[] } {
  const parts: string[] = [];
  const params: SQLInputValue[] = [];

  for (let i = 0; i < strings.length; i++) {
    parts.push(strings[i]);
    if (i < values.length) {
      const val = values[i];
      if (isRaw(val)) {
        parts.push(val.sql);
      } else {
        parts.push("?");
        params.push(val);
      }
    }
  }

  return { text: parts.join(""), params };
}
