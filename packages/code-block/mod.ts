/**
 * A utility library for managing resource acquisition and release, implementing the RAII (Resource Acquisition Is Initialization)
 * pattern to ensure resources are properly cleaned up after code block execution, regardless of success or failure.
 *
 * ## Features
 *
 * - ✅ **Automatic Resource Cleanup** - The end function is always called regardless of success or failure
 * - ✅ **Error Propagation** - Execution errors are passed to the end function for conditional handling
 * - ✅ **Result Propagation** - Execution results are passed to the end function for logging and other operations
 * - ✅ **Type Safety** - Full TypeScript type support
 * - ✅ **Sync/Async Support** - Both synchronous and asynchronous versions available
 *
 * @license MIT
 *
 * @example Basic Usage: File Operations
 * ```typescript
 * import { createBlock } from "@chrock-studio/code-block";
 * import fs from "node:fs";
 *
 * const readBlock = createBlock(
 *   (filename: string) => fs.openSync(filename, "r"),
 *   (fd) => fs.closeSync(fd),
 * );
 *
 * const content = readBlock((fd) => fs.readFileSync(fd, "utf-8"), "example.txt");
 * ```
 *
 * @example Database Transactions
 *
 * ```typescript
 * import { createBlock } from "@chrock-studio/code-block";
 *
 * const transactionBlock = createBlock(
 *   () => db.beginTransaction(),
 *   (tx, result, error) => {
 *     if (error) {
 *       tx.rollback(); // Rollback on error
 *     } else {
 *       tx.commit(); // Commit on success
 *     }
 *   }
 * );
 *
 * transactionBlock((tx) => {
 *   tx.query("INSERT INTO users VALUES (?)", [...]);
 *   tx.query("UPDATE accounts SET balance = ?", [...]);
 * });
 * ```
 *
 * @example Performance Timer
 *
 * ```typescript
 * import { createBlock } from "@chrock-studio/code-block";
 *
 * const timerBlock = createBlock(
 *   (label: string) => {
 *     console.time(label);
 *     return { label, start: Date.now() };
 *   },
 *   (cache, result, error) => {
 *     console.timeEnd(cache.label);
 *     console.log(`Duration: ${Date.now() - cache.start}ms`);
 *   },
 * );
 *
 * timerBlock((cache) => expensiveOperation(), "operation-label");
 * ```
 *
 * @example Async File Operations
 *
 * ```typescript
 * import { createAsyncBlock } from "@chrock-studio/code-block";
 * import { promises as fs } from "node:fs";
 *
 * const readBlock = createAsyncBlock(
 *   async (filename: string) => {
 *     const file = await fs.open(filename, "r");
 *     return { file, filename };
 *   },
 *   async (cache) => {
 *     await cache.file.close();
 *   },
 * );
 *
 * const content = await readBlock(async (cache) => {
 *   const buffer = await cache.file.readFile();
 *   return buffer.toString("utf-8");
 * }, "example.txt");
 * ```
 *
 * @example Async Database Transactions
 *
 * ```typescript
 * import { createAsyncBlock } from "@chrock-studio/code-block";
 *
 * const transactionBlock = createAsyncBlock(
 *   () => db.beginTransaction(),
 *   async (tx, result, error) => {
 *     if (error) {
 *       await tx.rollback();
 *     } else {
 *       await tx.commit();
 *     }
 *   }
 * );
 *
 * await transactionBlock(async (tx) => {
 *   await tx.query("INSERT INTO users VALUES (?)", [...]);
 *   await tx.query("UPDATE accounts SET balance = ?", [...]);
 * });
 * ```
 *
 * @example Resource Locking
 *
 * ```typescript
 * import { createAsyncBlock } from "@chrock-studio/code-block";
 *
 * const withLock = createAsyncBlock(
 *   async (resourceId: string) => {
 *     const lock = await acquireLock(resourceId, { timeout: 5000 });
 *     return { lock, resourceId };
 *   },
 *   async (cache) => {
 *     await cache.lock.release();
 *   },
 * );
 *
 * const result = await withLock(async (cache) => {
 *   return await processResource(cache.resourceId);
 * }, "resource-123");
 * ```
 *
 * @module
 */

import type { MaybePromise } from "@chrock-studio/shared";

