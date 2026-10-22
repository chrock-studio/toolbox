import { afterEach, describe, expect, test } from "bun:test";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { check } from "./checker.ts";
import { __setAotStateForTest } from "./compile.ts";
import { resetWarningsForTest } from "./internal.ts";
import { Matcher } from "./matcher.ts";
import { Overload } from "./overload.ts";

type AnyFn = (...args: any[]) => any;

const originalWarn = console.warn;

afterEach(() => {
  console.warn = originalWarn;
  __setAotStateForTest("unknown");
  resetWarningsForTest();
});

const str = check((x): x is string => typeof x === "string");
const num = check((x): x is number => typeof x === "number");

/** Calls `fn`, capturing either its value or the thrown error type. */
const capture = (fn: AnyFn, args: unknown[]) => {
  try {
    return { value: fn(...args) };
  } catch (error) {
    return { error: error instanceof Error ? error.name : String(error) };
  }
};

const aot = (fn: unknown): AnyFn => (fn as { aot: () => AnyFn }).aot();

/** Asserts that `fn.aot()` and `fn` agree on every argument tuple. */
const expectParity = (fn: AnyFn, cases: unknown[][]): AnyFn => {
  const compiled = aot(fn);
  for (const args of cases) {
    expect(capture(compiled, args)).toStrictEqual(capture(fn, args));
  }
  return compiled;
};

describe("Overload.aot", () => {
  test("mirrors the builder API and keeps chaining compiled", () => {
    const built = Overload.aot.withFallback(() => "fallback").overload([str], (s) => `string: ${s}`);

    expect(built("Alice")).toBe("string: Alice");
    expect((built as AnyFn)(1)).toBe("fallback");
    expect(aot(built)).toBe(built);

    const chained = built.overload([num], (n) => `number: ${n}`);
    expect(chained(1)).toBe("number: 1");
    expect(chained("Alice")).toBe("string: Alice");
    expect(aot(chained)).toBe(chained);
  });

  test("preserves length, name and the overload surface", () => {
    const plain = Overload.withFallback(() => "fallback").overload([str], (s) => `string: ${s}`);
    const compiled = plain.aot();

    expect(compiled).not.toBe(plain);
    expect(compiled.aot()).toBe(compiled);
    expect((compiled as any).length).toBe(0);
    expect((plain as any).length).toBe(0);
    expect((compiled as any).name).toBe("");
    expect((compiled as any).matchers).toHaveLength(1);
    expect(typeof (compiled as any).fallback).toBe("function");
    expect(typeof compiled.overload).toBe("function");
  });

  test("does not mutate the interpreted function", () => {
    const plain = Overload.withFallback(() => "fallback").overload([str], (s) => `string: ${s}`);
    const compiled = plain.aot();

    expect(compiled("a")).toBe("string: a");
    expect(plain("a")).toBe("string: a");
    expect((plain as any).matchers).toHaveLength(1);
  });

  test("accepts a fallback through the constructor", () => {
    const fn = Overload.aot.withFallback((...args: unknown[]) => args.join("-"));
    expect(fn(1, 2, 3)).toBe("1-2-3");
    expect(fn()).toBe("");
  });
});

