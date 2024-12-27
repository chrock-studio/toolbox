import { describe, expect, it } from "vitest";
import { throwIfNullish } from "./throw-if-nullish";

describe("throwIfNullish", () => {
  it("should throw if condition is nullish", () => {
    expect(() => {
      throwIfNullish(null, () => "Condition is nullish");
    }).toThrow("Condition is nullish");
  });

  it("should not throw if condition is not nullish", () => {
    expect(() => {
      throwIfNullish(1, () => "Condition is nullish");
    }).not.toThrow();
  });
});
