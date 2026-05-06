/**
 * # `@chrock-studio/sql-kv` - A KV Store built on SQL JSON Functions
 *
 * This module provides a key-value storage layer on top of SQL databases,
 * leveraging JSON functions (`json_extract`, `->` operator) for indexing
 * and querying.
 *
 * ## Quick Start
 *
 * ```ts
 * import { KV } from "@chrock-studio/sql-kv";
 * import { z } from "zod";
 *
 * const db: SQLAdapter = { run, transaction };
 * const kvdb = new KV(db);
 * const kv = await kvdb.store("kv");
 *
 * const UserSchema = z.object({ id: z.string(), name: z.string() });
 * const users = kv.collection({ name: "users", schema: UserSchema });
 *
 * await users.set("user1", { id: "user1", name: "Alice" });
 * const user = await users.get("user1");
 * ```
 *
 * @module "@chrock-studio/sql-kv"
 */

export { KV } from "./kv.ts";
export { Store } from "./store.ts";
export { Collection } from "./collection.ts";
export { isRaw, raw, sql } from "./sql.ts";
export * from "./filter.ts";
export type { CollectionConfig, Filter, RawSQL, SQLAdapter, SQLRunResult } from "./types.ts";
