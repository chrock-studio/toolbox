import { Overload } from "./overload.ts";
import { assertEquals, assertThrows } from "@std/assert";

Deno.test("Overload", async (t) => {
  await t.step("withFallback", async (t) => {
    await t.step("creates an Overload with fallback function", () => {
      const fn = Overload.withFallback((..._args: unknown[]) => "fallback");
      assertEquals(fn("any", "args"), "fallback");
    });

    await t.step("fallback receives all arguments", () => {
      const fn = Overload.withFallback((...args: unknown[]) => args);
      assertEquals(fn(1, 2, 3), [1, 2, 3]);
    });

    await t.step("fallback is called when no matcher matches", () => {
      const fn = Overload
        .withFallback((..._args: unknown[]) => "no match")
        .overload(
          [(x): x is string => typeof x === "string"],
          (s) => `string: ${s}`,
        );
      assertEquals(fn(123), "no match");
    });
  });

  await t.step("overload", async (t) => {
    await t.step("single overload branch", async (t) => {
      await t.step("matches and executes correct implementation", () => {
        const fn = Overload
          .withFallback(() => "fallback")
          .overload(
            [(x): x is string => typeof x === "string"],
            (s) => `Hello, ${s}!`,
          );
        assertEquals(fn("World"), "Hello, World!");
      });

      await t.step("returns fallback when no match", () => {
        const fn = Overload
          .withFallback((..._args: unknown[]) => "fallback")
          .overload(
            [(x): x is string => typeof x === "string"],
            (s) => `Hello, ${s}!`,
          );
        assertEquals(fn(123), "fallback");
      });
    });

    await t.step("multiple overload branches", async (t) => {
      await t.step("matches first matching branch", () => {
        const fn = Overload
          .withFallback(() => "fallback")
          .overload(
            [(x): x is string => typeof x === "string"],
            (s) => `string: ${s}`,
          )
          .overload(
            [(x): x is number => typeof x === "number"],
            (n) => `number: ${n}`,
          );
        assertEquals(fn("test"), "string: test");
        assertEquals(fn(42), "number: 42");
      });

      await t.step("checks matchers in reverse order (last added first)", () => {
        const order: string[] = [];
        const fn = Overload
          .withFallback(() => {
            order.push("fallback");
            return "fallback";
          })
          .overload(
            [(x): x is string => typeof x === "string"],
            (s) => {
              order.push("string");
              return `string: ${s}`;
            },
          )
          .overload(
            [(x: unknown): x is string => typeof x === "string"],
            (s) => {
              order.push("string2");
              return `string2: ${s}`;
            },
          );
        fn("test");
        assertEquals(order, ["string2"]);
      });

      await t.step("all branches fail, fallback is called", () => {
        const fn = Overload
          .withFallback((..._args: unknown[]) => "no match")
          .overload(
            [(x): x is string => typeof x === "string"],
            (s) => `string: ${s}`,
          )
          .overload(
            [(x): x is number => typeof x === "number"],
            (n) => `number: ${n}`,
          );
        assertEquals(fn(true), "no match");
      });
    });

    await t.step("multiple parameters", async (t) => {
      await t.step("matches multiple parameter types", () => {
        const fn = Overload
          .withFallback((..._args: unknown[]) => "fallback")
          .overload(
            [
              (x): x is string => typeof x === "string",
              (x): x is number => typeof x === "number",
            ],
            (name, age) => `${name} is ${age} years old`,
          );
        assertEquals(fn("Alice", 25), "Alice is 25 years old");
      });

      await t.step("fails when one parameter doesn't match", () => {
        const fn = Overload
          .withFallback((..._args: unknown[]) => "fallback")
          .overload(
            [
              (x): x is string => typeof x === "string",
              (x): x is number => typeof x === "number",
            ],
            (name, age) => `${name} is ${age} years old`,
          );
        assertEquals(fn("Alice", "25"), "fallback");
      });
    });

    await t.step("with rest parameters", async (t) => {
      await t.step("matches rest parameters", () => {
        const fn = Overload
          .withFallback((..._args: unknown[]) => "fallback")
          .overload(
            [(x): x is string => typeof x === "string"],
            (x): x is number => typeof x === "number",
            (s, ...rest) => `string: ${s}, rest: ${rest.join(",")}`,
          );
        assertEquals(fn("hello", 1, 2, 3), "string: hello, rest: 1,2,3");
      });

      await t.step("rest parameters must all match", () => {
        const fn = Overload
          .withFallback((..._args: unknown[]) => "fallback")
          .overload(
            [(x): x is string => typeof x === "string"],
            (x): x is number => typeof x === "number",
            (s, ...rest) => `string: ${s}, rest: ${rest.join(",")}`,
          );
        assertEquals(fn("hello", 1, "not a number"), "fallback");
      });

      await t.step("works without rest elements", () => {
        const fn = Overload
          .withFallback((..._args: unknown[]) => "fallback")
          .overload(
            [(x): x is string => typeof x === "string"],
            (x): x is number => typeof x === "number",
            (s, ...rest) => `string: ${s}, rest: ${rest.join(",")}`,
          );
        assertEquals(fn("hello"), "string: hello, rest: ");
      });
    });
  });

  await t.step("error handling", async (t) => {
    await t.step("throws TypeError when no match and no fallback", () => {
      const fn = new Overload([]);
      assertThrows(() => (fn as any)("test"), TypeError);
    });

    await t.step("throws TypeError when no matcher matches and no fallback", () => {
      // Create an Overload without fallback by using constructor directly
      const noFallback = new (Overload as any)([]);
      assertThrows(() => noFallback("test"), TypeError);
    });
  });

  await t.step("this context", async (t) => {
    await t.step("preserves this context in implementation", () => {
      const obj = {
        name: "Object",
        fn: Overload
          .withFallback(function (this: any, ..._args: unknown[]) {
            return this?.name ?? "no context";
          })
          .overload(
            [(x): x is string => typeof x === "string"],
            function (this: any, s: string) {
              return `${this.name}: ${s}`;
            },
          ),
      };
      assertEquals(obj.fn("test"), "Object: test");
      assertEquals(obj.fn(123), "Object");
    });
  });

  await t.step("chaining", async (t) => {
    await t.step("returns new Overload instance on each overload", () => {
      const fn1 = Overload.withFallback((..._args: unknown[]) => "fallback");
      const fn2 = fn1.overload(
        [(x): x is string => typeof x === "string"],
        (s) => `string: ${s}`,
      );
      const fn3 = fn2.overload(
        [(x): x is number => typeof x === "number"],
        (n) => `number: ${n}`,
      );
      // Original should still work
      assertEquals(fn1("test"), "fallback");
      assertEquals(fn1(123), "fallback");
      // fn2 has string overload
      assertEquals(fn2("test"), "string: test");
      assertEquals(fn2(123), "fallback");
      // fn3 has both
      assertEquals(fn3("test"), "string: test");
      assertEquals(fn3(123), "number: 123");
    });
  });

  await t.step("complex scenarios", async (t) => {
    await t.step("recursive type checking", () => {
      interface User {
        name: string;
        age: number;
      }
      const fn = Overload
        .withFallback((..._args: unknown[]) => "unknown")
        .overload(
          [(x): x is User => typeof x === "object" && x !== null && "name" in x && "age" in x],
          (user) => `${user.name} is ${user.age}`,
        )
        .overload(
          [(x): x is string => typeof x === "string"],
          (s) => `string: ${s}`,
        );
      assertEquals(fn({ name: "Alice", age: 25 }), "Alice is 25");
      assertEquals(fn("hello"), "string: hello");
      assertEquals(fn(123), "unknown");
    });

    await t.step("array type checking", () => {
      const fn = Overload
        .withFallback((..._args: unknown[]) => "unknown")
        .overload(
          [(x): x is string[] => Array.isArray(x) && x.every((item) => typeof item === "string")],
          (arr) => `strings: ${arr.join(", ")}`,
        )
        .overload(
          [(x): x is number[] => Array.isArray(x) && x.every((item) => typeof item === "number")],
          (arr) => `numbers: ${arr.join(", ")}`,
        );
      assertEquals(fn(["a", "b", "c"]), "strings: a, b, c");
      assertEquals(fn([1, 2, 3]), "numbers: 1, 2, 3");
      assertEquals(fn([1, "a", true]), "unknown");
    });
  });
});
