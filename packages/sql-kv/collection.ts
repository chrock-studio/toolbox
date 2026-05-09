/**
 * The `Collection` class -- a typed, schema-validated view over a KV store.
 *
 * Collections provide type-safe CRUD operations with Zod schema validation
 * and support for indexed queries via filter operators.
 *
 * @module "@chrock-studio/sql-kv/collection"
 */

import type { CollectionConfig, Filter, QueryOptions, SortSpec, SQLAdapter, SQLInputValue } from "./types.ts";
import type { Store } from "./store.ts";
import { raw } from "./sql.ts";
import { sql as compileSQL } from "./sql.ts";
import type { RawSQL } from "./types.ts";

/**
 * A typed collection within a KV store.
 *
 * @template T - The shape of items in this collection
 *
 * @example
 * ```ts
 * const users = kv.collection({
 *   name: "users",
 *   schema: z.object({ id: z.string(), name: z.string() }),
 * });
 *
 * await users.set("user1", { id: "user1", name: "Alice" });
 * const user = await users.get("user1");
 * ```
 */
export class Collection<T extends Record<string, unknown>> {
  /** The collection configuration. */
  readonly config: CollectionConfig<T>;

  /** Raw SQL reference to the underlying table, for use in tagged templates. */
  readonly table: RawSQL;

