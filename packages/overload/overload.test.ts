import { describe, expect, test } from "bun:test";
import { check } from "./checker.ts";
import { Overload } from "./overload.ts";

const str = check((x): x is string => typeof x === "string");
const num = check((x): x is number => typeof x === "number");
const user = check(
  (x): x is { name: string; age: number } =>
    typeof x === "object" &&
    x !== null &&
    "name" in x &&
    typeof (x as { name: unknown }).name === "string" &&
    "age" in x &&
    typeof (x as { age: unknown }).age === "number",
);
const strArr = check(
  (x): x is string[] => Array.isArray(x) && x.every((item): item is string => typeof item === "string"),
);
const numArr = check(
  (x): x is number[] => Array.isArray(x) && x.every((item): item is number => typeof item === "number"),
);

describe("Overload", () => {
  describe("withFallback", () => {
    test("creates an Overload with fallback function", () => {
      const fn = Overload.withFallback((..._args: unknown[]) => "fallback");
      expect(fn("any", "args")).toBe("fallback");
    });

    test("fallback receives all arguments", () => {
      const fn = Overload.withFallback((...args: unknown[]) => args);
      expect(fn(1, 2, 3)).toStrictEqual([1, 2, 3]);
    });

    test("fallback is called when no matcher matches", () => {
      const fn = Overload.withFallback((..._args: unknown[]) => "no match").overload([str], (s) => `string: ${s}`);
      expect(fn(123)).toBe("no match");
    });
  });

  describe("overload", () => {
    describe("single overload branch", () => {
      test("matches and executes correct implementation", () => {
        const fn = Overload.withFallback(() => "fallback").overload([str], (s) => `Hello, ${s}!`);
        expect(fn("World")).toBe("Hello, World!");
      });

      test("returns fallback when no match", () => {
        const fn = Overload.withFallback((..._args: unknown[]) => "fallback").overload([str], (s) => `Hello, ${s}!`);
        expect(fn(123)).toBe("fallback");
      });
    });

    describe("multiple overload branches", () => {
      test("matches first matching branch", () => {
        const fn = Overload.withFallback(() => "fallback")
          .overload([str], (s) => `string: ${s}`)
          .overload([num], (n) => `number: ${n}`);
        expect(fn("test")).toBe("string: test");
        expect(fn(42)).toBe("number: 42");
      });

      test("checks matchers in reverse order (last added first)", () => {
        const order: string[] = [];
        const fn = Overload.withFallback(() => {
          order.push("fallback");
          return "fallback";
        })
          .overload([str], (s) => {
            order.push("string");
            return `string: ${s}`;
          })
          .overload([str], (s) => {
            order.push("string2");
            return `string2: ${s}`;
          });
        fn("test");
        expect(order).toStrictEqual(["string2"]);
      });

      test("all branches fail, fallback is called", () => {
        const fn = Overload.withFallback((..._args: unknown[]) => "no match")
          .overload([str], (s) => `string: ${s}`)
          .overload([num], (n) => `number: ${n}`);
        expect(fn(true)).toBe("no match");
      });
    });

    describe("multiple parameters", () => {
      test("matches multiple parameter types", () => {
        const fn = Overload.withFallback((..._args: unknown[]) => "fallback").overload(
          [str, num],
          (name, age) => `${name} is ${age} years old`,
        );
        expect(fn("Alice", 25)).toBe("Alice is 25 years old");
      });

      test("fails when one parameter doesn't match", () => {
        const fn = Overload.withFallback((..._args: unknown[]) => "fallback").overload(
          [str, num],
          (name, age) => `${name} is ${age} years old`,
        );
        expect(fn("Alice", "25")).toBe("fallback");
      });
    });

    describe("with rest parameters", () => {
      test("matches rest parameters", () => {
        const fn = Overload.withFallback((..._args: unknown[]) => "fallback").overload(
          [str],
          num,
          (s, ...rest) => `string: ${s}, rest: ${rest.join(",")}`,
        );
        expect(fn("hello", 1, 2, 3)).toBe("string: hello, rest: 1,2,3");
      });

      test("rest parameters must all match", () => {
        const fn = Overload.withFallback((..._args: unknown[]) => "fallback").overload(
          [str],
          num,
          (s, ...rest) => `string: ${s}, rest: ${rest.join(",")}`,
        );
        expect(fn("hello", 1, "not a number")).toBe("fallback");
      });

      test("works without rest elements", () => {
        const fn = Overload.withFallback((..._args: unknown[]) => "fallback").overload(
          [str],
          num,
          (s, ...rest) => `string: ${s}, rest: ${rest.join(",")}`,
        );
        expect(fn("hello")).toBe("string: hello, rest: ");
      });
    });
  });

  describe("error handling", () => {
    test("throws TypeError when no match and no fallback", () => {
      const fn = new Overload([]);
      expect(() => (fn as any)("test")).toThrow(TypeError);
    });

    test("throws TypeError when no matcher matches and no fallback", () => {
      // Create an Overload without fallback by using constructor directly
      const noFallback = new (Overload as any)([]);
      expect(() => noFallback("test")).toThrow(TypeError);
    });
  });

  describe("this context", () => {
    test("preserves this context in implementation", () => {
      const obj = {
        name: "Object",
        fn: Overload.withFallback(function (this: any, ..._args: unknown[]) {
          return this?.name ?? "no context";
        }).overload([str], function (this: any, s: string) {
          return `${this.name}: ${s}`;
        }),
      };
      expect(obj.fn("test")).toBe("Object: test");
      expect(obj.fn(123)).toBe("Object");
    });
  });

  describe("chaining", () => {
    test("returns new Overload instance on each overload", () => {
      const fn1 = Overload.withFallback((..._args: unknown[]) => "fallback");
      const fn2 = fn1.overload([str], (s) => `string: ${s}`);
      const fn3 = fn2.overload([num], (n) => `number: ${n}`);
      // Original should still work
      expect(fn1("test")).toBe("fallback");
      expect(fn1(123)).toBe("fallback");
      // fn2 has string overload
      expect(fn2("test")).toBe("string: test");
      expect(fn2(123)).toBe("fallback");
      // fn3 has both
      expect(fn3("test")).toBe("string: test");
      expect(fn3(123)).toBe("number: 123");
    });
  });

  describe("complex scenarios", () => {
    test("object schema checking", () => {
      const fn = Overload.withFallback((..._args: unknown[]) => "unknown")
        .overload([user], (u) => `${u.name} is ${u.age}`)
        .overload([str], (s) => `string: ${s}`);
      expect(fn({ name: "Alice", age: 25 })).toBe("Alice is 25");
      expect(fn("hello")).toBe("string: hello");
      expect(fn(123)).toBe("unknown");
    });

    test("array schema checking", () => {
      const fn = Overload.withFallback((..._args: unknown[]) => "unknown")
        .overload([strArr], (arr) => `strings: ${arr.join(", ")}`)
        .overload([numArr], (arr) => `numbers: ${arr.join(", ")}`);
      expect(fn(["a", "b", "c"])).toBe("strings: a, b, c");
      expect(fn([1, 2, 3])).toBe("numbers: 1, 2, 3");
      expect(fn([1, "a", true])).toBe("unknown");
    });
  });
});
