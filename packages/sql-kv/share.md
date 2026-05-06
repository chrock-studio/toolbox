# OiOiOi！别再一直盯着NoSQL啦，来看看SQL数据库的KV实现吧！你甚至可以用SQL查询KV呐！

> 不能做复杂查询的 KV……啊，这个还好。
>
> 不能方便的嵌套的 KV 数据库是没有灵魂的！嗯！

虽然严格来说，NoSQL 领域的正统 KV 数据库已经提供了足够的灵活性，但是有一点很难以逾越——「灵活的 KV 存储」，这很容易，甚至可以通过嵌入 leveldb 来获得，但是，嗯，「强大的 SQL 查询」？抱歉咩，这个没有，想要？自己做 index 去吧！

更具体一点说吧。

有些场景下（通常而言，是需求频繁变动且设计方案的人脑子有坑的情况下——对，就是我自己），我们的数据模型变更非常频繁——今天多一个字段，明天少一个字段，后天把某个字段改个类型……用传统的关系型数据库吧，每次都要跑 migration（喜欢我 `prisma` 文件夹下一堆 migration 的场面吗？）；用 MongoDB 之类的文档数据库吧，简单场景还得搭个完整的服务端，太重了。

但是如果你完全放弃查询能力，用纯 KV ——那就更痛苦了！你想按某个字段过滤一下？不好意思，遍历所有 key 自己实现吧。

真是饱受折磨捏。

不过这俩终归是有好有坏，为了能够获得介于两者之间的体验——**既有 KV 的灵活，又有 SQL 的查询能力**——[`@chrock-studio/sql-kv`](https://jsr.io/@chrock-studio/sql-kv) 诞生了！🎉🎉🎉

这个库通过依赖 SQL 数据库内置的 JSON 函数（`json_extract`、`->`/`->>` 操作符等）来解决「如何用关系型数据库存灵活的数据结构」的问题，进而在同一个数据库之上实现 KV 存取和条件查询，并在应用层保障类型安全。

这玩意儿大概是这么工作的：

1. 在 SQL 中建立一张新表作为容器，只有 `__key` 和 `__value` 两个字段，存的全是 JSON 字符串，这意味着任何结构都能往里塞，你想存啥就存啥，前提是这是**合法的 JSON 对象**。
2. 通过 JSON 函数建立索引，实现对 `__value` 内部字段的高效查询。
3. 通过 `zod` schema 对存取的数据进行运行时校验和类型推导，让 TypeScript 的类型提示能够工作。
4. 通过一套 Filter 操作符（`eq`、`lt`、`gt`、`regexp`、`or`、`and` 等），把条件查询组合成 SQL WHERE 子句。

库本身不绑定特定数据库，只需提供简单接口即可使用，这使得它可以适配 SQLite、PostgreSQL、MySQL 等任何支持 JSON 函数的 SQL 数据库。

于是，使用 `@chrock-studio/sql-kv` 来直接在已有的 SQL 数据库内构建 KV 数据库，应该会是个愉快的过程。

以一个用户管理系统为例，它可以是这样的：

```typescript
import { KV } from "@chrock-studio/sql-kv";
import { z } from "zod";

// 只需要一个实现了 SQLAdapter 接口的适配器，此处假设 myDb 是某个 SQLite Client
const db = new KV({
  run(sql, inputs) { return myDb.prepare(sql).run(inputs); },
  transaction(fn) { return myDb.transaction(fn); },
});

// 创建存储空间（会自动创建表和索引）
const kv = await db.store("kv");

// 定义一个集合，schema 决定了数据的形状
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number().optional(),
  email: z.string().email(),
});
const users = kv.collection({
  name: "users",
  schema: UserSchema,
  // 声明想要创建索引的属性路径，会根据这个路径，通过 `->`/`->>` 操作符创建若干索引
  indexes: ["name", "email"],
});

// 写入
await users.set("user_1", {
  id: "user_1",
  name: "Alice",
  age: 25,
  email: "alice@example.com",
});

// 读取
const user = await users.get("user_1"); // { id: "user_1", name: "Alice", ... }

// 条件查询，嗯……尽量让它的手感用起来像 MongoDB
const results = await users.find({
  age: db.gt(18),
  email: db.regexp("@example\\.com$"),
  name: db.or(db.eq("Alice"), db.eq("Bob")),
});
```

到此为止，一个灵活的 KV + 强大查询（基于底层数据库）的方案就实现了。

如果你感兴趣的话，可以访问 GitHub 仓库查看源码和更多示例：**[chrock-studio/toolbox](https://github.com/chrock-studio/toolbox)**（位于 sql-kv 目录下）。

---

参考资料：
- [SQLite JSON Functions](https://www.sqlite.org/json1.html)
- [Zod: Schema validation](https://zod.dev/)