  /**
   * @param store - The parent store
   * @param config - Collection configuration
   */
  constructor(
    private readonly store: Store,
    config: CollectionConfig<T>,
  ) {
    this.config = config;
    this.table = store.table;
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /**
   * Build the full storage key for an item.
   *
   * Keys are stored as JSON arrays: `["collectionName", "itemKey"]`.
   */
  private makeKey(key: string): string {
    return JSON.stringify([this.config.name, key]);
  }

  /**
   * Get the JSON path expression for the value column.
   *
   * Uses `->>` instead of `->` for SQLite compatibility:
   * `->>` returns SQL text (strings without quotes), while `->` returns
   * JSON text (strings with quotes). This ensures comparisons with
   * plain string parameters work correctly.
   */
  private get valuePath(): string {
    return "__value->>'$'";
  }

  /**
   * Get the JSON path expression for the key column.
   */
  private get keyPath(): string {
    return "__key->>'$'";
  }

  /**
   * Get the JSON path expression for the collection name in the key array.
   */
  private get collectionKeyPath(): string {
    return "__key->>'$[0]'";
  }

  /**
   * Parse raw result rows into typed items.
   */
  private parseRows(rows: { value: string }[]): Promise<T[]> {
    if (!Array.isArray(rows)) {
      return Promise.resolve([]);
    }

    const parsedRows = rows
      .filter((r) => r && typeof r.value === "string")
      .map((r) => this.config.schema.decodeAsync(JSON.parse(r.value)));
    return Promise.all(parsedRows);
  }

  /**
   * Get the adapter from the store.
   */
  private get adapter(): SQLAdapter {
    return this.store.adapter;
  }

  /**
   * Get the table name from the store.
   */
  private get tableName(): string {
    return this.store.tableName;
  }

  /**
   * Build an ORDER BY clause from sort specifications.
   *
   * Each sort spec's `field` is mapped to a JSON path expression.
   * Returns an empty string and no params if no sort specs are given.
   */
  private buildOrderBy(specs: SortSpec[]): { clause: string; params: SQLInputValue[] } {
    if (specs.length === 0) {
      return { clause: "", params: [] };
    }

    const parts = specs.map((s) => {
      const dir = s.direction === "desc" ? "DESC" : "ASC";
      return `__value->>'$.${s.field}' ${dir}`;
    });

    return { clause: `ORDER BY ${parts.join(", ")}`, params: [] };
  }

  /**
   * Build a LIMIT / OFFSET clause from query options.
   */
  private buildPagination({ limit, offset }: QueryOptions): { clause: string; params: SQLInputValue[] } {
    const params: SQLInputValue[] = [];

    if (limit === undefined && offset === undefined) {
      return { clause: "", params: [] };
    }

    const clause: string[] = [];

    clause.push(`LIMIT ?`);
    params.push(limit ?? 999999999);

    clause.push(`OFFSET ?`);
    params.push(offset ?? 0);

    return { clause: clause.join(" "), params };
  }

  /**
   * Normalize query options: coerce `orderBy` to an array of SortSpec.
   */
  private normalizeOptions(options?: QueryOptions): QueryOptions & { orderBy: SortSpec[] } {
    const orderBy = options?.orderBy ? Array.isArray(options.orderBy) ? options.orderBy : [options.orderBy] : [];

    return {
      limit: options?.limit,
      offset: options?.offset,
      orderBy,
    };
  }

  // -----------------------------------------------------------------------
  // CRUD operations
  // -----------------------------------------------------------------------

  private buildInsert(items: [key: string, value: unknown][]): { sql: string; params: SQLInputValue[] } {
    return {
      sql: `INSERT OR REPLACE INTO ${this.tableName} (__key, __value) VALUES ${
        Array.from({ length: items.length }, () => "(?, ?)").join(",")
      }`,
      params: items.flat(1) as SQLInputValue[],
    };
  }

  /**
   * Set (insert or replace) an item in the collection.
   *
   * The value is validated against the collection's Zod schema before storage.
   *
   * @param key - The item key
   * @param value - The item data
   * @returns An array containing the stored (validated) item
   *
   * @example
   * ```ts
   * const [user] = await users.set("UkjOid93_", {
   *   id: "UkjOid93_",
   *   name: "John Doe",
   *   mail: "john_doe@example.com",
   * });
   * ```
   */
  async set(key: string, value: T): Promise<T[]> {
    const storeKey = this.makeKey(key);
    const parsed = await this.config.schema.encodeAsync(value) as T;
    const storeValue = JSON.stringify(parsed);

    const { sql, params } = this.buildInsert([[storeKey, storeValue]]);

    await this.adapter.run(sql, params);

    return [parsed];
  }
  async setMany(items: [key: string, value: T][]): Promise<T[]> {
    const entries = await Promise.all(
      items.map(async ([key, value]) => [key, await this.config.schema.encodeAsync(value) as T] as const),
    );
    if (entries.length === 0) return [];

    const sqlStatements = this.buildInsert(entries.map(([key, value]) => [this.makeKey(key), JSON.stringify(value)]));
    await this.adapter.transaction((run) => run(sqlStatements.sql, sqlStatements.params));

    return entries.map(([_, value]) => value);
  }

  /**
   * Get a single item by key.
   *
   * @param key - The item key
   * @returns The item, or `null` if not found
   *
   * @example
   * ```ts
   * const user = await users.get("UkjOid93_");
   * ```
   */
  async get(key: string): Promise<T | null> {
    const storeKey = this.makeKey(key);
    const rows = await this.adapter.run(
      `SELECT ${this.valuePath} AS value FROM ${this.tableName} WHERE ${this.keyPath} == ?`,
      [storeKey],
    );

    const items = await this.parseRows(rows as { value: string }[]);
    return items.length > 0 ? items[0] : null;
  }

  /**
   * Get multiple items by their keys.
   *
   * @param keys - The item keys
   * @returns An array of found items (non-existing keys are omitted)
   *
   * @example
   * ```ts
   * const items = await users.getMany(["UkjOd93_", "JIczAd_3"]);
   * ```
   */
  async getMany(keys: string[]): Promise<T[]> {
    if (keys.length === 0) return [];

    const storeKeys = keys.map((k) => this.makeKey(k));
    const conditions = storeKeys.map(() => `${this.keyPath} == ?`).join(" OR ");
    const rows = await this.adapter.run(
      `SELECT ${this.valuePath} AS value FROM ${this.tableName} WHERE ${conditions}`,
      storeKeys,
    );

    return await this.parseRows(rows as { value: string }[]);
  }

  /**
   * List all items in the collection, with optional pagination and sorting.
   *
   * @param options - Optional pagination (`limit`, `offset`) and sorting (`orderBy`)
   * @returns An array of items in the collection
   *
   * @example
   * ```ts
   * // List all
   * const allUsers = await users.list();
   *
   * // Paginated
   * const page2 = await users.list({ limit: 10, offset: 10 });
   *
   * // Sorted
   * const sorted = await users.list({ orderBy: { field: "name", direction: "asc" } });
   *
   * // Multi-field sort with pagination
   * const result = await users.list({
   *   orderBy: [{ field: "age", direction: "desc" }, { field: "name" }],
   *   limit: 20,
   *   offset: 0,
   * });
   * ```
   */
  async list(options?: QueryOptions): Promise<T[]> {
    const opts = this.normalizeOptions(options);
    const params: SQLInputValue[] = [this.config.name];

    const { clause: orderClause } = this.buildOrderBy(opts.orderBy);
    const { clause: paginationClause, params: paginationParams } = this.buildPagination(opts);

    const sql = [
      `SELECT ${this.valuePath} AS value FROM ${this.tableName}`,
      `WHERE ${this.collectionKeyPath} == ?`,
      orderClause,
      paginationClause,
    ]
      .filter(Boolean)
      .join(" ");

    const rows = await this.adapter.run(sql, [...params, ...paginationParams]);

    return await this.parseRows(rows as { value: string }[]);
  }

  /**
   * Find items matching the given filters, with optional pagination and sorting.
   *
   * Each key in the filter object is a field path (dot notation for nested
   * fields), and each value is a {@link Filter} operator.
   *
   * @param filters - An object mapping field paths to filter operators
   * @param options - Optional pagination (`limit`, `offset`) and sorting (`orderBy`)
   * @returns An array of matching items
   *
   * @example
   * ```ts
   * // Basic filter
   * const results = await users.find({
   *   age: kv.lt(20),
   * });
   *
   * // Filter with pagination and sorting
   * const paged = await users.find(
   *   { age: kv.gte(18) },
   *   { orderBy: { field: "name" }, limit: 10, offset: 0 },
   * );
   * ```
   */
  async find(filters: Record<string, Filter>, options?: QueryOptions): Promise<T[]> {
    const opts = this.normalizeOptions(options);
    const conditions: string[] = [];
    const params: SQLInputValue[] = [];

    // Always scope to the current collection
    conditions.push(`${this.collectionKeyPath} == ?`);
    params.push(this.config.name);

    for (const [field, filter] of Object.entries(filters)) {
      const path = `__value->>'$.${field}'`;
      const { where, params: p } = filter.toSQL(path);
      conditions.push(where);
      params.push(...p);
    }

    const { clause: orderClause } = this.buildOrderBy(opts.orderBy);
    const { clause: paginationClause, params: paginationParams } = this.buildPagination(opts);

    const sql = [
      `SELECT ${this.valuePath} AS value FROM ${this.tableName}`,
      `WHERE ${conditions.join(" AND ")}`,
      orderClause,
      paginationClause,
    ]
      .filter(Boolean)
      .join(" ");

    const rows = await this.adapter.run(sql, [...params, ...paginationParams]);

    return await this.parseRows(rows as { value: string }[]);
  }

  /**
   * Delete multiple items by their keys.
   *
   * @param keys - The item keys to delete
   *
   * @example
   * ```ts
   * await users.deleteMany(["UkjOd93_", "JIczAd_3"]);
   * ```
   */
  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    const storeKeys = keys.map((k) => this.makeKey(k));
    const conditions = storeKeys.map(() => `${this.keyPath} == ?`).join(" OR ");

    await this.adapter.run(
      `DELETE FROM ${this.tableName} WHERE ${conditions}`,
      storeKeys,
    );
  }

