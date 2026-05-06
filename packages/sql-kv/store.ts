/**
 * The `Store` class -- represents a named SQL table in the KV store.
 *
 * A `Store` is created via {@link KV.store} and provides the ability to
 * create typed collections and execute raw SQL queries against the table.
 *
 * @module "@chrock-studio/sql-kv/store"
 */

import type { CollectionConfig, SQLAdapter } from "./types.ts";
import { Collection } from "./collection.ts";
import { raw } from "./sql.ts";
import type { RawSQL } from "./types.ts";

/**
 * A named store backed by a SQL table.
 *
 * @example
 * ```ts
 * const kv = await kvdb.store("kv");
 * const users = kv.collection({ name: "users", schema: UserSchema });
 * ```
 */
export class Store {
  /** Raw SQL reference to this table, for use in tagged template queries. */
  readonly table: RawSQL;

  /**
   * @param adapter - The SQL adapter
   * @param tableName - The underlying SQL table name
   */
  constructor(
    readonly adapter: SQLAdapter,
    readonly tableName: string,
  ) {
    this.table = raw(tableName);
  }

  /**
   * Create a typed collection within this store.
   *
   * The collection uses the store's table to store items, with keys
   * namespaced by the collection name.
   *
   * @param config - The collection configuration (name, schema, indexes)
   * @returns A new {@link Collection} instance
   *
   * @example
   * ```ts
   * const users = kv.collection({
   *   name: "users",
   *   schema: UserSchema,
   *   indexes: ["name", "email"],
   * });
   * ```
   */
  collection<T extends Record<string, unknown>>(config: CollectionConfig<T>): Collection<T> {
    const collection = new Collection<T>(this, config);

    // Create indexes if configured
    if (config.indexes && config.indexes.length > 0) {
      // Fire-and-forget index creation (run after construction)
      // This is called internally; errors are non-fatal for basic usage
      this.createIndexes(config).catch(() => {});
    }

    return collection;
  }

  private async createIndexes<T extends Record<string, unknown>>(config: CollectionConfig<T>): Promise<void> {
    for (const field of config.indexes ?? []) {
      const indexName = `idx_${this.tableName}_${config.name}_${field.replace(/\./g, "_")}`;
      const indexSql = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${this.tableName} (__value->>'$.${field}')`;
      await this.adapter.run(indexSql, []);
    }
  }
}
