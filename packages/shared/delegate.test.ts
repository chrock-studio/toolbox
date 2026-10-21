import { describe, expect, test } from "bun:test";
import { delegate } from "./delegate.ts";

describe("delegate", () => {
  test("should get value when called without arguments", () => {
    let value = 42;
    const getter = () => value;
    const setter = (v: number) => {
      value = v;
    };

    const d = delegate(getter, setter);

    expect(d()).toBe(42);
  });

  test("should set value when called with argument", () => {
    let value = 42;
    const getter = () => value;
    const setter = (v: number) => {
      value = v;
    };

    const d = delegate(getter, setter);

    d(100);
    expect(d()).toBe(100);
  });

  test("should work with string values", () => {
    let value = "hello";
    const d = delegate(
      () => value,
      (v) => {
        value = v;
      },
    );

    expect(d()).toBe("hello");

    d("world");
    expect(d()).toBe("world");
  });

  test("should work with object values", () => {
    let value = { name: "test", count: 1 };
    const d = delegate(
      () => value,
      (v) => {
        value = v;
      },
    );

    expect(d()).toStrictEqual({ name: "test", count: 1 });

    d({ name: "updated", count: 2 });
    expect(d()).toStrictEqual({ name: "updated", count: 2 });
  });

  test("should work with null and undefined values", () => {
    let value: string | null = null;
    const d = delegate(
      () => value,
      (v) => {
        value = v;
      },
    );

    expect(d()).toBe(null);

    d("not null");
    expect(d()).toBe("not null");

    d(null);
    expect(d()).toBe(null);
  });

  test("should work with boolean values", () => {
    let value = false;
    const d = delegate(
      () => value,
      (v) => {
        value = v;
      },
    );

    expect(d()).toBe(false);

    d(true);
    expect(d()).toBe(true);
  });

  test("should work with array values", () => {
    let value: number[] = [1, 2, 3];
    const d = delegate(
      () => value,
      (v) => {
        value = v;
      },
    );

    expect(d()).toStrictEqual([1, 2, 3]);

    d([4, 5, 6]);
    expect(d()).toStrictEqual([4, 5, 6]);
  });

  test("should return undefined when setting value", () => {
    let value = 0;
    const d = delegate(
      () => value,
      (v) => {
        value = v;
      },
    );

    const result = d(10);
    expect(result).toBe(undefined);
    expect(d()).toBe(10);
  });

  test("should work with multiple delegates independently", () => {
    let valueA = "a";
    let valueB = "b";

    const dA = delegate(
      () => valueA,
      (v) => {
        valueA = v;
      },
    );
    const dB = delegate(
      () => valueB,
      (v) => {
        valueB = v;
      },
    );

    expect(dA()).toBe("a");
    expect(dB()).toBe("b");

    dA("updated A");
    dB("updated B");

    expect(dA()).toBe("updated A");
    expect(dB()).toBe("updated B");
  });
});
