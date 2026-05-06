/**
 * The `KV` class -- the main entry point for `@chrock-studio/sql-kv`.
 *
 * `KV` wraps a {@link SQLAdapter} and provides factory methods to create
 * named stores (SQL tables). Each store can then have typed collections
 * with schema validation, indexes, and query filters.
 *
 * @module "@chrock-studio/sql-kv/kv"
 */

import type { SQLAdapter } from "./types.ts";
import { Store } from "./store.ts";
import * as filters from "./filter.ts";

/**
 * The main KV entry point.
 *
 * @example Basic usage
 * ```ts
 * import { KV } from "@chrock-studio/sql-kv";
 *
 * const kvdb = new KV({
 *   run(sql, inputs) { return db.prepare(sql).run(inputs); },
 *   transaction(fn) { return db.transaction(fn); },
 * });
 *
 * const kv = await kvdb.store("kv");
 * const users = kv.collection({
 *   name: "users",
 *   schema: UserSchema,
 *   indexes: ["name", "mail"],
 * });
 * ```
 */
export class KV {
  // -----------------------------------------------------------------------
  // Filter operators – accessible as `kv.eq(...)`, `kv.lt(...)`, etc.
  // -----------------------------------------------------------------------

  readonly eq = filters.eq;
  readonly neq = filters.neq;
  readonly lt = filters.lt;
  readonly gt = filters.gt;
  readonly lte = filters.lte;
  readonly gte = filters.gte;
  readonly regexp = filters.regexp;
  readonly like = filters.like;
  readonly isIn = filters.isIn;
  readonly in = filters.isIn;
  readonly notIn = filters.notIn;
  readonly between = filters.between;
  readonly or = filters.or;
  readonly and = filters.and;
  readonly isNull = filters.isNull;
  readonly isNotNull = filters.isNotNull;

  /**
   * Create a new KV instance.
   *
   * @param adapter - The SQL adapter
   */
  constructor(readonly adapter: SQLAdapter) {
  }

  /**
   * Create or open a named store (SQL table).
   *
   * This will run `CREATE TABLE IF NOT EXISTS` to ensure the table exists,
   * and create a collection index if it doesn't already exist.
   *
   * @param name - The table name
   * @returns A {@link Store} instance bound to this table
   *
   * @example
   * ```ts
   * const kv = await kvdb.store("kv");
   * ```
   */
  async store(name: string): Promise<Store> {
    await this.adapter.run(
      `CREATE TABLE IF NOT EXISTS ${name} (__key TEXT PRIMARY KEY, __value TEXT)`,
      [],
    );
    await this.adapter.run(
      `CREATE INDEX IF NOT EXISTS idx_${name}_collection ON ${name} (__key->>'$[0]')`,
      [],
    );
    return new Store(this.adapter, name);
  }
}
