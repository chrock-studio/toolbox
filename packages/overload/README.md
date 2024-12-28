# `@chrock-studio/overload`

A simple and lightweight library for overloading functions in TypeScript.

## What is `@chrock-studio/overload`?

`@chrock-studio/overload` is a TypeScript library that allows you to create functions that can be overloaded with different argument schemas. It provides a convenient way to define multiple versions of a function that can handle different types and combinations of arguments.

- Supports
  - `valibot`
  - `zod`
  - `legacy` (custom schema)

## Usage

To use `@chrock-studio/overload`, follow these steps:

1. Install `@chrock-studio/overload` as a dependency in your project:

    ```bash
    npm install @chrock-studio/overload
    ```

    and install the schema library of your choice:

    ```bash
    npm install valibot # if you want to use valibot
    ```

    ```bash
    npm install zod # if you want to use zod
    ```

    and if you want to use `legacy` schema, you can import it from `@chrock-studio/overload/legacy`.

2. Import `@chrock-studio/overload` into your TypeScript file:

    ```typescript
    import { overload } from "@chrock-studio/overload";
    ```

3. Define your overloaded function using the `overload`:

    ```typescript
    // with valibot
    import * as v from "valibot";
    import { valibot } from "@chrock-studio/overload";

    const MailSchema = v.object({
      to: v.pipe(
        v.string(),
        v.trim(),
        v.email()
      ),
      subject: v.string(),
      body: v.string(),
    });

    const overloadedFn = valibot([v.string(), v.number()], (a, b) => {
      // Function implementation for string and number arguments
      })
      .valibot([v.number(), v.string()], (a, b) => {
      // Function implementation for number and string arguments
      })
      .valibot([MailSchema], (mail) => {
      // Function implementation for MailSchema arguments
      });
    ```

    ```typescript
    // with zod
    import * as z from "zod";
    import { zod } from "@chrock-studio/overload";

    const MailSchema = z.object({
      to: z.string().email(),
      subject: z.string(),
      body: z.string(),
    });

    const overloadedFn = zod([z.string(), z.number()], (a, b) => {
      // Function implementation for string and number arguments
      })
      .zod([z.number(), z.string()], (a, b) => {
      // Function implementation for number and string arguments
      })
      .zod([MailSchema], (mail) => {
      // Function implementation for MailSchema arguments
      });
    ```

4. Call the overloaded function with the appropriate arguments:

    ```typescript
    overloadedFn("hello", 123); // Calls the first overload
    overloadedFn(123, "hello"); // Calls the second overload
    overloadedFn({ to: "juergenie@mock.mail", subject: "Hello", body: "World" }); // Calls the third overload
    ```

    The function will execute the implementation that matches the types and order of the arguments.

5. Enjoy the flexibility of overloaded functions in TypeScript!

For more information on how to define schemas and handle different argument types, refer to the [valibot](https://valibot.dev/)/[zod](https://zod.dev/)'s documentation.