describe("AOT parity", () => {
  test("single parameter branches", () => {
    const fn = Overload.withFallback((...args: unknown[]) => `fallback:${args.length}`)
      .overload([str], (s) => `string:${s}`)
      .overload([num], (n) => `number:${n}`);

    const compiled = expectParity(fn, [["a"], [1], [true], [], [null], ["a", "b"], [1, 2]]);
    expect(compiled("a")).toBe("string:a");
    expect(compiled(1)).toBe("number:1");
    expect(compiled(true)).toBe("fallback:1");
  });

  test("multiple parameters", () => {
    const fn = Overload.withFallback(() => "fallback")
      .overload([str, num], (s, n) => `${s}:${n}`)
      .overload([num, num], (a, b) => `${a + b}`);

    expectParity(fn, [["a", 1], [1, 2], ["a", "b"], [1], [], ["a", 1, 2, 3]]);
  });

  test("rest parameters", () => {
    const fn = Overload.withFallback(() => "fallback").overload([str], num, (s, ...rest) => `${s}|${rest.join(",")}`);

    const compiled = expectParity(fn, [["a", 1, 2, 3], ["a"], ["a", 1, "x"], [1], [], ["a", 1, 2, 3, 4, 5]]);
    expect(compiled("a", 1, 2)).toBe("a|1,2");
  });

  test("rest parameters without fixed checkers", () => {
    const matcher = Matcher.make([], num, (...rest: number[]) => rest.length);
    const fn = new (Overload as any)([matcher], () => "fallback");

    expectParity(fn, [[], [1], [1, 2, 3], ["x"]]);
  });

  test("branches without checkers always match", () => {
    const matcher = Matcher.make([], () => "always");
    const fn = new (Overload as any)([matcher], () => "fallback");

    const compiled = expectParity(fn, [[], ["a", 1], [undefined]]);
    expect(compiled("a")).toBe("always");
  });

  test("extra arguments are forwarded to the implementation", () => {
    const fn = Overload.withFallback(() => "fallback").overload([str], (...args: unknown[]) => args.length);
    expectParity(fn, [["a", 1, 2, 3], ["a"]]);
  });

  test("missing arguments are matched as undefined", () => {
    const nothing = check((x): x is undefined => x === undefined);
    const fn = Overload.withFallback(() => "fallback").overload([nothing], () => "undefined-ok");

    const compiled = expectParity(fn, [[], [undefined], ["a"]]);
    expect(compiled()).toBe("undefined-ok");
  });

  test("no fallback throws TypeError", () => {
    const matcher = Matcher.make([str], (s) => `string:${s}`);
    const fn = new (Overload as any)([matcher]);

    const compiled = expectParity(fn, [["a"], [1], []]);
    expect(() => compiled(1)).toThrow("No overload matched");
  });

  test("empty matcher list without fallback throws TypeError", () => {
    const fn = new Overload.aot([]);
    expect(() => (fn as any)("a")).toThrow(TypeError);
  });

  test("preserves this binding", () => {
    const obj = {
      tag: "T",
      fn: Overload.withFallback(function (this: { tag: string }) {
        return this.tag;
      }).overload([str], function (this: { tag: string }, s: string) {
        return `${this.tag}:${s}`;
      }),
    };

    const compiled = aot(obj.fn);
    const compiledHolder = { tag: "T", fn: compiled };
    const plainHolder = { tag: "T", fn: obj.fn };
    const barePlain = obj.fn as AnyFn;

    expect(compiledHolder.fn("a")).toBe("T:a");
    expect(plainHolder.fn("a")).toBe("T:a");
    expect({ tag: "U", fn: compiled }.fn(1)).toBe("U");
    expect(() => compiled("a")).toThrow(TypeError);
    expect(() => barePlain("a")).toThrow(TypeError);
  });

  test("accepts schemas whose validate resolves asynchronously", () => {
    const asynchronous: StandardSchemaV1<string> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (value) => Promise.resolve({ value: value as string }),
      },
    };
    const fn = Overload.withFallback(() => "fallback").overload([asynchronous], (s) => `async:${s}`);

    // A promise has no `issues`, so both dispatch paths treat it as a pass.
    const compiled = expectParity(fn, [["a"], [1]]);
    expect(compiled("a")).toBe("async:a");
  });

  test("preserves the failure mode of invalid validation results", () => {
    const broken = {
      "~standard": { version: 1, vendor: "test", validate: () => null },
    } as unknown as StandardSchemaV1;
    const fn = Overload.withFallback(() => "fallback").overload([broken], () => "unreachable");

    expectParity(fn, [["a"], [1]]);
    expect(() => aot(fn)(1)).toThrow(TypeError);
  });

  test("third-party schemas dispatch identically", () => {
    const vendor = {
      "~standard": {
        version: 1,
        vendor: "third-party",
        validate: (value: unknown) =>
          typeof value === "string" && value.length > 1 ? { value } : { issues: [{ message: "too short" }] },
      },
    } as StandardSchemaV1;

    const fn = Overload.withFallback(() => "fallback").overload([vendor], (s) => `vendor:${s}`);
    expectParity(fn, [["ab"], ["a"], [1]]);
  });
});

describe("AOT fallback", () => {
  test("falls back with a single warning when code generation is unavailable", () => {
    const warnings: string[] = [];
    console.warn = (...args: unknown[]) => {
      warnings.push(args.join(" "));
    };
    resetWarningsForTest();
    __setAotStateForTest("blocked", new Error("Code generation from strings disallowed for this context"));

    const plain = Overload.withFallback(() => "fallback").overload([str], (s) => `string: ${s}`);
    const first = aot(plain);
    const second = aot(plain);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("falling back to interpreted dispatch");
    expect(warnings[0]).toContain("Code generation from strings disallowed");
    expect(first("a")).toBe("string: a");
    expect(second(1)).toBe("fallback");
  });

  test("interpreted overloads never touch code generation", () => {
    const warnings: string[] = [];
    console.warn = (...args: unknown[]) => {
      warnings.push(args.join(" "));
    };
    resetWarningsForTest();
    __setAotStateForTest("blocked", new Error("blocked"));

    const plain = Overload.withFallback(() => "fallback").overload([str], (s) => `string: ${s}`);

    expect(plain("a")).toBe("string: a");
    expect(warnings).toHaveLength(0);
  });

  test("warns and falls back for duck-typed matchers", () => {
    const warnings: string[] = [];
    console.warn = (...args: unknown[]) => {
      warnings.push(args.join(" "));
    };
    resetWarningsForTest();

    const fake = { check: () => true, implement: () => "fake" };
    const fn = new (Overload as any)([fake]);
    const compiled = aot(fn);

    expect(compiled(1)).toBe("fake");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("Matcher.make()");
  });
});
