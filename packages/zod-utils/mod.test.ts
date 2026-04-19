import { assertEquals } from "@std/assert";
import { z } from "zod";
import { withPrototype } from "./apply/mod.ts";

Deno.test("withPrototype", async (t) => {
  await t.step("should add prototype methods to Zod object schema output", () => {
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

    const user = User.parse({
      name: "John Doe",
      age: 18,
    });

    assertEquals(user.info(), '"John Doe" (18)');
  });

  await t.step("should work with .apply() method", () => {
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

    const user = User.parse({
      name: "Jane Smith",
      age: 25,
    });

    assertEquals(user.info(), '"Jane Smith" (25)');
  });

  await t.step("should work with nested objects", () => {
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

    const User = z.object({
      name: z.string(),
      address: Address,
    }).apply(withPrototype({
      info() {
        return `"${this.name}" at ${this.address.fullAddress()}`;
      },
    }));

    const user = User.parse({
      name: "John Doe",
      address: {
        street: "123 Main St",
        city: "New York",
      },
    });

    assertEquals(user.address.fullAddress(), "123 Main St, New York");
    assertEquals(user.info(), '"John Doe" at 123 Main St, New York');
  });
});
