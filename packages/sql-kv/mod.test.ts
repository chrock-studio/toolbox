/**
 * Tests for `@chrock-studio/sql-kv`.
 *
 * Uses `node:sqlite` (`DatabaseSync`) as the real SQL backend
 * for in-memory integration testing.
 *
 * @module
 */

import { assertEquals, assertExists } from "@std/assert";
import { z } from "zod";
import { isRaw, KV, raw, sql } from "./mod.ts";
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

Deno.test("sql.ts – raw() / isRaw() / sql tagged template", async (t) => {
  await t.step("raw() creates a RawSQL marker", () => {
    const r = raw("__value->'$.name'");
    assertEquals(r._raw, true);
    assertEquals(r.sql, "__value->'$.name'");
    assertEquals(Object.isFrozen(r), true);
  });

  await t.step("isRaw() detects RawSQL markers", () => {
    assertEquals(isRaw(raw("test")), true);
    assertEquals(isRaw("string"), false);
    assertEquals(isRaw(42), false);
    assertEquals(isRaw(null), false);
    assertEquals(isRaw(undefined), false);
    assertEquals(isRaw({ _raw: false }), false);
  });

  await t.step("sql tagged template parameterizes normal values", () => {
    const { text, params } = sql`SELECT * FROM kv WHERE name = ${"John"} AND age = ${30}`;
    assertEquals(text, "SELECT * FROM kv WHERE name = ? AND age = ?");
    assertEquals(params, ["John", 30]);
  });

  await t.step("sql tagged template inline raw values", () => {
    const { text, params } = sql`SELECT ${raw("__value->'$.name'")} AS name FROM ${raw("kv")} WHERE age = ${30}`;
    assertEquals(text, "SELECT __value->'$.name' AS name FROM kv WHERE age = ?");
    assertEquals(params, [30]);
  });

  await t.step("sql tagged template handles no values", () => {
    const { text, params } = sql`SELECT * FROM kv LIMIT 10`;
    assertEquals(text, "SELECT * FROM kv LIMIT 10");
    assertEquals(params, []);
  });
});

// =========================================================================
// filter.ts – Filter operators
// =========================================================================

Deno.test("filter.ts – Filter operators", async (t) => {
  await t.step("eq filter generates correct SQL", () => {
    const { where, params } = eq("John").toSQL("__value->'$.name'");
    assertEquals(where, "__value->'$.name' == ?");
    assertEquals(params, ["John"]);
  });

  await t.step("neq filter generates correct SQL", () => {
    const { where, params } = neq(42).toSQL("__value->'$.age'");
    assertEquals(where, "__value->'$.age' != ?");
    assertEquals(params, [42]);
  });

  await t.step("lt filter generates correct SQL", () => {
    const { where, params } = lt(20).toSQL("__value->'$.age'");
    assertEquals(where, "__value->'$.age' < ?");
    assertEquals(params, [20]);
  });

  await t.step("lte filter generates correct SQL", () => {
    const { where, params } = lte(20).toSQL("__value->'$.age'");
    assertEquals(where, "__value->'$.age' <= ?");
    assertEquals(params, [20]);
  });

  await t.step("gt filter generates correct SQL", () => {
    const { where, params } = gt(18).toSQL("__value->'$.age'");
    assertEquals(where, "__value->'$.age' > ?");
    assertEquals(params, [18]);
  });

  await t.step("gte filter generates correct SQL", () => {
    const { where, params } = gte(18).toSQL("__value->'$.age'");
    assertEquals(where, "__value->'$.age' >= ?");
    assertEquals(params, [18]);
  });

  await t.step("regexp filter generates correct SQL", () => {
    const { where, params } = regexp("[^@]+@.+\\..+").toSQL("__value->'$.mail'");
    assertEquals(where, "__value->'$.mail' REGEXP ?");
    assertEquals(params, ["[^@]+@.+\\..+"]);
  });

  await t.step("isIn filter generates correct SQL", () => {
    const { where, params } = isIn(["New York", "Washington"]).toSQL("__value->'$.address.city'");
    assertEquals(where, "__value->'$.address.city' IN (?, ?)");
    assertEquals(params, ["New York", "Washington"]);
  });

  await t.step("notIn filter generates correct SQL", () => {
    const { where, params } = notIn(["a", "b"]).toSQL("__value->'$.x'");
    assertEquals(where, "__value->'$.x' NOT IN (?, ?)");
    assertEquals(params, ["a", "b"]);
  });

  await t.step("between filter generates correct SQL", () => {
    const { where, params } = between(18, 65).toSQL("__value->'$.age'");
    assertEquals(where, "__value->'$.age' BETWEEN ? AND ?");
    assertEquals(params, [18, 65]);
  });

  await t.step("like filter generates correct SQL", () => {
    const { where, params } = like("John%").toSQL("__value->'$.name'");
    assertEquals(where, "__value->'$.name' LIKE ?");
    assertEquals(params, ["John%"]);
  });

  await t.step("or filter combines filters with OR", () => {
    const { where, params } = or(eq("New York"), eq("Washington")).toSQL("__value->'$.city'");
    assertEquals(where, "(__value->'$.city' == ? OR __value->'$.city' == ?)");
    assertEquals(params, ["New York", "Washington"]);
  });

  await t.step("and filter combines filters with AND", () => {
    const { where, params } = and(gt(18), lt(65)).toSQL("__value->'$.age'");
    assertEquals(where, "(__value->'$.age' > ? AND __value->'$.age' < ?)");
    assertEquals(params, [18, 65]);
  });

  await t.step("or with single filter wraps in parentheses", () => {
    const { where } = or(eq("x")).toSQL("__value->'$.f'");
    assertEquals(where, "(__value->'$.f' == ?)");
  });

  await t.step("or with no filters returns TRUE", () => {
    const { where, params } = or().toSQL("__value->'$.f'");
    assertEquals(where, "TRUE");
    assertEquals(params, []);
  });

  await t.step("isNull filter generates correct SQL", () => {
    const { where, params } = isNull().toSQL("__value->'$.deleted_at'");
    assertEquals(where, "__value->'$.deleted_at' IS NULL");
    assertEquals(params, []);
  });

  await t.step("isNotNull filter generates correct SQL", () => {
    const { where, params } = isNotNull().toSQL("__value->'$.deleted_at'");
    assertEquals(where, "__value->'$.deleted_at' IS NOT NULL");
    assertEquals(params, []);
  });
});

