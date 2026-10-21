/**
 * Tests for `@chrock-studio/sql-kv`.
 *
 * Uses `node:sqlite` (`DatabaseSync`) as the real SQL backend
 * for in-memory integration testing.
 *
 * @module
 */

import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { isRaw, KV, raw, sql } from "./index.ts";
import type { SQLAdapter } from "./types.ts";
import { and, between, eq, gt, gte, isIn, isNotNull, isNull, like, lt, lte, neq, notIn, or, regexp } from "./filter.ts";
import { DatabaseSync, type SQLInputValue, type StatementSync } from "node:sqlite";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_", 8);

// =========================================================================
// SQLite adapter (using node:sqlite)
// =========================================================================

/**
 * A SQL adapter backed by a real `node:sqlite` database (in-memory).
 * Provides real SQL execution for integration-style testing.
 */
class SQLiteAdapter implements SQLAdapter {
  readonly db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db ?? new DatabaseSync(":memory:");
  }

  run(sql: string, inputs: SQLInputValue[]): Promise<unknown[] & Partial<{ rows: number; lastId: unknown }>> {
    console.log({
      "Executing SQL": sql,
      "With inputs": inputs,
    });
    let stmt: StatementSync;
    try {
      stmt = this.db.prepare(sql);
    } catch (e) {
      console.error("Error:", { e, sql, inputs });
      throw e;
    }
    const isQuery = sql.trim().toUpperCase().startsWith("SELECT");

    if (isQuery) {
      const rows = stmt.all(...inputs) as unknown[];
      return Promise.resolve(rows);
    } else {
      const result = stmt.run(...inputs);
      const arr = [] as unknown[] & Partial<{ rows: number; lastId: unknown }>;
      arr.rows = Number(result.changes);
      arr.lastId = result.lastInsertRowid;
      return Promise.resolve(arr);
    }
  }

  async transaction<T>(
    fn: (
      run: (sql: string, inputs: SQLInputValue[]) => Promise<unknown[] & Partial<{ rows: number; lastId: unknown }>>,
    ) => Promise<T>,
  ): Promise<T> {
    this.db.exec("BEGIN");
    try {
      const result = await fn(this.run.bind(this));
      this.db.exec("COMMIT");
      return result;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
}

// =========================================================================
// sql.ts – raw() / isRaw() / sql tagged template
// =========================================================================

describe("sql.ts – raw() / isRaw() / sql tagged template", () => {
  test("raw() creates a RawSQL marker", () => {
    const r = raw("__value->'$.name'");
    expect(r._raw).toBe(true);
    expect(r.sql).toBe("__value->'$.name'");
    expect(Object.isFrozen(r)).toBe(true);
  });

  test("isRaw() detects RawSQL markers", () => {
    expect(isRaw(raw("test"))).toBe(true);
    expect(isRaw("string")).toBe(false);
    expect(isRaw(42)).toBe(false);
    expect(isRaw(null)).toBe(false);
    expect(isRaw(undefined)).toBe(false);
    expect(isRaw({ _raw: false })).toBe(false);
  });

  test("sql tagged template parameterizes normal values", () => {
    const { text, params } = sql`SELECT * FROM kv WHERE name = ${"John"} AND age = ${30}`;
    expect(text).toBe("SELECT * FROM kv WHERE name = ? AND age = ?");
    expect(params).toStrictEqual(["John", 30]);
  });

  test("sql tagged template inline raw values", () => {
    const { text, params } = sql`SELECT ${raw("__value->'$.name'")} AS name FROM ${raw("kv")} WHERE age = ${30}`;
    expect(text).toBe("SELECT __value->'$.name' AS name FROM kv WHERE age = ?");
    expect(params).toStrictEqual([30]);
  });

  test("sql tagged template handles no values", () => {
    const { text, params } = sql`SELECT * FROM kv LIMIT 10`;
    expect(text).toBe("SELECT * FROM kv LIMIT 10");
    expect(params).toStrictEqual([]);
  });
});

// =========================================================================
// filter.ts – Filter operators
// =========================================================================

describe("filter.ts – Filter operators", () => {
  test("eq filter generates correct SQL", () => {
    const { where, params } = eq("John").toSQL("__value->'$.name'");
    expect(where).toBe("__value->'$.name' == ?");
    expect(params).toStrictEqual(["John"]);
  });

  test("neq filter generates correct SQL", () => {
    const { where, params } = neq(42).toSQL("__value->'$.age'");
    expect(where).toBe("__value->'$.age' != ?");
    expect(params).toStrictEqual([42]);
  });

  test("lt filter generates correct SQL", () => {
    const { where, params } = lt(20).toSQL("__value->'$.age'");
    expect(where).toBe("__value->'$.age' < ?");
    expect(params).toStrictEqual([20]);
  });

  test("lte filter generates correct SQL", () => {
    const { where, params } = lte(20).toSQL("__value->'$.age'");
    expect(where).toBe("__value->'$.age' <= ?");
    expect(params).toStrictEqual([20]);
  });

  test("gt filter generates correct SQL", () => {
    const { where, params } = gt(18).toSQL("__value->'$.age'");
    expect(where).toBe("__value->'$.age' > ?");
    expect(params).toStrictEqual([18]);
  });

  test("gte filter generates correct SQL", () => {
    const { where, params } = gte(18).toSQL("__value->'$.age'");
    expect(where).toBe("__value->'$.age' >= ?");
    expect(params).toStrictEqual([18]);
  });

  test("regexp filter generates correct SQL", () => {
    const { where, params } = regexp("[^@]+@.+\\..+").toSQL("__value->'$.mail'");
    expect(where).toBe("__value->'$.mail' REGEXP ?");
    expect(params).toStrictEqual(["[^@]+@.+\\..+"]);
  });

  test("isIn filter generates correct SQL", () => {
    const { where, params } = isIn(["New York", "Washington"]).toSQL("__value->'$.address.city'");
    expect(where).toBe("__value->'$.address.city' IN (?, ?)");
    expect(params).toStrictEqual(["New York", "Washington"]);
  });

  test("notIn filter generates correct SQL", () => {
    const { where, params } = notIn(["a", "b"]).toSQL("__value->'$.x'");
    expect(where).toBe("__value->'$.x' NOT IN (?, ?)");
    expect(params).toStrictEqual(["a", "b"]);
  });

  test("between filter generates correct SQL", () => {
    const { where, params } = between(18, 65).toSQL("__value->'$.age'");
    expect(where).toBe("__value->'$.age' BETWEEN ? AND ?");
    expect(params).toStrictEqual([18, 65]);
  });

  test("like filter generates correct SQL", () => {
    const { where, params } = like("John%").toSQL("__value->'$.name'");
    expect(where).toBe("__value->'$.name' LIKE ?");
    expect(params).toStrictEqual(["John%"]);
  });

  test("or filter combines filters with OR", () => {
    const { where, params } = or(eq("New York"), eq("Washington")).toSQL("__value->'$.city'");
    expect(where).toBe("(__value->'$.city' == ? OR __value->'$.city' == ?)");
    expect(params).toStrictEqual(["New York", "Washington"]);
  });

  test("and filter combines filters with AND", () => {
    const { where, params } = and(gt(18), lt(65)).toSQL("__value->'$.age'");
    expect(where).toBe("(__value->'$.age' > ? AND __value->'$.age' < ?)");
    expect(params).toStrictEqual([18, 65]);
  });

  test("or with single filter wraps in parentheses", () => {
    const { where } = or(eq("x")).toSQL("__value->'$.f'");
    expect(where).toBe("(__value->'$.f' == ?)");
  });

  test("or with no filters returns TRUE", () => {
    const { where, params } = or().toSQL("__value->'$.f'");
    expect(where).toBe("TRUE");
    expect(params).toStrictEqual([]);
  });

  test("isNull filter generates correct SQL", () => {
    const { where, params } = isNull().toSQL("__value->'$.deleted_at'");
    expect(where).toBe("__value->'$.deleted_at' IS NULL");
    expect(params).toStrictEqual([]);
  });

  test("isNotNull filter generates correct SQL", () => {
    const { where, params } = isNotNull().toSQL("__value->'$.deleted_at'");
    expect(where).toBe("__value->'$.deleted_at' IS NOT NULL");
    expect(params).toStrictEqual([]);
  });
});

// =========================================================================
// KV / Store / Collection – Real SQLite integration tests
// =========================================================================

const adapter = new SQLiteAdapter();
const kvdb = new KV(adapter);

describe("KV / Store / Collection – Real SQLite integration tests", () => {
  test("new KV() creates a KV instance", () => {
    expect(kvdb).not.toBeNull();
    expect(kvdb).not.toBeUndefined();
    expect(kvdb.adapter).toBe(adapter);
  });

  test("KV.store() creates table and index", async () => {
    await kvdb.store("kv");
    // Verify table was created
    const tables = adapter.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='kv'").all() as {
      name: string;
    }[];
    expect(tables.length).toBe(1);
    expect(tables[0].name).toBe("kv");

    // Verify index was created
    const indexes = adapter.db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_kv_collection'")
      .all() as { name: string }[];
    expect(indexes.length).toBe(1);
    expect(indexes[0].name).toBe("idx_kv_collection");
  });

  test("KV provides filter operators as instance methods", () => {
    expect(typeof kvdb.eq).toBe("function");
    expect(typeof kvdb.lt).toBe("function");
    expect(typeof kvdb.gt).toBe("function");
    expect(typeof kvdb.regexp).toBe("function");
    expect(typeof kvdb.or).toBe("function");
    expect(typeof kvdb.and).toBe("function");
    expect(typeof kvdb.isIn).toBe("function");
    expect(typeof kvdb["in"]).toBe("function");
  });

  test("Collection.set() stores validated value", async () => {
    const kv = await kvdb.store("kv");
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    await users.set("user1", { id: "user1", name: "Alice" });

    // Verify data was stored correctly
    const rows = adapter.db.prepare("SELECT __key, __value FROM kv").all() as { __key: string; __value: string }[];
    expect(rows.length).toBe(1);
    expect(rows[0].__key).toBe(JSON.stringify(["users", "user1"]));
    expect(JSON.parse(rows[0].__value)).toStrictEqual({ id: "user1", name: "Alice" });
  });

  test("Collection.get() queries by key", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    await users.set("user1", { id: "user1", name: "Alice" });
    const user = await users.get("user1");

    expect(user).not.toBeNull();
    expect(user).not.toBeUndefined();
    expect(user!.name).toBe("Alice");
  });

  test("Collection.get() returns null for missing key", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    const user = await users.get("nonexistent");
    expect(user).toBe(null);
  });

  test("Collection.getMany() queries multiple keys", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    await users.set("u1", { id: "u1", name: "Alice" });
    await users.set("u2", { id: "u2", name: "Bob" });
    const items = await users.getMany(["u1", "u2"]);

    expect(items.length).toBe(2);
    expect(items[0].name).toBe("Alice");
    expect(items[1].name).toBe("Bob");
  });

  test("Collection.list() queries by collection prefix", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    await users.set("u1", { id: "u1", name: "Alice" });
    await users.set("u2", { id: "u2", name: "Bob" });
    const items = await users.list();

    expect(items.length).toBe(2);
    expect(items[0].name).toBe("Alice");
    expect(items[1].name).toBe("Bob");
  });

  test("Collection.list() scoped to collection", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });
    const posts = kv.collection({
      name: "posts",
      schema: z.object({ id: z.string(), title: z.string() }),
    });

    await users.set("u1", { id: "u1", name: "Alice" });
    await posts.set("p1", { id: "p1", title: "Hello" });

    const userList = await users.list();
    const postList = await posts.list();
    expect(userList.length).toBe(1);
    expect(postList.length).toBe(1);
  });

  test("Collection.find() builds filter conditions", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string(), age: z.number() }),
    });

    await users.set("u1", { id: "u1", name: "Alice", age: 25 });
    await users.set("u2", { id: "u2", name: "Bob", age: 35 });

    const items = await users.find({
      name: eq("Alice"),
      age: lt(30),
    });

    expect(items.length).toBe(1);
    expect(items[0].name).toBe("Alice");
  });

  test("Collection.find() with dot-notation fields", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({
        id: z.string(),
        address: z.object({ city: z.string() }),
      }),
    });

    await users.set("u1", { id: "u1", address: { city: "New York" } });
    await users.set("u2", { id: "u2", address: { city: "Washington" } });

    const items = await users.find({ "address.city": eq("New York") });
    expect(items.length).toBe(1);
    expect(items[0].id).toBe("u1");
  });

  test("Collection.find() with or filter", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), city: z.string() }),
    });

    await users.setMany([
      ["u1", { id: "u1", city: "New York" }],
      ["u2", { id: "u2", city: "Washington" }],
      ["u3", { id: "u3", city: "Chicago" }],
    ]);

    const items = await users.find({
      city: kvdb.or(kvdb.eq("New York"), kvdb.eq("Washington")),
    });

    expect(items.length).toBe(2);
  });

  test("Collection.deleteMany() deletes by keys", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    await users.setMany([
      ["u1", { id: "u1", name: "Alice" }],
      ["u2", { id: "u2", name: "Bob" }],
    ]);
    await users.deleteMany(["u1"]);

    const remaining = await users.list();
    expect(remaining.length).toBe(1);
    expect(remaining[0].name).toBe("Bob");
  });

  test("Collection.deleteMany() skips empty array", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    // Should not throw
    await users.deleteMany([]);
  });

  test("EXPLAIN QUERY PLAN shows index usage for collection queries", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string(), age: z.number() }),
    });

    // Insert some data so the query planner has data to consider
    await users.setMany([
      ["u1", { id: "u1", name: "Alice", age: 25 }],
      ["u2", { id: "u2", name: "Bob", age: 35 }],
      ["u3", { id: "u3", name: "Charlie", age: 30 }],
    ]);

    // Run EXPLAIN QUERY PLAN on the same query that Collection.list() uses
    const tableName = kv.tableName;
    const plan = adapter.db
      .prepare(`EXPLAIN QUERY PLAN SELECT __value AS value FROM ${tableName} WHERE __key->>'$[0]' == ?`)
      .all("users") as { selectid: number; order: number; from: number; detail: string }[];

    // The plan detail should indicate an index lookup (SEARCH or USING INDEX)
    const planDetails = plan.map((r) => r.detail).join(" | ");
    const usesIndex = planDetails.includes("USING INDEX") || planDetails.includes("SEARCH");
    expect(usesIndex, `Expected index usage, got plan: ${planDetails}`).toBe(true);
  });

  test("Collection.extract() returns RawSQL for field path", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });
    const rawRef = users.extract("name");
    expect(rawRef.sql).toBe("__value->>'$.name'");
  });

  test("Collection.sql tagged template queries", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    await users.set("u1", { id: "u1", name: "Alice" });

    const rows = await users.sql`SELECT ${users.extract(
      "name",
    )} AS name FROM ${users.table} WHERE __value->'$.mail' LIKE ${"%@example.com"}`;

    expect(rows.length).toBe(0);
  });

  // =======================================================================
  // Pagination tests
  // =======================================================================

  test("Collection.list() with limit returns at most N items", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    await users.setMany(Array.from({ length: 10 }, (_, i) => [`u${i}`, { id: `u${i}`, name: `User${i}` }] as const));

    const limited = await users.list({ limit: 3 });
    expect(limited.length).toBe(3);
  });

  test("Collection.list() with offset skips items", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    for (let i = 0; i < 10; i++) {
      await users.set(`u${i}`, { id: `u${i}`, name: `User${i}` });
    }

    const all = await users.list({ orderBy: { field: "id" } });
    expect(all.length).toBe(10);
    expect(all[0].id).toBe("u0");

    const offset = await users.list({ orderBy: { field: "id" }, offset: 5 });
    expect(offset.length).toBe(5);
    expect(offset[0].id).toBe("u5");
  });

  test("Collection.list() with limit + offset paginates correctly", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    // for (let i = 0; i < 10; i++) {
    //   await users.set(`u${i}`, { id: `u${i}`, name: `User${i}` });
    // }
    await users.setMany(Array.from({ length: 10 }, (_, i) => [`u${i}`, { id: `u${i}`, name: `User${i}` }] as const));

    // Page 1: first 5 items
    const page1 = await users.list({ orderBy: { field: "id" }, limit: 5, offset: 0 });
    expect(page1.length).toBe(5);
    expect(page1[0].id).toBe("u0");
    expect(page1[4].id).toBe("u4");

    // Page 2: next 5 items
    const page2 = await users.list({ orderBy: { field: "id" }, limit: 5, offset: 5 });
    expect(page2.length).toBe(5);
    expect(page2[0].id).toBe("u5");
    expect(page2[4].id).toBe("u9");

    // Page 5 (last): items 20-24 but only 10 exist
    const page5 = await users.list({ orderBy: { field: "id" }, limit: 5, offset: 20 });
    expect(page5.length).toBe(0);
  });

  // =======================================================================
  // Sorting tests
  // =======================================================================

  test("Collection.list() with single-field ascending sort", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    await users.set("u1", { id: "u1", name: "Charlie" });
    await users.set("u2", { id: "u2", name: "Alice" });
    await users.set("u3", { id: "u3", name: "Bob" });

    const sorted = await users.list({ orderBy: { field: "name", direction: "asc" } });
    expect(sorted.length).toBe(3);
    expect(sorted[0].name).toBe("Alice");
    expect(sorted[1].name).toBe("Bob");
    expect(sorted[2].name).toBe("Charlie");
  });

  test("Collection.list() with descending sort", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    await users.set("u1", { id: "u1", name: "Alice" });
    await users.set("u2", { id: "u2", name: "Bob" });
    await users.set("u3", { id: "u3", name: "Charlie" });

    const sorted = await users.list({ orderBy: { field: "name", direction: "desc" } });
    expect(sorted.length).toBe(3);
    expect(sorted[0].name).toBe("Charlie");
    expect(sorted[1].name).toBe("Bob");
    expect(sorted[2].name).toBe("Alice");
  });

  test("Collection.list() with multi-field sort", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string(), age: z.number() }),
    });

    await users.set("u1", { id: "u1", name: "Alice", age: 30 });
    await users.set("u2", { id: "u2", name: "Bob", age: 25 });
    await users.set("u3", { id: "u3", name: "Alice", age: 20 });

    // Sort by name ASC, then age DESC
    const sorted = await users.list({
      orderBy: [
        { field: "name", direction: "asc" },
        { field: "age", direction: "desc" },
      ],
    });

    expect(sorted.length).toBe(3);
    expect(sorted[0].name).toBe("Alice");
    expect(sorted[0].age).toBe(30);
    expect(sorted[1].name).toBe("Alice");
    expect(sorted[1].age).toBe(20);
    expect(sorted[2].name).toBe("Bob");
  });

  test("Collection.list() with sort defaults to ascending", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    await users.set("u1", { id: "u1", name: "Charlie" });
    await users.set("u2", { id: "u2", name: "Alice" });
    await users.set("u3", { id: "u3", name: "Bob" });

    const sorted = await users.list({ orderBy: { field: "name" } });
    expect(sorted[0].name).toBe("Alice");
    expect(sorted[1].name).toBe("Bob");
    expect(sorted[2].name).toBe("Charlie");
  });

  test("Collection.find() with pagination", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string(), age: z.number() }),
    });

    for (let i = 0; i < 10; i++) {
      await users.set(`u${i}`, { id: `u${i}`, name: `User${i}`, age: 20 + i });
    }

    const results = await users.find({ age: gte(22) }, { orderBy: { field: "age" }, limit: 3, offset: 1 });

    expect(results.length).toBe(3);
    expect(results[0].age).toBe(23);
    expect(results[1].age).toBe(24);
    expect(results[2].age).toBe(25);
  });

  test("Collection.find() with sorting", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string(), age: z.number() }),
    });

    await users.set("u1", { id: "u1", name: "Charlie", age: 35 });
    await users.set("u2", { id: "u2", name: "Alice", age: 25 });
    await users.set("u3", { id: "u3", name: "Bob", age: 30 });

    const results = await users.find({ age: gte(20) }, { orderBy: { field: "name", direction: "desc" } });

    expect(results.length).toBe(3);
    expect(results[0].name).toBe("Charlie");
    expect(results[1].name).toBe("Bob");
    expect(results[2].name).toBe("Alice");
  });

  test("Collection.list() with sort + limit + offset combined", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    for (let i = 0; i < 10; i++) {
      await users.set(`u${i}`, { id: `u${i}`, name: `User${i}` });
    }

    // Sort by id DESC, get 3 items after skipping 2
    const result = await users.list({
      orderBy: { field: "id", direction: "desc" },
      limit: 3,
      offset: 2,
    });

    expect(result.length).toBe(3);
    // ids descending: u9, u8, u7, u6, u5, ...
    // skip 2 (u9, u8) → u7, u6, u5
    expect(result[0].id).toBe("u7");
    expect(result[1].id).toBe("u6");
    expect(result[2].id).toBe("u5");
  });
});

