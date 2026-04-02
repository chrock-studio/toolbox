import { assertEquals } from "@std/assert";
import { delegate } from "./delegate.ts";

Deno.test("delegate", async (t) => {
  await t.step("should get value when called without arguments", () => {
    let value = 42;
    const getter = () => value;
    const setter = (v: number) => {
      value = v;
    };

    const d = delegate(getter, setter);

    assertEquals(d(), 42);
  });

  await t.step("should set value when called with argument", () => {
    let value = 42;
    const getter = () => value;
    const setter = (v: number) => {
      value = v;
    };

    const d = delegate(getter, setter);

    d(100);
    assertEquals(d(), 100);
  });

  await t.step("should work with string values", () => {
    let value = "hello";
    const d = delegate(
      () => value,
      (v) => {
        value = v;
      },
    );

    assertEquals(d(), "hello");

    d("world");
    assertEquals(d(), "world");
  });

  await t.step("should work with object values", () => {
    let value = { name: "test", count: 1 };
    const d = delegate(
      () => value,
      (v) => {
        value = v;
      },
    );

    assertEquals(d(), { name: "test", count: 1 });

    d({ name: "updated", count: 2 });
    assertEquals(d(), { name: "updated", count: 2 });
  });

  await t.step("should work with null and undefined values", () => {
    let value: string | null = null;
    const d = delegate(
      () => value,
      (v) => {
        value = v;
      },
    );

    assertEquals(d(), null);

    d("not null");
    assertEquals(d(), "not null");

    d(null);
    assertEquals(d(), null);
  });

  await t.step("should work with boolean values", () => {
    let value = false;
    const d = delegate(
      () => value,
      (v) => {
        value = v;
      },
    );

    assertEquals(d(), false);

    d(true);
    assertEquals(d(), true);
  });

  await t.step("should work with array values", () => {
    let value: number[] = [1, 2, 3];
    const d = delegate(
      () => value,
      (v) => {
        value = v;
      },
    );

    assertEquals(d(), [1, 2, 3]);

    d([4, 5, 6]);
    assertEquals(d(), [4, 5, 6]);
  });

  await t.step("should return undefined when setting value", () => {
    let value = 0;
    const d = delegate(
      () => value,
      (v) => {
        value = v;
      },
    );

    const result = d(10);
    assertEquals(result, undefined);
    assertEquals(d(), 10);
  });

  await t.step("should work with multiple delegates independently", () => {
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

    assertEquals(dA(), "a");
    assertEquals(dB(), "b");

    dA("updated A");
    dB("updated B");

    assertEquals(dA(), "updated A");
    assertEquals(dB(), "updated B");
  });
});
