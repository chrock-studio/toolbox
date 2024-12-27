import { describe, expect, it, vi } from "vitest";
import { Callable } from "./callable";

describe("Callable", () => {
  it("should call the function", () => {
    const fn = vi.fn(() => console.log("Hello, world!"));
    const callable = new Callable(fn);
    callable();
    expect(fn).toHaveBeenCalledOnce();
  });
});
