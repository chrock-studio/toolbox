import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { type Overwrite, withPrototype } from "./apply/index.ts";

describe("withPrototype", () => {
  test("should add prototype methods to Zod object schema output", () => {
    const User = withPrototype(
      z.object({
        name: z.string(),
        age: z.number(),
      }),
      {
        info() {
          return `"${this.name}" (${this.age})`;
        },
      },
    );

    const user = User.decode({
      name: "John Doe",
      age: 18,
    });

    expect(user.info()).toBe('"John Doe" (18)');
  });

  test("should work with .apply() method", () => {
    const User = z
      .object({
        name: z.string(),
        age: z.number(),
      })
      .apply(
        withPrototype({
          info() {
            return `"${this.name}" (${this.age})`;
          },
        }),
      );

    const user = User.decode({
      name: "Jane Smith",
      age: 25,
    });

    expect(user.info()).toBe('"Jane Smith" (25)');
  });

  test("should work with getter and nested objects", () => {
    const Address = withPrototype(
      z.object({
        street: z.string(),
        city: z.string(),
      }),
      {
        fullAddress() {
          return `${this.street}, ${this.city}`;
        },
      },
    );

    const User = z
      .object({
        name: z.string(),
        address: Address,
      })
      .apply(
        withPrototype({
          get info() {
            return `"${this.name}" at ${this.address.fullAddress()}`;
          },
        }),
      );

    const user = User.decode({
      name: "John Doe",
      address: {
        street: "123 Main St",
        city: "New York",
      },
    });

    expect(user.address.fullAddress()).toBe("123 Main St, New York");
    expect(user.info).toBe('"John Doe" at 123 Main St, New York');
  });

  test("should work with prototype chain", () => {
    const shape = {
      name: z.string(),
      age: z.number(),
    };

    interface UserOverwrite extends Overwrite {
      return: z.ZodObject<typeof shape, Overwrite.Methods<this> extends infer O ? z.core.$strip & { out: O } : never>;
    }
    const User = z
      .object(shape)
      .apply(
        withPrototype.assert<UserOverwrite>()({
          info() {
            return `"${this.name}" (Age: ${this.age})`;
          },
        }),
      )
      .extend({
        length: z.number(),
      })
      .apply(
        withPrototype({
          fullInformation() {
            return `${this.info()} (Length: ${this.length})`;
          },
        }),
      );

    const user = User.decode({
      name: "John Doe",
      age: 18,
      length: 160,
    });

    expect(user.info()).toBe('"John Doe" (Age: 18)');
    expect(user.fullInformation()).toBe('"John Doe" (Age: 18) (Length: 160)');
  });
});
