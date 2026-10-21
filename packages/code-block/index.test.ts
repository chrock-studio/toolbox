import { describe, expect, test } from "bun:test";
import { createBlock, createAsyncBlock } from "./index.ts";

// Tests for createBlock

describe("createBlock", () => {
  test("should call start function with provided arguments", () => {
    let startCalled = false;
    let receivedArg = "";

    const block = createBlock(
      (arg: string) => {
        startCalled = true;
        receivedArg = arg;
        return { value: arg };
      },
      () => {},
    );

    block(() => "result", "test-arg");

    expect(startCalled).toBe(true);
    expect(receivedArg).toBe("test-arg");
  });

  test("should call end function after body executes", () => {
    let endCalled = false;

    const block = createBlock(
      () => ({ value: "cache" }),
      () => {
        endCalled = true;
      },
    );

    block(() => "result");

    expect(endCalled).toBe(true);
  });

  test("should pass cache from start to body", () => {
    const block = createBlock(
      (value: number) => ({ value }),
      () => {},
    );

    const result = block((cache) => cache.value * 2, 5);

    expect(result).toBe(10);
  });

  test("should return the result from body function", () => {
    const block = createBlock(
      () => ({ data: "test" }),
      () => {},
    );

    const result = block(() => "returned-value");

    expect(result).toBe("returned-value");
  });

  test("should call end function even when body throws", () => {
    let endCalled = false;

    const block = createBlock(
      () => ({ value: "cache" }),
      () => {
        endCalled = true;
      },
    );

    try {
      block(() => {
        throw new Error("test error");
      });
    } catch (e) {
      expect((e as Error).message).toBe("test error");
    }

    expect(endCalled).toBe(true);
  });

  test("should pass error to end function when body throws", () => {
    let capturedError: unknown;

    const block = createBlock(
      () => ({ value: "cache" }),
      (_cache, _result, error) => {
        capturedError = error;
      },
    );

    try {
      block(() => {
        throw new Error("body error");
      });
    } catch (e) {
      expect((e as Error).message).toBe("body error");
    }

    expect((capturedError as Error).message).toBe("body error");
  });

  test("should pass undefined result to end function when body throws", () => {
    let capturedResult: unknown = "not-undefined";

    const block = createBlock(
      () => ({ value: "cache" }),
      (_cache, result) => {
        capturedResult = result;
      },
    );

    try {
      block(() => {
        throw new Error("error");
      });
    } catch {
      // expected
    }

    expect(capturedResult).toBe(undefined);
  });

  test("should pass result to end function on success", () => {
    let capturedResult: unknown;

    const block = createBlock(
      () => ({ value: "cache" }),
      (_cache, result) => {
        capturedResult = result;
      },
    );

    block(() => "success-result");

    expect(capturedResult).toBe("success-result");
  });

  test("should pass cache to end function", () => {
    let capturedCache: unknown;

    const block = createBlock(
      (id: number) => ({ id, label: `item-${id}` }),
      (cache) => {
        capturedCache = cache;
      },
    );

    block(() => {}, 42);

    expect(capturedCache).toStrictEqual({ id: 42, label: "item-42" });
  });

  test("should pass multiple arguments to start function", () => {
    let capturedArgs: unknown[] = [];

    const block = createBlock(
      (a: number, b: string, c: boolean) => {
        capturedArgs = [a, b, c];
        return { a, b, c };
      },
      () => {},
    );

    block(() => {}, 1, "hello", true);

    expect(capturedArgs).toStrictEqual([1, "hello", true]);
  });

  test("should work as a counter block", () => {
    let counter = 0;

    const counterBlock = createBlock(
      (initial: number) => {
        counter = initial;
        return { initial };
      },
      () => {
        counter = 0;
      },
    );

    const result = counterBlock(() => {
      counter += 10;
      return counter;
    }, 5);

    expect(result).toBe(15);
    expect(counter).toBe(0);
  });

  test("should work as a resource tracker", () => {
    const resources: string[] = [];

    const resourceBlock = createBlock(
      (name: string) => {
        resources.push(`acquired: ${name}`);
        return { name };
      },
      (cache) => {
        resources.push(`released: ${cache.name}`);
      },
    );

    resourceBlock(() => {
      resources.push("using resource");
      return "done";
    }, "db-connection");

    expect(resources).toStrictEqual(["acquired: db-connection", "using resource", "released: db-connection"]);
  });
});

// Tests for createAsyncBlock