// =========================================================================
// Integration-style test with full CRUD flow (real SQLite)
// =========================================================================

describe("Integration-style test with full CRUD flow (real SQLite)", () => {
  test("full CRUD flow with SQLite", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);

    const UserSchema = z.object({
      id: z.string(),
      name: z.string(),
      age: z.number().optional(),
    });
    const users = kv.collection({ name: "users", schema: UserSchema });

    // Create
    const [saved] = await users.set("user1", { id: "user1", name: "Alice", age: 25 });
    expect(saved.name).toBe("Alice");

    // Read
    const found = await users.get("user1");
    expect(found).not.toBeNull();
    expect(found).not.toBeUndefined();
    expect(found!.name).toBe("Alice");
    expect(found!.age).toBe(25);

    // Update
    await users.set("user1", { id: "user1", name: "Alice Updated" });
    const updated = await users.get("user1");
    expect(updated).not.toBeNull();
    expect(updated).not.toBeUndefined();
    expect(updated!.name).toBe("Alice Updated");

    // Get missing
    const missing = await users.get("nonexistent");
    expect(missing).toBe(null);

    // List
    await users.set("user2", { id: "user2", name: "Bob" });
    const all = await users.list();
    expect(all.length).toBe(2);

    // Delete
    await users.deleteMany(["user1"]);
    const afterDelete = await users.list();
    expect(afterDelete.length).toBe(1);
    expect(afterDelete[0].name).toBe("Bob");
  });
});
