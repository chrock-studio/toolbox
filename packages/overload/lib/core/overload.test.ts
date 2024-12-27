import { describe, expect, it } from "vitest";
import { overload } from "./overload";
import { legacy, valibot, zod } from "../matcher";
import * as v from "valibot";
import * as z from "zod";

describe("overload", () => {
  describe("legacy", () => {
    it("should overload functions", () => {
      const fn = overload(legacy(["string", "number"], (a, b) => a + b));
      expect(fn("Hello, ", 42)).toEqual("Hello, 42");
    });

    it("should overload functions with rest", () => {
      const fn = overload(
        legacy(["string", "number"], "string", (a, b, ...rest) => a + b + `[${rest.join(", ")}]`),
      );
      expect(fn("Hello, ", 42, "1")).toEqual("Hello, 42[1]");
    });

    it("should throw an error if no overload matches", () => {
      const fn = overload(legacy(["string", "number"], (a, b) => a + b));
      // @ts-expect-error -- It's ok.
      expect(() => fn(42, "Hello, ")).toThrow("No overload matched");
    });
  });

  describe("valibot", () => {
    it("should overload functions", () => {
      const fn = overload(valibot([v.string(), v.number()], (a, b) => a + b));
      expect(fn("Hello, ", 42)).toEqual("Hello, 42");
    });

    it("should overload functions with rest", () => {
      const fn = overload(
        valibot(
          [v.string(), v.number()],
          v.string(),
          (a, b, ...rest) => a + b + `[${rest.join(", ")}]`,
        ),
      );
      expect(fn("Hello, ", 42, "1")).toEqual("Hello, 42[1]");
    });

    it("should throw an error if no overload matches", () => {
      const fn = overload(valibot([v.string(), v.number()], (a, b) => a + b));
      // @ts-expect-error -- It's ok.
      expect(() => fn(42, "Hello, ")).toThrow("No overload matched");
    });
  });

  describe("zod", () => {
    it("should overload functions", () => {
      const fn = overload(zod([z.string(), z.number()], (a, b) => a + b));
      expect(fn("Hello, ", 42)).toEqual("Hello, 42");
    });

    it("should overload functions with rest", () => {
      const fn = overload(
        zod(
          [z.string(), z.number()],
          z.string(),
          (a, b, ...rest) => a + b + `[${rest.join(", ")}]`,
        ),
      );
      expect(fn("Hello, ", 42, "1")).toEqual("Hello, 42[1]");
    });

    it("should throw an error if no overload matches", () => {
      const fn = overload(zod([z.string(), z.number()], (a, b) => a + b));
      // @ts-expect-error -- It's ok.
      expect(() => fn(42, "Hello, ")).toThrow("No overload matched");
    });
  });
});