/**
 * Creates a synchronous code block for managing resource acquisition and release.
 *
 * This function implements a RAII (Resource Acquisition Is Initialization) pattern,
 * ensuring resources are properly cleaned up after the code block executes,
 * regardless of success or failure.
 *
 * @typeParam Start - The type of the start function, must be a function that returns a resource cache
 * @param start - The start function, called before the code block executes, used to acquire resources and return a cache object
 * @param end - The end function, called after the code block executes, used to clean up resources
 *   - `cache` - The cache object returned by the start function
 *   - `result` - The execution result of the code block (may be undefined)
 *   - `error` - The error object if the code block threw an error
 * @returns Returns a function that accepts a body function and the start function's arguments
 *
 * @example
 * // Basic usage: File operations
 * const readBlock = createBlock(
 *   (filename: string) => fs.openSync(filename, 'r'), // Open file
 *   (fd) => fs.closeSync(fd) // Close file
 * );
 *
 * const content = readBlock(
 *   (fd) => fs.readFileSync(fd, 'utf-8'), // Read file content
 *   'example.txt' // Filename argument
 * );
 *
 * @example
 * // Advanced usage: Database transactions
 * const transactionBlock = createBlock(
 *   () => db.beginTransaction(), // Start transaction
 *   (tx, result, error) => {
 *     if (error) {
 *       tx.rollback(); // Rollback on error
 *     } else {
 *       tx.commit(); // Commit on success
 *     }
 *   }
 * );
 *
 * transactionBlock((tx) => {
 *   tx.query('INSERT INTO users VALUES (?)', [...]);
 *   tx.query('UPDATE accounts SET balance = ?', [...]);
 * });
 *
 * @example
 * // Performance timer
 * const timerBlock = createBlock(
 *   (label: string) => {
 *     console.time(label);
 *     return { label, start: Date.now() };
 *   },
 *   (cache, result, error) => {
 *     console.timeEnd(cache.label);
 *     console.log(`Duration: ${Date.now() - cache.start}ms`);
 *   }
 * );
 *
 * timerBlock(
 *   (cache) => expensiveOperation(),
 *   'operation-label'
 * );
 *
 * @example
 * // Batch processing
 * const batch = createBlock(startBatch, endBatch);
 * const count = batch(() => {
 *   let count = 0;
 *   for (const item of items) {
 *     if (check(item) && modify(item)) {
 *       count += 1;
 *     }
 *   }
 *   return count;
 * });
 */
export const createBlock =
  // deno-lint-ignore no-explicit-any
  <const Start extends (...args: any[]) => any>(
    start: Start,
    end: (
      cache: ReturnType<Start>,
      result?: unknown,
      error?: unknown,
    ) => void,
  ) =>
  <Result>(
    body: (cache: ReturnType<Start>) => Result,
    ...args: Parameters<Start>
  ): Result => {
    const cache = start(...args) as ReturnType<Start>;
    let result, error;

    try {
      return (result = body(cache));
    } catch (err) {
      throw (error = err);
    } finally {
      end(cache, result as never, error);
    }
  };

/**
 * Creates an asynchronous code block for managing async resource acquisition and release.
 *
 * This function is the async version of {@link createBlock}, supporting Promises and async operations.
 * Ensures async resources are properly cleaned up after the code block executes,
 * regardless of success or failure.
 *
 * @typeParam Start - The type of the start function, can return a Promise or a regular value
 * @param start - The start function, called before the code block executes, used to acquire resources and return a cache object
 * @param end - The end function, called after the code block executes, used to clean up resources
 *   - `cache` - The cache object returned by the start function
 *   - `result` - The execution result of the code block (may be undefined)
 *   - `error` - The error object if the code block threw an error
 * @returns Returns an async function that accepts a body function and the start function's arguments
 *
 * @example
 * // Async file operations
 * const readBlock = createAsyncBlock(
 *   async (filename: string) => {
 *     const file = await fs.promises.open(filename, 'r');
 *     return { file, filename };
 *   },
 *   async (cache) => {
 *     await cache.file.close();
 *   }
 * );
 *
 * const content = await readBlock(
 *   async (cache) => {
 *     const buffer = await cache.file.readFile();
 *     return buffer.toString('utf-8');
 *   },
 *   'example.txt'
 * );
 *
 * @example
 * // Async database transactions
 * const transactionBlock = createAsyncBlock(
 *   () => db.beginTransaction(),
 *   async (tx, result, error) => {
 *     if (error) {
 *       await tx.rollback();
 *     } else {
 *       await tx.commit();
 *     }
 *   }
 * );
 *
 * await transactionBlock(async (tx) => {
 *   await tx.query('INSERT INTO users VALUES (?)', [...]);
 *   await tx.query('UPDATE accounts SET balance = ?', [...]);
 * });
 *
 * @example
 * // Resource locking with timeout
 * const withLock = createAsyncBlock(
 *   async (resourceId: string) => {
 *     const lock = await acquireLock(resourceId, { timeout: 5000 });
 *     return { lock, resourceId };
 *   },
 *   async (cache) => {
 *     await cache.lock.release();
 *   }
 * );
 *
 * const result = await withLock(
 *   async (cache) => {
 *     return await processResource(cache.resourceId);
 *   },
 *   'resource-123'
 * );
 */
export const createAsyncBlock = <
  // deno-lint-ignore no-explicit-any
  const Start extends (...args: any[]) => MaybePromise<any>,
  Cache extends Awaited<ReturnType<Start>>,
>(
  start: Start,
  end: (
    cache: Cache,
    result?: unknown,
    error?: unknown,
  ) => MaybePromise<void>,
) =>
async <Result>(
  body: (cache: Cache) => Result,
  ...args: Parameters<Start>
): Promise<Result> => {
  const cache = (await start(...args)) as Cache;
  let result, error;

  try {
    return (result = await body(cache));
  } catch (err) {
    throw (error = err);
  } finally {
    await end(cache, result as never, error);
  }
};
