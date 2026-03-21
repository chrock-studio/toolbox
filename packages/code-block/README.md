# `@chrock-studio/code-block`

A simple code-block wrapper to compose start blocks, body blocks, and end blocks!

A lightweight TypeScript library for implementing resource management patterns (similar to try-with-resources or using statements), ensuring proper resource cleanup after code execution.

## 📦 Installation

```bash
# Using pnpm
pnpm add @chrock-studio/code-block

# Using npm
npm install @chrock-studio/code-block

# Using yarn
yarn add @chrock-studio/code-block
```

## 🚀 Quick Start

```typescript
import { createBlock } from "@chrock-studio/code-block";

// Create a file operation block
const fileBlock = createBlock(
  // Start function: open file
  (filename: string) => fs.openSync(filename, "r"),
  // End function: close file
  (fd) => fs.closeSync(fd),
);

// Use the block
const content = fileBlock((fd) => fs.readFileSync(fd, "utf-8"), "example.txt");
```

## 📖 API Documentation

### `block(start, end)`

Creates a resource management block.

#### Parameters

| Parameter | Type                               | Description                                                      |
| --------- | ---------------------------------- | ---------------------------------------------------------------- |
| `start`   | `(...args: unknown[]) => unknown`  | Start function to initialize resources and return a cache object |
| `end`     | `(cache, result?, error?) => void` | Cleanup function called after the code block execution completes |

#### Return Value

Returns a function that accepts:

- `body`: Body function that receives the cache object and returns a result
- `...args`: Arguments passed to the `start` function

#### end Function Parameters

| Parameter | Type                | Description                                               |
| --------- | ------------------- | --------------------------------------------------------- |
| `cache`   | `ReturnType<Start>` | Resource object returned by the start function            |
| `result`  | `unknown`           | Return value of the body function (if execution succeeds) |
| `error`   | `unknown`           | Error thrown by the body function (if execution fails)    |

## 💡 Usage Examples

### File Operations

```typescript
import { createBlock } from "@chrock-studio/code-block";
import fs from "fs";

const readBlock = createBlock(
  (filename: string) => fs.openSync(filename, "r"),
  (fd) => fs.closeSync(fd),
);

const content = readBlock((fd) => fs.readFileSync(fd, "utf-8"), "example.txt");
```

### Database Transactions

```typescript
import {  createBlock } from '@chrock-studio/code-block';

const transactionBlock =  createBlock(
  // Start transaction
  () => db.beginTransaction(),
  // End transaction: commit or rollback based on result
  (tx, result, error) => {
    if (error) {
      tx.rollback();
    } else {
      tx.commit();
    }
  }
);

// Execute transaction
await transactionBlock(async (tx) => {
  await tx.query('INSERT INTO users VALUES (?)', [...]);
  await tx.query('UPDATE accounts SET balance = ?', [...]);
});
```

### Performance Timer

```typescript
import { createBlock } from "@chrock-studio/code-block";

const timerBlock = createBlock(
  // Start timing
  (label: string) => {
    console.time(label);
    return { label, start: Date.now() };
  },
  // End timing
  (cache) => {
    console.timeEnd(cache.label);
    console.log(`Duration: ${Date.now() - cache.start}ms`);
  },
);

// Use timer
timerBlock((cache) => expensiveOperation(), "operation-label");
```

### Lock Management

```typescript
import { createBlock } from "@chrock-studio/code-block";

const lockBlock = createBlock(
  // Acquire lock
  (lockName: string) => acquireLock(lockName),
  // Release lock
  (lock) => releaseLock(lock),
);

// Use lock
lockBlock((lock) => {
  // Execute code that requires synchronization
  return criticalSection();
}, "my-resource-lock");
```

### HTTP Request Tracing

```typescript
import { createBlock } from "@chrock-studio/code-block";

const requestBlock = createBlock(
  // Start tracing
  (requestId: string) => {
    console.log(`[${requestId}] Request started`);
    return { requestId, startTime: Date.now() };
  },
  // End tracing
  (cache, result, error) => {
    const duration = Date.now() - cache.startTime;
    if (error) {
      console.log(`[${cache.requestId}] Request failed in ${duration}ms`);
    } else {
      console.log(`[${cache.requestId}] Request completed in ${duration}ms`);
    }
  },
);

// Use tracing
const response = requestBlock((cache) => fetch("https://api.example.com/data"), "req-123");
```

### Resource Pool Management

```typescript
import { createBlock } from "@chrock-studio/code-block";

const poolBlock = createBlock(
  // Acquire resource from pool
  () => resourcePool.acquire(),
  // Return resource to pool
  (resource) => resourcePool.release(resource),
);

// Use resource pool
poolBlock((resource) => {
  return resource.doSomething();
});
```

### Batch Processing

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

## 🔄 Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     block(start, end)                        │
│                         ↓                                   │
│              returns (body, ...args) => Result              │
│                         ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. cache = start(...args)     // Initialize resource │  │
│  │  2. try {                                             │  │
│  │       result = body(cache)    // Execute body code   │  │
│  │       return result                                   │  │
│  │     } catch (err) {                                   │  │
│  │       error = err             // Capture error       │  │
│  │       throw err                                       │  │
│  │     } finally {                                       │  │
│  │       end(cache, result, error) // Cleanup resource   │  │
│  │     }                                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Features

- ✅ **Type Safe**: Full TypeScript type support
- ✅ **Zero Dependencies**: Lightweight, no third-party dependencies
- ✅ **Resource Management**: Ensures proper resource cleanup
- ✅ **Error Handling**: Automatically handles exceptions
- ✅ **Flexible Composition**: Supports nesting and multiple calls

## 📜 License

MIT License

## 👤 Author

**JuerGenie**

- Email: juergenie@outlook.com
- GitHub: [@JuerGenie](https://github.com/JuerGenie)

## 🏠 Homepage

[https://github.com/chrock-studio/toolbox/tree/main/packages/code-block](https://github.com/chrock-studio/toolbox/tree/main/packages/code-block)

## 🤝 Contributing

Contributions are welcome! Please check out the [Contributing Guide](https://github.com/chrock-studio/toolbox/blob/main/CONTRIBUTING.md).
