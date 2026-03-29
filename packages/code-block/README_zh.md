# `@chrock-studio/code-block`

简易代码块包装器，组装起始块、块体、末尾块吧！

一个轻量级的 TypeScript 库，用于实现资源管理模式（类似 try-with-resources 或 using 语句），确保在代码执行完成后正确清理资源。

## 📦 安装

```bash
# 使用 pnpm
pnpm add @chrock-studio/code-block

# 使用 npm
npm install @chrock-studio/code-block

# 使用 yarn
yarn add @chrock-studio/code-block
```

## 🚀 快速开始

```typescript
import { createBlock } from "@chrock-studio/code-block";

// 创建一个文件操作块
const fileBlock = createBlock(
  // 起始函数：打开文件
  (filename: string) => fs.openSync(filename, "r"),
  // 结束函数：关闭文件
  (fd) => fs.closeSync(fd),
);

// 使用块
const content = fileBlock((fd) => fs.readFileSync(fd, "utf-8"), "example.txt");
```

## 📖 API 文档

### `block(start, end)`

创建一个资源管理块。

#### 参数

| 参数    | 类型                               | 描述                                   |
| ------- | ---------------------------------- | -------------------------------------- |
| `start` | `(...args: unknown[]) => unknown`  | 启动函数，用于初始化资源并返回缓存对象 |
| `end`   | `(cache, result?, error?) => void` | 清理函数，在代码块执行完成后调用       |

#### 返回值

返回一个函数，该函数接收：

- `body`: 主体函数，接收缓存对象并返回结果
- `...args`: 传递给 `start` 函数的参数

#### end 函数参数

| 参数     | 类型                | 描述                                |
| -------- | ------------------- | ----------------------------------- |
| `cache`  | `ReturnType<Start>` | start 函数返回的资源对象            |
| `result` | `unknown`           | body 函数的返回值（如果执行成功）   |
| `error`  | `unknown`           | body 函数抛出的错误（如果执行失败） |

## 💡 使用示例

### 文件操作

```typescript
import { createBlock } from "@chrock-studio/code-block";
import fs from "fs";

const readBlock = createBlock(
  (filename: string) => fs.openSync(filename, "r"),
  (fd) => fs.closeSync(fd),
);

const content = readBlock((fd) => fs.readFileSync(fd, "utf-8"), "example.txt");
```

### 数据库事务

```typescript
import { createBlock } from '@chrock-studio/code-block';

const transactionBlock =  createBlock(
  // 开始事务
  () => db.beginTransaction(),
  // 结束事务：根据结果决定提交或回滚
  (tx, result, error) => {
    if (error) {
      tx.rollback();
    } else {
      tx.commit();
    }
  }
);

// 执行事务
await transactionBlock(async (tx) => {
  await tx.query('INSERT INTO users VALUES (?)', [...]);
  await tx.query('UPDATE accounts SET balance = ?', [...]);
});
```

### 性能计时器

```typescript
import { createBlock } from "@chrock-studio/code-block";

const timerBlock = createBlock(
  // 开始计时
  (label: string) => {
    console.time(label);
    return { label, start: Date.now() };
  },
  // 结束计时
  (cache) => {
    console.timeEnd(cache.label);
    console.log(`Duration: ${Date.now() - cache.start}ms`);
  },
);

// 使用计时器
timerBlock((cache) => expensiveOperation(), "operation-label");
```

### 锁管理

```typescript
import { createBlock } from "@chrock-studio/code-block";

const lockBlock = createBlock(
  // 获取锁
  (lockName: string) => acquireLock(lockName),
  // 释放锁
  (lock) => releaseLock(lock),
);

// 使用锁
lockBlock((lock) => {
  // 执行需要同步的代码
  return criticalSection();
}, "my-resource-lock");
```

### HTTP 请求追踪

```typescript
import { createBlock } from "@chrock-studio/code-block";

const requestBlock = createBlock(
  // 开始追踪
  (requestId: string) => {
    console.log(`[${requestId}] Request started`);
    return { requestId, startTime: Date.now() };
  },
  // 结束追踪
  (cache, result, error) => {
    const duration = Date.now() - cache.startTime;
    if (error) {
      console.log(`[${cache.requestId}] Request failed in ${duration}ms`);
    } else {
      console.log(`[${cache.requestId}] Request completed in ${duration}ms`);
    }
  },
);

// 使用追踪
const response = requestBlock((cache) => fetch("https://api.example.com/data"), "req-123");
```

### 资源池管理

```typescript
import { createBlock } from "@chrock-studio/code-block";

const poolBlock = createBlock(
  // 从池中获取资源
  () => resourcePool.acquire(),
  // 归还资源到池中
  (resource) => resourcePool.release(resource),
);

// 使用资源池
poolBlock((resource) => {
  return resource.doSomething();
});
```

### 批量处理

```typescript
import { createBlock } from "@chrock-studio/code-block";

const batch = createBlock(startBatch, endBatch);
const count = batch(() => {
  let count = 0;
  for (const item of items) {
    if (check(item) && modify(item)) {
      count += 1;
    }
  }
  return count;
});
```

## 🔄 执行流程

```
┌─────────────────────────────────────────────────────────────┐
│                     block(start, end)                        │
│                         ↓                                   │
│              返回 (body, ...args) => Result                 │
│                         ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. cache = start(...args)     // 初始化资源          │  │
│  │  2. try {                                             │  │
│  │       result = body(cache)    // 执行主体代码         │  │
│  │       return result                                   │  │
│  │     } catch (err) {                                   │  │
│  │       error = err             // 捕获错误            │  │
│  │       throw err                                       │  │
│  │     } finally {                                       │  │
│  │       end(cache, result, error) // 清理资源           │  │
│  │     }                                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 特性

- ✅ **类型安全**：完整的 TypeScript 类型支持
- ✅ **零依赖**：轻量级，无第三方依赖
- ✅ **资源管理**：确保资源正确释放
- ✅ **错误处理**：自动处理异常情况
- ✅ **灵活组合**：支持嵌套和多次调用

## 📜 许可证

MIT License

## 👤 作者

**JuerGenie**

- Email: juergenie@outlook.com
- GitHub: [@JuerGenie](https://github.com/JuerGenie)

## 🏠 主页

[https://github.com/chrock-studio/toolbox/tree/main/packages/code-block](https://github.com/chrock-studio/toolbox/tree/main/packages/code-block)

## 🤝 贡献

欢迎贡献！请查看 [贡献指南](https://github.com/chrock-studio/toolbox/blob/main/CONTRIBUTING.md)。