describe("createAsyncBlock", () => {
  test("should call async start function with provided arguments", async () => {
    let startCalled = false;
    let receivedArg = "";

    const block = createAsyncBlock(
      (arg: string) => {
        startCalled = true;
        receivedArg = arg;
        return Promise.resolve({ value: arg });
      },
      () => Promise.resolve(),
    );

    await block(() => "result", "test-arg");

    expect(startCalled).toBe(true);
    expect(receivedArg).toBe("test-arg");
  });

  test("should call async end function after body executes", async () => {
    let endCalled = false;

    const block = createAsyncBlock(
      () => Promise.resolve({ value: "cache" }),
      () => void (endCalled = true),
    );

    await block(() => "result");

    expect(endCalled).toBe(true);
  });

  test("should pass cache from async start to body", async () => {
    const block = createAsyncBlock(
      (value: number) => Promise.resolve({ value }),
      () => {},
    );

    const result = await block((cache) => cache.value * 2, 5);

    expect(result).toBe(10);
  });

  test("should return the result from async body function", async () => {
    const block = createAsyncBlock(
      () => Promise.resolve({ data: "test" }),
      () => {},
    );

    const result = await block(() => Promise.resolve("returned-value"));

    expect(result).toBe("returned-value");
  });

  test("should call end function even when async body throws", async () => {
    let endCalled = false;

    const block = createAsyncBlock(
      () => Promise.resolve({ value: "cache" }),
      () => void (endCalled = true),
    );

    const promise = block(() => Promise.reject(new Error("test error")));
    await expect(promise).rejects.toThrow(Error);
    await expect(promise).rejects.toThrow("test error");

    expect(endCalled).toBe(true);
  });

  test("should pass error to async end function when body throws", async () => {
    let capturedError: unknown;

    const block = createAsyncBlock(
      () => Promise.resolve({ value: "cache" }),
      (_cache, _result, error) => void (capturedError = error),
    );

    const promise = block(() => Promise.reject(new Error("body error")));
    await expect(promise).rejects.toThrow(Error);
    await expect(promise).rejects.toThrow("body error");

    expect((capturedError as Error).message).toBe("body error");
  });

  test("should pass undefined result to end function when body throws", async () => {
    let capturedResult: unknown = "not-undefined";

    const block = createAsyncBlock(
      () => Promise.resolve({ value: "cache" }),
      (_cache, result) => void (capturedResult = result),
    );

    const promise = block(() => Promise.reject(new Error("error")));
    await expect(promise).rejects.toThrow(Error);
    await expect(promise).rejects.toThrow("error");

    expect(capturedResult).toBe(undefined);
  });

  test("should pass result to end function on success", async () => {
    let capturedResult: unknown;

    const block = createAsyncBlock(
      () => Promise.resolve({ value: "cache" }),
      (_cache, result) => void (capturedResult = result),
    );

    await block(() => Promise.resolve("success-result"));

    expect(capturedResult).toBe("success-result");
  });

  test("should pass cache to end function", async () => {
    let capturedCache: unknown;

    const block = createAsyncBlock(
      (id: number) => Promise.resolve({ id, label: `item-${id}` }),
      (cache) => void (capturedCache = cache),
    );

    await block(async () => {}, 42);

    expect(capturedCache).toStrictEqual({ id: 42, label: "item-42" });
  });

  test("should pass multiple arguments to async start function", async () => {
    let capturedArgs: unknown[] = [];

    const block = createAsyncBlock(
      (a: number, b: string, c: boolean) => {
        capturedArgs = [a, b, c];
        return Promise.resolve({ a, b, c });
      },
      () => {},
    );

    await block(async () => {}, 1, "hello", true);

    expect(capturedArgs).toStrictEqual([1, "hello", true]);
  });

  test("should work with sync start and async body", async () => {
    const block = createAsyncBlock(
      (value: number) => ({ value }),
      () => {},
    );

    const result = await block(async (cache) => {
      await Promise.resolve();
      return cache.value * 2;
    }, 5);

    expect(result).toBe(10);
  });

  test("should work with async start and sync body", async () => {
    const block = createAsyncBlock(
      async (value: number) => {
        await Promise.resolve();
        return { value };
      },
      () => {},
    );

    const result = await block((cache) => cache.value * 2, 5);

    expect(result).toBe(10);
  });

  test("should work as an async counter block", async () => {
    let counter = 0;

    const counterBlock = createAsyncBlock(
      async (initial: number) => {
        await Promise.resolve();
        counter = initial;
        return { initial };
      },
      async () => {
        await Promise.resolve();
        counter = 0;
      },
    );

    const result = await counterBlock(async () => {
      await Promise.resolve();
      counter += 10;
      return counter;
    }, 5);

    expect(result).toBe(15);
    expect(counter).toBe(0);
  });

  test("should work as an async resource tracker", async () => {
    const resources: string[] = [];

    const resourceBlock = createAsyncBlock(
      async (name: string) => {
        await Promise.resolve();
        resources.push(`acquired: ${name}`);
        return { name };
      },
      async (cache) => {
        await Promise.resolve();
        resources.push(`released: ${cache.name}`);
      },
    );

    await resourceBlock(async () => {
      await Promise.resolve();
      resources.push("using resource");
      return "done";
    }, "db-connection");

    expect(resources).toStrictEqual(["acquired: db-connection", "using resource", "released: db-connection"]);
  });

  test("should handle async end function that throws", async () => {
    const block = createAsyncBlock(
      () => Promise.resolve({ value: "cache" }),
      () => Promise.reject(new Error("end error")),
    );

    const promise = block(() => Promise.resolve("result"));
    await expect(promise).rejects.toThrow(Error);
    await expect(promise).rejects.toThrow("end error");
  });

  test("should preserve original error when end throws after body error", async () => {
    let endCalled = false;

    const block = createAsyncBlock(
      () => Promise.resolve({ value: "cache" }),
      () => {
        endCalled = true;
        throw new Error("end error");
      },
    );

    // The original error should be suppressed by the end error
    const promise = block(() => Promise.reject(new Error("body error")));
    await expect(promise).rejects.toThrow(Error);
    await expect(promise).rejects.toThrow("end error");

    expect(endCalled).toBe(true);
  });

  test("should await async body result before calling end", async () => {
    const order: string[] = [];

    const block = createAsyncBlock(
      () => {
        order.push("start");
        return {};
      },
      () => {
        order.push("end");
      },
    );

    await block(async () => {
      order.push("body-start");
      await Promise.resolve();
      order.push("body-end");
      return "result";
    });

    expect(order).toStrictEqual(["start", "body-start", "body-end", "end"]);
  });
});