// =========================================================================
// KV / Store / Collection – Real SQLite integration tests
// =========================================================================

const adapter = new SQLiteAdapter();
const kvdb = new KV(adapter);

Deno.test("KV / Store / Collection – Real SQLite integration tests", async (t) => {
  await t.step("new KV() creates a KV instance", () => {
    assertExists(kvdb);
    assertEquals(kvdb.adapter, adapter);
  });

  await t.step("KV.store() creates table and index", async () => {
    await kvdb.store("kv");
    // Verify table was created
    const tables = adapter.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='kv'")
      .all() as { name: string }[];
    assertEquals(tables.length, 1);
    assertEquals(tables[0].name, "kv");

    // Verify index was created
    const indexes = adapter.db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_kv_collection'")
      .all() as { name: string }[];
    assertEquals(indexes.length, 1);
    assertEquals(indexes[0].name, "idx_kv_collection");
  });

  await t.step("KV provides filter operators as instance methods", () => {
    assertEquals(typeof kvdb.eq, "function");
    assertEquals(typeof kvdb.lt, "function");
    assertEquals(typeof kvdb.gt, "function");
    assertEquals(typeof kvdb.regexp, "function");
    assertEquals(typeof kvdb.or, "function");
    assertEquals(typeof kvdb.and, "function");
    assertEquals(typeof kvdb.isIn, "function");
    assertEquals(typeof kvdb["in"], "function");
  });

  await t.step("Collection.set() stores validated value", async () => {
    const kv = await kvdb.store("kv");
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    await users.set("user1", { id: "user1", name: "Alice" });

    // Verify data was stored correctly
    const rows = adapter.db
      .prepare("SELECT __key, __value FROM kv")
      .all() as { __key: string; __value: string }[];
    assertEquals(rows.length, 1);
    assertEquals(rows[0].__key, JSON.stringify(["users", "user1"]));
    assertEquals(JSON.parse(rows[0].__value), { id: "user1", name: "Alice" });
  });

  await t.step("Collection.get() queries by key", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    await users.set("user1", { id: "user1", name: "Alice" });
    const user = await users.get("user1");

    assertExists(user);
    assertEquals(user.name, "Alice");
  });

  await t.step("Collection.get() returns null for missing key", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    const user = await users.get("nonexistent");
    assertEquals(user, null);
  });

  await t.step("Collection.getMany() queries multiple keys", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    await users.set("u1", { id: "u1", name: "Alice" });
    await users.set("u2", { id: "u2", name: "Bob" });
    const items = await users.getMany(["u1", "u2"]);

    assertEquals(items.length, 2);
    assertEquals(items[0].name, "Alice");
    assertEquals(items[1].name, "Bob");
  });

  await t.step("Collection.list() queries by collection prefix", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    await users.set("u1", { id: "u1", name: "Alice" });
    await users.set("u2", { id: "u2", name: "Bob" });
    const items = await users.list();

    assertEquals(items.length, 2);
    assertEquals(items[0].name, "Alice");
    assertEquals(items[1].name, "Bob");
  });

  await t.step("Collection.list() scoped to collection", async () => {
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
    assertEquals(userList.length, 1);
    assertEquals(postList.length, 1);
  });

  await t.step("Collection.find() builds filter conditions", async () => {
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

    assertEquals(items.length, 1);
    assertEquals(items[0].name, "Alice");
  });

  await t.step("Collection.find() with dot-notation fields", async () => {
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
    assertEquals(items.length, 1);
    assertEquals(items[0].id, "u1");
  });

  await t.step("Collection.find() with or filter", async () => {
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

    assertEquals(items.length, 2);
  });

  await t.step("Collection.deleteMany() deletes by keys", async () => {
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
    assertEquals(remaining.length, 1);
    assertEquals(remaining[0].name, "Bob");
  });

  await t.step("Collection.deleteMany() skips empty array", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    // Should not throw
    await users.deleteMany([]);
  });

  await t.step("EXPLAIN QUERY PLAN shows index usage for collection queries", async () => {
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
      .prepare(
        `EXPLAIN QUERY PLAN SELECT __value AS value FROM ${tableName} WHERE __key->>'$[0]' == ?`,
      )
      .all("users") as { selectid: number; order: number; from: number; detail: string }[];

    // The plan detail should indicate an index lookup (SEARCH or USING INDEX)
    const planDetails = plan.map((r) => r.detail).join(" | ");
    const usesIndex = planDetails.includes("USING INDEX") || planDetails.includes("SEARCH");
    assertEquals(usesIndex, true, `Expected index usage, got plan: ${planDetails}`);
  });

  await t.step("Collection.extract() returns RawSQL for field path", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });
    const rawRef = users.extract("name");
    assertEquals(rawRef.sql, "__value->>'$.name'");
  });

  await t.step("Collection.sql tagged template queries", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    await users.set("u1", { id: "u1", name: "Alice" });

    const rows = await users.sql`SELECT ${
      users.extract("name")
    } AS name FROM ${users.table} WHERE __value->'$.mail' LIKE ${"%@example.com"}`;

    assertEquals(rows.length, 0);
  });

  // =======================================================================
  // Pagination tests
  // =======================================================================

  await t.step("Collection.list() with limit returns at most N items", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    await users.setMany(Array.from({ length: 10 }, (_, i) => [`u${i}`, { id: `u${i}`, name: `User${i}` }] as const));

    const limited = await users.list({ limit: 3 });
    assertEquals(limited.length, 3);
  });

  await t.step("Collection.list() with offset skips items", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    for (let i = 0; i < 10; i++) {
      await users.set(`u${i}`, { id: `u${i}`, name: `User${i}` });
    }

    const all = await users.list({ orderBy: { field: "id" } });
    assertEquals(all.length, 10);
    assertEquals(all[0].id, "u0");

    const offset = await users.list({ orderBy: { field: "id" }, offset: 5 });
    assertEquals(offset.length, 5);
    assertEquals(offset[0].id, "u5");
  });

  await t.step("Collection.list() with limit + offset paginates correctly", async () => {
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
    assertEquals(page1.length, 5);
    assertEquals(page1[0].id, "u0");
    assertEquals(page1[4].id, "u4");

    // Page 2: next 5 items
    const page2 = await users.list({ orderBy: { field: "id" }, limit: 5, offset: 5 });
    assertEquals(page2.length, 5);
    assertEquals(page2[0].id, "u5");
    assertEquals(page2[4].id, "u9");

    // Page 5 (last): items 20-24 but only 10 exist
    const page5 = await users.list({ orderBy: { field: "id" }, limit: 5, offset: 20 });
    assertEquals(page5.length, 0);
  });

  // =======================================================================
  // Sorting tests
  // =======================================================================

  await t.step("Collection.list() with single-field ascending sort", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    await users.set("u1", { id: "u1", name: "Charlie" });
    await users.set("u2", { id: "u2", name: "Alice" });
    await users.set("u3", { id: "u3", name: "Bob" });

    const sorted = await users.list({ orderBy: { field: "name", direction: "asc" } });
    assertEquals(sorted.length, 3);
    assertEquals(sorted[0].name, "Alice");
    assertEquals(sorted[1].name, "Bob");
    assertEquals(sorted[2].name, "Charlie");
  });

  await t.step("Collection.list() with descending sort", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    await users.set("u1", { id: "u1", name: "Alice" });
    await users.set("u2", { id: "u2", name: "Bob" });
    await users.set("u3", { id: "u3", name: "Charlie" });

    const sorted = await users.list({ orderBy: { field: "name", direction: "desc" } });
    assertEquals(sorted.length, 3);
    assertEquals(sorted[0].name, "Charlie");
    assertEquals(sorted[1].name, "Bob");
    assertEquals(sorted[2].name, "Alice");
  });

  await t.step("Collection.list() with multi-field sort", async () => {
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

    assertEquals(sorted.length, 3);
    assertEquals(sorted[0].name, "Alice");
    assertEquals(sorted[0].age, 30);
    assertEquals(sorted[1].name, "Alice");
    assertEquals(sorted[1].age, 20);
    assertEquals(sorted[2].name, "Bob");
  });

  await t.step("Collection.list() with sort defaults to ascending", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string() }),
    });

    await users.set("u1", { id: "u1", name: "Charlie" });
    await users.set("u2", { id: "u2", name: "Alice" });
    await users.set("u3", { id: "u3", name: "Bob" });

    const sorted = await users.list({ orderBy: { field: "name" } });
    assertEquals(sorted[0].name, "Alice");
    assertEquals(sorted[1].name, "Bob");
    assertEquals(sorted[2].name, "Charlie");
  });

  await t.step("Collection.find() with pagination", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string(), age: z.number() }),
    });

    for (let i = 0; i < 10; i++) {
      await users.set(`u${i}`, { id: `u${i}`, name: `User${i}`, age: 20 + i });
    }

    const results = await users.find(
      { age: gte(22) },
      { orderBy: { field: "age" }, limit: 3, offset: 1 },
    );

    assertEquals(results.length, 3);
    assertEquals(results[0].age, 23);
    assertEquals(results[1].age, 24);
    assertEquals(results[2].age, 25);
  });

  await t.step("Collection.find() with sorting", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);
    const users = kv.collection({
      name: "users",
      schema: z.object({ id: z.string(), name: z.string(), age: z.number() }),
    });

    await users.set("u1", { id: "u1", name: "Charlie", age: 35 });
    await users.set("u2", { id: "u2", name: "Alice", age: 25 });
    await users.set("u3", { id: "u3", name: "Bob", age: 30 });

    const results = await users.find(
      { age: gte(20) },
      { orderBy: { field: "name", direction: "desc" } },
    );

    assertEquals(results.length, 3);
    assertEquals(results[0].name, "Charlie");
    assertEquals(results[1].name, "Bob");
    assertEquals(results[2].name, "Alice");
  });

  await t.step("Collection.list() with sort + limit + offset combined", async () => {
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

    assertEquals(result.length, 3);
    // ids descending: u9, u8, u7, u6, u5, ...
    // skip 2 (u9, u8) → u7, u6, u5
    assertEquals(result[0].id, "u7");
    assertEquals(result[1].id, "u6");
    assertEquals(result[2].id, "u5");
  });
});

