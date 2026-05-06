# `@chrock-studio/sql-kv` - 基于 SQL JSON Functions 的 KV Storage

## 基本原理即设计方案

### 基于 `JSON Functions`

当前的大部分SQL引擎已支持以 `json` 和 `json_extract` 为主的系列 JSON 解析函数，可用于对存储于数据库内的 JSON 文本进行查询操作。

- `json_extract()`/`->` 操作符
- 等，只依赖 `->` 操作符，用于提供给数据库内部进行解析

基于此前提，可将以往基于固定表字段的表调整为以 `key:value` 对为主的键值对表，并通过 `json()` 和 `json_extract` 建立 `index` 或者 `view`，通过这种方式，提供：

- 比原生字段表更灵活的数据模型
- 比原生 KV 数据库更强大的查询功能

通过牺牲一定的性能为代价，以此获得介于两者之间的灵活性和关联查询能力。

### 存取方式

- 对于 KV 表，其只需要遵循以下基本结构即可支持存取：
  ```plaintext
  +------------------+---------+
  | __key            | __value |
  +------------------+---------+
  | TEXT PRIMARY_KEY | TEXT    |
  +------------------+---------+
  ```
- 对于索引，可以通过此方式创建：
  ```sql
  BEGIN TRANSACTION;
  DROP INDEX idx_mail;
  CREATE INDEX INDEX idx_mail ON kv (__value->'$.mail');
  COMMIT;
  ```
- 对于数据约束，基于 `zod` 实现：
  ```ts
  const UserSchema = z.object({
    id: z.nanoid(),
    name: z.string(),
    mail: z.mail(),
  });
  type UserSchema = z.output<typeof UserSchema>;

  const PostSchema = z.object({
    id: z.nanoid(),
    title: z.string(),
    content: z.string(),

    owner: z.lazy(() => UserSchema), // 相当于relative！在对这种Schema (lazy)进行查询时，会检查其是否在已注册的collection中，如果在，就关联查询（或者通过批量查询后再内存组装，皆可），如果不在，就作为嵌套对象原样存入
  });
  type PostSchema = z.output<typeof PostSchema>;

  const users = kv.collection({
    name: "users",
    schema: UserSchema,
    indexes: [
      "name", // CREATE INDEX idx_users_name ON kv (__value->'$.name');
      "mail", // CREATE INDEX idx_users_mail ON kv (__value->'$.mail');
    ],
  });
  const posts = kv.collection({
    name: "posts",
    schema: PostSchema,
    indexes: [
      "title", // CREATE INDEX idx_posts_title ON kv (__value->'$.title');
      "owner", // CREATE INDEX idx_posts_owner_id ON kv (__value->'$.owner_id');
    ],
  });

  const [user] = await users.set("UkjOid93_", {
    id: "UkjOid93_",
    name: "John Doe",
    mail: "john_doe@example.com",
  });
  // INSERT INTO kv (__key, __value) VALUES (?, ?); ('["users", "UkjOid93_"]', '{ id: "UkjOid93_", name: "John Doe", mail: "john_doe@example.com" }');
  // 根据ID，从collection中获取指定条目
  const user2 = await users.get("UkjOid93_");
  // SELECT __value->'$' AS value FROM kv WHERE __key->'$' == ?->'$'; ('["users", "UkjOid93_"]')
  const family = await users.getMany(["UkjOd93_", "JIczAd_3"]);
  // SELECT __value->'$' AS value FROM kv WHERE __key->'$' ON (?->'$', ?->'$'); ('["users", "UkjOid93_"]', '["users", "JIczAd_3"]')
  // 获取collection的所有条目
  const list = await users.list();
  // SELECT __value->'$' AS value FROM kv WHERE __key->'$[0]' == ?; ('"users"')
  // 通过条件匹配条目
  const filtered = await users.find({
    "mail": kv.regexp("[^@]+@.+\..+"),
    "age": kv.lt(20),
    "address.city": kv.or(kv.eq("New York"), kv.eq("Washington")), // 等价于 kv.in(["New York", "Washington"])
  });
  // SELECT __value->'$' AS value FROM kv WHERE TRUE AND __value->'$.mail' REGEXP ? AND __value->'$.age' <= ? AND (__value->'$.address.city' == ? OR __value->'$.address.city' == ?); ("[^@]+@.+\..+", 20, "New York", "Washington");
  // 通过ID批量移除
  await users.deleteMany(["UkjOd93_", "JIczAd_3"]);
  // DELETE FROM kv WHERE __key->'$' == ?->'$'; ('["users", "UkjOid93_"]', '["users", "JIczAd_3"]')

  const postForUser = await posts.find({ "owner": kv.eq(user) });
  // SELECT __value->'$' AS value FROM kv WHERE TRUE AND __value->'$.owner_id' == ?; ("UkjOid93_")
  console.log(postFromUser.owner); // -> { id: "UkjOid93_", name: ..., mail: ... }

  // 也可以直接执行SQL语句，来组装特定的查询逻辑
  const [{ name }] = await users.sql`SELECT ${users.extract("name")} AS name FROM ${kv.table} WHERE __value->'$.mail' LIKE ${"%@example.com"}`;
  // SELECT __value->'$.name' AS name FROM kv WHERE __value->'$.mail' LIKE ?`; ("%@example.com")
  // column 和 table 都是特殊的值所以不会被编译为插槽而是直接拼接，后续的则是普通插值，因此编译为插槽，并且通过 `run(sql, ['%@example.com'])` 进行调用
  ```

### 支持方式

此存储方案是基于 SQL 的上层构建，本身不直接对接到某个具体的数据库，因此，用户**只需要**提供以下形状的接口，即可使用此方案。

- `run(sql: string, inputs: SQLInputValue[]): Promise<unknown[] & { rows?: number; lastId?: unknown }>`
  - `sql`：期望执行的SQL文本
  - `inputs`：注入的执行参数
  - `return`：返回执行结果
- `transaction<T>(fn: (run: (sql: string, inputs: SQLInputValue[]) => Promise<unknown[] & { rows?: number; lastId?: unknown }>) => Promise<T>): Promise<T>`：
  - `fn`：在此事物期间执行 SQL 的执行函数，接受形同 `run` 的执行器函数
  - `return`：返回执行函数的返回值

使用方式形如：

```ts
const kvdb: KV = new KV({
  run(sql, inputs) {
    return db.prepare(sql).run(inputs);
  },
  transaction(fn) {
    return db.transaction(fn);
  },
});

const kv = await kvdb.store("kv");
// CREATE TABLE IF NOT EXISTS kv (__key TEXT PRIMARY KEY, __value TEXT); -- 创建目标表
// CREATE INDEX idx_kv_collection ON kv (__key->'$[0]'); -- 创建集合索引

const users = kv.collection({/* ... */});
// CREATE INDEX idx_users_name ON kv (__value->'$.name');
// CREATE INDEX idx_users_mail ON kv (__value->'$.mail');
```
