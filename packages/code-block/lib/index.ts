/**
 * Creates a resource management block that ensures proper resource cleanup after code execution.
 *
 * This is a higher-order function that implements a resource management pattern similar to
 * try-with-resources or using statements. It ensures that the cleanup function is called
 * regardless of whether the code block executes successfully or throws an exception.
 *
 * @template Start - The type of the start function, must be a function type
 * @param start - Start function to initialize resources and return a cache object
 *                This function receives any arguments and the returned resource object
 *                will be passed to the body and end functions
 * @param end - Cleanup function called after the code block execution completes
 *              Receives three parameters:
 *              - cache: The resource object returned by the start function
 *              - result: The return value of the body function (if execution succeeds)
 *              - error: The error thrown by the body function (if execution fails)
 *
 * @returns Returns a function that accepts a body callback and start function arguments,
 *          executes the resource management flow and returns the body's execution result
 *
 * @example
 * // Basic usage: File operations
 * const readBlock =  createBlock(
 *   (filename: string) => fs.openSync(filename, 'r'),  // Open file
 *   (fd) => fs.closeSync(fd)                            // Close file
 * );
 *
 * const content = readBlock(
 *   (fd) => fs.readFileSync(fd, 'utf-8'),  // Read file content
 *   'example.txt'                            // Filename argument
 * );
 *
 * @example
 * // Advanced usage: Database transactions
 * const transactionBlock =  createBlock(
 *   () => db.beginTransaction(),              // Start transaction
 *   (tx, result, error) => {
 *     if (error) {
 *       tx.rollback();  // Rollback on error
 *     } else {
 *       tx.commit();   // Commit on success
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
 * // Performance timer
 * const timerBlock =  createBlock(
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
 * const batch =  createBlock(startBatch, endBatch);
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
  <const Start extends (...args: unknown[]) => unknown>(
    start: Start,
    end: (cache: ReturnType<Start>, result?: unknown, error?: unknown) => void,
  ) =>
  <Result>(body: (cache: ReturnType<Start>) => Result, ...args: Parameters<Start>): Result => {
    // Call the start function to initialize resources
    const cache = start(...args) as ReturnType<Start>;
    let result, error;

    try {
      // Execute the body code and assign the result
      return (result = body(cache));
    } catch (err) {
      // Capture the error and re-throw it
      throw (error = err);
    } finally {
      // Always call the cleanup function regardless of success or failure
      // Use 'as never' to handle result type, as result may be uninitialized
      end(cache, result as never, error);
    }
  };