// =========================================================================
// Integration-style test with full CRUD flow (real SQLite)
// =========================================================================

Deno.test("Integration-style test with full CRUD flow (real SQLite)", async (t) => {
  await t.step("full CRUD flow with SQLite", async () => {
    const kv = await kvdb.store(`kv_${nanoid()}`);

    const UserSchema = z.object({
      id: z.string(),
      name: z.string(),
      age: z.number().optional(),
    });
    const users = kv.collection({ name: "users", schema: UserSchema });

    // Create
    const [saved] = await users.set("user1", { id: "user1", name: "Alice", age: 25 });
    assertEquals(saved.name, "Alice");

    // Read
    const found = await users.get("user1");
    assertExists(found);
    assertEquals(found.name, "Alice");
    assertEquals(found.age, 25);

    // Update
    await users.set("user1", { id: "user1", name: "Alice Updated" });
    const updated = await users.get("user1");
    assertExists(updated);
    assertEquals(updated.name, "Alice Updated");

    // Get missing
    const missing = await users.get("nonexistent");
    assertEquals(missing, null);

    // List
    await users.set("user2", { id: "user2", name: "Bob" });
    const all = await users.list();
    assertEquals(all.length, 2);

    // Delete
    await users.deleteMany(["user1"]);
    const afterDelete = await users.list();
    assertEquals(afterDelete.length, 1);
    assertEquals(afterDelete[0].name, "Bob");
  });
});
