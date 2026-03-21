import { describe, it, expect, vi } from "vitest";
import { createBlock } from "./index";

describe("block", () => {
  describe("基本功能", () => {
    it("应该正确执行 start、body 和 end 函数", () => {
      const startFn = vi.fn(() => ({ resource: "test-resource" }));
      const endFn = vi.fn();
      const bodyFn = vi.fn(() => "result");

      const blockFn = createBlock(startFn, endFn);
      const result = blockFn(bodyFn);

      expect(startFn).toHaveBeenCalledTimes(1);
      expect(bodyFn).toHaveBeenCalledTimes(1);
      expect(bodyFn).toHaveBeenCalledWith({ resource: "test-resource" });
      expect(endFn).toHaveBeenCalledTimes(1);
      expect(result).toBe("result");
    });

    it("应该将 start 函数的返回值传递给 body 和 end 函数", () => {
      const cache = { id: 123, data: "test" };
      const startFn = vi.fn(() => cache);
      const endFn = vi.fn();
      const bodyFn = vi.fn(() => "done");

      const blockFn = createBlock(startFn, endFn);
      blockFn(bodyFn);

      expect(bodyFn).toHaveBeenCalledWith(cache);
      expect(endFn).toHaveBeenCalledWith(cache, "done", undefined);
    });

    it("应该支持传递参数给 start 函数", () => {
      const startFn = vi.fn((...args: unknown[]) => ({ a: args[0], b: args[1] }));
      const endFn = vi.fn();
      const bodyFn = vi.fn(() => "result");

      const blockFn = createBlock(startFn, endFn);
      const result = blockFn(bodyFn, 42, "hello");

      expect(startFn).toHaveBeenCalledWith(42, "hello");
      expect(result).toBe("result");
    });
  });

  describe("返回值处理", () => {
    it("应该返回 body 函数的返回值", () => {
      const startFn = vi.fn(() => ({}));
      const endFn = vi.fn();
      const bodyFn = vi.fn(() => ({ data: "test" }));

      const blockFn = createBlock(startFn, endFn);
      const result = blockFn(bodyFn);

      expect(result).toEqual({ data: "test" });
    });

    it("应该支持各种返回类型", () => {
      // 返回数字
      const blockNum = createBlock(
        vi.fn(() => ({})),
        vi.fn(),
      );
      expect(blockNum(() => 123)).toBe(123);

      // 返回字符串
      const blockStr = createBlock(
        vi.fn(() => ({})),
        vi.fn(),
      );
      expect(blockStr(() => "hello")).toBe("hello");

      // 返回数组
      const blockArr = createBlock(
        vi.fn(() => ({})),
        vi.fn(),
      );
      expect(blockArr(() => [1, 2, 3])).toEqual([1, 2, 3]);

      // 返回 null
      const blockNull = createBlock(
        vi.fn(() => ({})),
        vi.fn(),
      );
      expect(blockNull(() => null)).toBe(null);

      // 返回 undefined
      const blockUndef = createBlock(
        vi.fn(() => ({})),
        vi.fn(),
      );
      expect(blockUndef(() => undefined)).toBe(undefined);
    });
  });

  describe("错误处理", () => {
    it("应该在 body 抛出错误时调用 end 函数并传递错误", () => {
      const startFn = vi.fn(() => ({ resource: "test" }));
      const endFn = vi.fn();
      const error = new Error("test error");
      const bodyFn = vi.fn(() => {
        throw error;
      });

      const blockFn = createBlock(startFn, endFn);

      expect(() => blockFn(bodyFn)).toThrow("test error");
      expect(endFn).toHaveBeenCalledTimes(1);
      expect(endFn).toHaveBeenCalledWith({ resource: "test" }, undefined, error);
    });

    it("应该在 body 抛出错误后重新抛出该错误", () => {
      const startFn = vi.fn(() => ({}));
      const endFn = vi.fn();
      const customError = new Error("custom error");
      const bodyFn = vi.fn(() => {
        throw customError;
      });

      const blockFn = createBlock(startFn, endFn);

      expect(() => blockFn(bodyFn)).toThrow(customError);
    });

    it("应该确保 end 函数在错误情况下也被调用", () => {
      const startFn = vi.fn(() => ({ id: 1 }));
      const endFn = vi.fn();
      const bodyFn = vi.fn(() => {
        throw new Error("body error");
      });

      const blockFn = createBlock(startFn, endFn);

      try {
        blockFn(bodyFn);
      } catch {
        // 忽略错误
      }

      expect(endFn).toHaveBeenCalled();
    });
  });

  describe("资源管理场景", () => {
    it("应该模拟文件操作场景", () => {
      const openedFiles: string[] = [];
      const closedFiles: string[] = [];

      const fileBlock = createBlock(
        (...args: unknown[]) => {
          const filename = args[0] as string;
          openedFiles.push(filename);
          return { filename, fd: openedFiles.length };
        },
        (cache) => {
          closedFiles.push((cache as { filename: string }).filename);
        },
      );

      const result = fileBlock(
        (cache) => `content of ${(cache as { filename: string }).filename}`,
        "test.txt",
      );

      expect(openedFiles).toEqual(["test.txt"]);
      expect(closedFiles).toEqual(["test.txt"]);
      expect(result).toBe("content of test.txt");
    });

    it("应该模拟事务场景 - 成功提交", () => {
      const transactionLog: string[] = [];

      const transactionBlock = createBlock(
        () => {
          transactionLog.push("begin");
          return { id: Date.now() };
        },
        (_cache, _result, error) => {
          if (error) {
            transactionLog.push("rollback");
          } else {
            transactionLog.push("commit");
          }
        },
      );

      transactionBlock(() => {
        transactionLog.push("execute");
        return "success";
      });

      expect(transactionLog).toEqual(["begin", "execute", "commit"]);
    });

    it("应该模拟事务场景 - 失败回滚", () => {
      const transactionLog: string[] = [];

      const transactionBlock = createBlock(
        () => {
          transactionLog.push("begin");
          return { id: Date.now() };
        },
        (_cache, _result, error) => {
          if (error) {
            transactionLog.push("rollback");
          } else {
            transactionLog.push("commit");
          }
        },
      );

      expect(() =>
        transactionBlock(() => {
          transactionLog.push("execute");
          throw new Error("transaction failed");
        }),
      ).toThrow("transaction failed");

      expect(transactionLog).toEqual(["begin", "execute", "rollback"]);
    });

    it("应该模拟计时器场景", () => {
      const logs: string[] = [];
      const originalTime = Date.now();

      const timerBlock = createBlock(
        (...args: unknown[]) => {
          const label = args[0] as string;
          logs.push(`start: ${label}`);
          return { label, startTime: originalTime };
        },
        (cache) => {
          logs.push(`end: ${(cache as { label: string }).label}`);
        },
      );

      timerBlock(() => {
        logs.push("operation");
        return "done";
      }, "timer-1");

      expect(logs).toEqual(["start: timer-1", "operation", "end: timer-1"]);
    });
  });

  describe("类型推断", () => {
    it("应该正确推断 cache 类型", () => {
      interface MyResource {
        id: number;
        name: string;
      }

      const startFn = (): MyResource => ({ id: 1, name: "test" });
      const endFn = vi.fn();

      const blockFn = createBlock(startFn, endFn);

      blockFn((cache) => {
        // TypeScript 应该能正确推断 cache 的类型
        expect(cache.id).toBe(1);
        expect(cache.name).toBe("test");
        return "result";
      });
    });

    it("应该正确推断参数类型", () => {
      const startFn = (...args: unknown[]) => ({
        a: args[0] as number,
        b: args[1] as string,
        c: args[2] as boolean,
      });
      const endFn = vi.fn();

      const blockFn = createBlock(startFn, endFn);

      // TypeScript 应该强制参数类型
      blockFn(
        (cache) => {
          expect(cache.a).toBe(1);
          expect(cache.b).toBe("hello");
          expect(cache.c).toBe(true);
          return "result";
        },
        1,
        "hello",
        true,
      );
    });
  });

  describe("边界情况", () => {
    it("应该处理 start 返回 undefined", () => {
      const startFn = vi.fn(() => undefined);
      const endFn = vi.fn();
      const bodyFn = vi.fn(() => "result");

      const blockFn = createBlock(startFn, endFn);
      const result = blockFn(bodyFn);

      expect(result).toBe("result");
      expect(endFn).toHaveBeenCalledWith(undefined, "result", undefined);
    });

    it("应该处理 start 返回 null", () => {
      const startFn = vi.fn(() => null);
      const endFn = vi.fn();
      const bodyFn = vi.fn(() => "result");

      const blockFn = createBlock(startFn, endFn);
      const result = blockFn(bodyFn);

      expect(result).toBe("result");
      expect(endFn).toHaveBeenCalledWith(null, "result", undefined);
    });

    it("应该处理无参数的 start 函数", () => {
      const startFn = vi.fn(() => ({ value: 42 }));
      const endFn = vi.fn();
      const bodyFn = vi.fn(() => "result");

      const blockFn = createBlock(startFn, endFn);
      blockFn(bodyFn);

      expect(startFn).toHaveBeenCalledWith();
    });

    it("应该处理异步风格的同步代码", () => {
      // 注意：block 本身是同步的，但可以用于同步操作
      const asyncLikeBlock = createBlock(
        () => ({ status: "pending" }),
        (cache, _result, error) => {
          (cache as { status: string }).status = error ? "failed" : "completed";
        },
      );

      const result = asyncLikeBlock((cache) => {
        expect((cache as { status: string }).status).toBe("pending");
        return "done";
      });

      expect(result).toBe("done");
    });
  });

  describe("多次调用", () => {
    it("应该支持多次调用同一个 block 实例", () => {
      const callLog: number[] = [];

      const counterBlock = createBlock(
        () => ({ count: 0 }),
        (cache) => {
          callLog.push(cache.count);
        },
      );

      counterBlock((cache) => {
        cache.count = 1;
        return "first";
      });

      counterBlock((cache) => {
        cache.count = 2;
        return "second";
      });

      counterBlock((cache) => {
        cache.count = 3;
        return "third";
      });

      expect(callLog).toEqual([1, 2, 3]);
    });
  });

  describe("嵌套使用", () => {
    it("应该支持嵌套的 block 调用", () => {
      const log: string[] = [];

      const outerBlock = createBlock(
        () => {
          log.push("outer-start");
          return { level: "outer" };
        },
        () => {
          log.push("outer-end");
        },
      );

      const innerBlock = createBlock(
        () => {
          log.push("inner-start");
          return { level: "inner" };
        },
        () => {
          log.push("inner-end");
        },
      );

      outerBlock(() => {
        innerBlock(() => {
          log.push("body");
          return "inner-result";
        });
        return "outer-result";
      });

      expect(log).toEqual(["outer-start", "inner-start", "body", "inner-end", "outer-end"]);
    });
  });
});
