/**
 * Core type definitions for `@chrock-studio/sql-kv`.
 *
 * This module defines the fundamental interfaces for the SQL-backed KV store.
 *
 * @module "@chrock-studio/sql-kv/types"
 */

import type { ZodType } from "zod";

/**
 * Result of a single SQL execution.
 */
export interface SQLRunResult {
  rows?: number;
  lastId?: unknown;
  [key: number]: unknown;
}
export type SQLInputValue = null | number | bigint | string | DataView;

/**
 * SQL database adapter interface.
 *
 * Users must provide an object implementing this interface to connect
 * the KV store to their database. The adapter wraps the database driver
 * and provides `run` for executing SQL statements and `transaction` for
 * transactional execution.
 *
 * @example
 * ```ts
 * const adapter: SQLAdapter = {
 *   run(sql, inputs) {
 *     return db.prepare(sql).run(inputs);
 *   },
 *   transaction(fn) {
 *     return db.transaction(fn);
 *   },
 * };
 * ```
 */
export interface SQLAdapter {
  /**
   * Execute a SQL statement with the given parameters.
   *
   * @param sql - The SQL statement to execute
   * @param inputs - The parameters to bind to the SQL statement
   * @returns The result rows with optional `rows` and `lastId` metadata
   */
  run(sql: string, inputs: SQLInputValue[]): Promise<unknown[] & Partial<SQLRunResult>>;

  /**
   * Execute a function within a database transaction.
   *
   * @param fn - A function that receives a `run` executor scoped to this transaction
   * @returns The return value of `fn`
   */
  transaction<T>(
    fn: (run: (sql: string, inputs: SQLInputValue[]) => Promise<unknown[] & Partial<SQLRunResult>>) => Promise<T>,
  ): Promise<T>;
}

/**
 * Configuration for creating a typed collection.
 *
 * @template T - The shape of items in this collection
 */
export interface CollectionConfig<T extends Record<string, unknown>> {
  /**
   * The name of the collection, used as a namespace prefix for keys.
   */
  name: string;

  /**
   * A Zod schema for validating and parsing collection items.
   */
  schema: ZodType<T>;

  /**
   * Optional list of field paths to create SQL indexes on.
   *
   * Each index is created as `CREATE INDEX IF NOT EXISTS idx_{table}_{collection}_{field}
   * ON {table} (__value->'$.{field}')`.
   */
  indexes?: string[];
}

/**
 * A filter operator used in collection queries.
 *
 * Implementations should produce a SQL WHERE clause fragment and corresponding
 * parameter values for a given JSON path.
 */
export interface Filter {
  /**
   * Convert this filter to a SQL WHERE clause fragment.
   *
   * @param path - The JSON path expression (e.g., `__value->'$.name'`)
   * @returns An object containing the SQL fragment and parameters
   */
  toSQL(path: string): { where: string; params: SQLInputValue[] };
}

/**
 * A marker value that represents raw SQL text to be interpolated directly
 * into a SQL statement, bypassing parameterization.
 *
 * Used for column references, table names, and other SQL fragments that
 * should not be parameterized.
 */
export interface RawSQL {
  readonly _raw: true;
  readonly sql: string;
}
