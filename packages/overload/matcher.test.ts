import { Matcher } from "./matcher.ts";
import { assertEquals, assertFalse } from "@std/assert";

Deno.test("Matcher", async (t) => {
  await t.step("without Rest Parameters", async (t) => {
    await t.step("check() returns true for matching input", () => {
      const matcher = Matcher.make(
        [
          (x): x is string => typeof x === "string",
          (x): x is number => typeof x === "number",
        ],
        (name, age) => `Name: ${name}, Age: ${age}`,
      );

      assertEquals(matcher.check(["John Doe", 18]), true);
    });

    await t.step("check() returns false for non-matching input", () => {
      const matcher = Matcher.make(
        [
          (x): x is string => typeof x === "string",
          (x): x is number => typeof x === "number",
        ],
        (name, age) => `Name: ${name}, Age: ${age}`,
      );

      assertFalse(matcher.check(["John Doe", "18"]));
    });

    await t.step("call returns expected result", () => {
      const matcher = Matcher.make(
        [
          (x): x is string => typeof x === "string",
          (x): x is number => typeof x === "number",
        ],
        (name, age) => `Name: ${name}, Age: ${age}`,
      );

      assertEquals(matcher.implement("John Doe", 18), "Name: John Doe, Age: 18");
    });

    await t.step("check() returns true for extra elements", () => {
      const matcher = Matcher.make(
        [
          (x): x is string => typeof x === "string",
          (x): x is number => typeof x === "number",
        ],
        (name, age) => `Name: ${name}, Age: ${age}`,
      );

      assertFalse(matcher.check(["John Doe", 18, true]));
    });
  });

  await t.step("with Rest Parameters", async (t) => {
    await t.step("check() returns true for matching input with rest", () => {
      const matcher = Matcher.make(
        [
          (x): x is string => typeof x === "string",
          (x): x is number => typeof x === "number",
        ],
        (x): x is boolean => typeof x === "boolean",
        (name, age, ...other) => `Name: ${name}, Age: ${age}, and other: [${other.join(", ")}]`,
      );

      assertEquals(matcher.check(["John Doe", 18, true, false, true]), true);
    });

    await t.step("check() returns false when rest elements don't match", () => {
      const matcher = Matcher.make(
        [
          (x): x is string => typeof x === "string",
          (x): x is number => typeof x === "number",
        ],
        (x): x is boolean => typeof x === "boolean",
        (name, age, ...other) => `Name: ${name}, Age: ${age}, and other: [${other.join(", ")}]`,
      );

      assertFalse(matcher.check(["John Doe", 18, "not a boolean"]));
    });

    await t.step("check() returns true for input without rest elements", () => {
      const matcher = Matcher.make(
        [
          (x): x is string => typeof x === "string",
          (x): x is number => typeof x === "number",
        ],
        (x): x is boolean => typeof x === "boolean",
        (name, age, ...other) => `Name: ${name}, Age: ${age}, and other: [${other.join(", ")}]`,
      );

      assertEquals(matcher.check(["John Doe", 18]), true);
    });

    await t.step("call returns expected result with rest elements", () => {
      const matcher = Matcher.make(
        [
          (x): x is string => typeof x === "string",
          (x): x is number => typeof x === "number",
        ],
        (x): x is boolean => typeof x === "boolean",
        (name, age, ...other) => `Name: ${name}, Age: ${age}, and other: [${other.join(", ")}]`,
      );

      assertEquals(
        matcher.implement("John Doe", 18, true, false, true),
        "Name: John Doe, Age: 18, and other: [true, false, true]",
      );
    });

    await t.step("call returns expected result without rest elements", () => {
      const matcher = Matcher.make(
        [
          (x): x is string => typeof x === "string",
          (x): x is number => typeof x === "number",
        ],
        (x): x is boolean => typeof x === "boolean",
        (name, age, ...other) => `Name: ${name}, Age: ${age}, and other: [${other.join(", ")}]`,
      );

      assertEquals(
        matcher.implement("John Doe", 18),
        "Name: John Doe, Age: 18, and other: []",
      );
    });
  });

  await t.step("edge cases", async (t) => {
    await t.step("empty checkers array", () => {
      const matcher = Matcher.make(
        [] as [],
        () => "no checkers",
      );

      assertEquals(matcher.check([]), true);
    });

    await t.step("single checker", () => {
      const matcher = Matcher.make(
        [(x): x is string => typeof x === "string"],
        (str) => `Got: ${str}`,
      );

      assertEquals(matcher.check(["hello"]), true);
    });

    await t.step("check() returns false for insufficient elements", () => {
      const matcher = Matcher.make(
        [
          (x): x is string => typeof x === "string",
          (x): x is number => typeof x === "number",
        ],
        (name, age) => `Name: ${name}, Age: ${age}`,
      );

      assertFalse(matcher.check(["John Doe"]));
    });

    await t.step("check() returns false for empty input", () => {
      const matcher = Matcher.make(
        [
          (x): x is string => typeof x === "string",
          (x): x is number => typeof x === "number",
        ],
        (name, age) => `Name: ${name}, Age: ${age}`,
      );

      assertFalse(matcher.check([]));
    });
  });
});
