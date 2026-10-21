import { describe, expect, test } from "bun:test";
import { check } from "./checker.ts";
import { Matcher } from "./matcher.ts";

const str = check((x): x is string => typeof x === "string");
const num = check((x): x is number => typeof x === "number");
const bool = check((x): x is boolean => typeof x === "boolean");

describe("Matcher", () => {
  describe("without Rest Parameters", () => {
    test("check() returns true for matching input", () => {
      const matcher = Matcher.make([str, num], (name, age) => `Name: ${name}, Age: ${age}`);

      expect(matcher.check(["John Doe", 18])).toBe(true);
    });

    test("check() returns false for non-matching input", () => {
      const matcher = Matcher.make([str, num], (name, age) => `Name: ${name}, Age: ${age}`);

      expect(matcher.check(["John Doe", "18"])).toBe(false);
    });

    test("call returns expected result", () => {
      const matcher = Matcher.make([str, num], (name, age) => `Name: ${name}, Age: ${age}`);

      expect(matcher.implement("John Doe", 18)).toBe("Name: John Doe, Age: 18");
    });

    test("check() returns true for extra elements without rest", () => {
      const matcher = Matcher.make([str, num], (name, age) => `Name: ${name}, Age: ${age}`);

      expect(matcher.check(["John Doe", 18, true])).toBe(true);
    });
  });

  describe("with Rest Parameters", () => {
    test("check() returns true for matching input with rest", () => {
      const matcher = Matcher.make(
        [str, num],
        bool,
        (name, age, ...other) => `Name: ${name}, Age: ${age}, and other: [${other.join(", ")}]`,
      );

      expect(matcher.check(["John Doe", 18, true, false, true])).toBe(true);
    });

    test("check() returns false when rest elements don't match", () => {
      const matcher = Matcher.make(
        [str, num],
        bool,
        (name, age, ...other) => `Name: ${name}, Age: ${age}, and other: [${other.join(", ")}]`,
      );

      expect(matcher.check(["John Doe", 18, "not a boolean"])).toBe(false);
    });

    test("check() returns true for input without rest elements", () => {
      const matcher = Matcher.make(
        [str, num],
        bool,
        (name, age, ...other) => `Name: ${name}, Age: ${age}, and other: [${other.join(", ")}]`,
      );

      expect(matcher.check(["John Doe", 18])).toBe(true);
    });

    test("call returns expected result with rest elements", () => {
      const matcher = Matcher.make(
        [str, num],
        bool,
        (name, age, ...other) => `Name: ${name}, Age: ${age}, and other: [${other.join(", ")}]`,
      );

      expect(matcher.implement("John Doe", 18, true, false, true)).toBe(
        "Name: John Doe, Age: 18, and other: [true, false, true]",
      );
    });

    test("call returns expected result without rest elements", () => {
      const matcher = Matcher.make(
        [str, num],
        bool,
        (name, age, ...other) => `Name: ${name}, Age: ${age}, and other: [${other.join(", ")}]`,
      );

      expect(matcher.implement("John Doe", 18)).toBe("Name: John Doe, Age: 18, and other: []");
    });
  });

  describe("edge cases", () => {
    test("empty checkers array", () => {
      const matcher = Matcher.make([] as [], () => "no checkers");

      expect(matcher.check([])).toBe(true);
    });

    test("single checker", () => {
      const matcher = Matcher.make([str], (str) => `Got: ${str}`);

      expect(matcher.check(["hello"])).toBe(true);
    });

    test("check() returns false for insufficient elements", () => {
      const matcher = Matcher.make([str, num], (name, age) => `Name: ${name}, Age: ${age}`);

      expect(matcher.check(["John Doe"])).toBe(false);
    });

    test("check() returns false for empty input", () => {
      const matcher = Matcher.make([str, num], (name, age) => `Name: ${name}, Age: ${age}`);

      expect(matcher.check([])).toBe(false);
    });
  });
});