  // -----------------------------------------------------------------------
  // SQL tagged template helper
  // -----------------------------------------------------------------------

  /**
   * Create a raw SQL reference to a field path, for use in raw SQL queries.
   *
   * Use this in tagged template queries to reference collection fields.
   *
   * @param path - The JSON field path (e.g., `"name"`, `"address.city"`)
   * @returns A {@link RawSQL} marker for the field path
   *
   * @example
   * ```ts
   * const [{ name }] = await users.sql`
   *   SELECT ${users.extract("name")} AS name
   *   FROM ${users.table}
   *   WHERE __value->'$.mail' LIKE ${"%@example.com"}
   * `;
   * ```
   */
  extract(path: string): RawSQL {
    return raw(`__value->>'$.${path}'`);
  }

  /**
   * Execute a raw SQL query against the underlying table using a tagged template.
   *
   * Values wrapped with {@link raw} are interpolated directly; all other values
   * are parameterized.
   *
   * @param strings - The template string array
   * @param values - The interpolated values
   * @returns The query result rows
   *
   * @example
   * ```ts
   * const result = await users.sql`SELECT * FROM ${users.table} LIMIT 10`;
   * ```
   */
  sql = (strings: TemplateStringsArray, ...values: (SQLInputValue | RawSQL)[]): Promise<unknown[]> => {
    const { text, params } = compileSQL(strings, ...values);
    return this.adapter.run(text, params);
  };
}
