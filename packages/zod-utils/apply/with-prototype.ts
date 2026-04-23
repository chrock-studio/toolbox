import type zod from "zod";

/**
 * Adds a prototype to a target schema. Can only be used with schemas whose output is an `object`.
 *
 * @module "@chrock-studio/zod-utils/apply/with-prototype.ts"
 *
 * @example Using with `.apply()`
 *
 * ```typescript
 * import { withPrototype } from "@chrock-studio/zod-utils/apply";
 *
 * const User = z.object({
 *   name: z.string(),
 *   age: z.int(),
 * }).apply(withPrototype({
 *   info() {
 *     return `"${this.name}" (${this.age})`;
 *   },
 * }));
 *
 * const user = User.decode({
 *   name: "John Doe",
 *   age: 18
 * });
 * console.log(user.info()); // -> "John Doe" (18)
 * ```
 *
 * @example Using without `.apply()`
 *
 * ```typescript
 * import { withPrototype } from "@chrock-studio/zod-utils/apply";
 *
 * const User = withPrototype(
 *   z.object({
 *     name: z.string(),
 *     age: z.int(),
 *   }),
 *   {
 *     info() {
 *       return `"${this.name}" (${this.age})`;
 *     },
 *   },
 * );
 *
 * const user = User.decode({
 *   name: "John Doe",
 *   age: 18
 * });
 * console.log(user.info()); // -> "John Doe" (18)
 * ```
 */
export const withPrototype = ((
  ...args: [schema: zod.ZodType<object>, methods: object] | [methods: object]
) => {
  if (args.length === 1) {
    return (schema: zod.ZodType<object>) => withPrototype(schema, args[0]);
  } else {
    return args[0].overwrite((x) => Object.setPrototypeOf(x, args[1]));
  }
}) as {
  /**
   * This function enhances Zod object schemas by adding prototype methods to their output.
   * It supports both curried and direct usage patterns.
   *
   * @param schema - The Zod schema to enhance (when using two-argument form)
   * @param methods - The prototype methods to add to the schema output
   * @returns An enhanced Zod schema with prototype methods
   *
   * @example
   * ```typescript
   * import { withPrototype } from "@chrock-studio/zod-utils/apply";
   *
   * const User = withPrototype(
   *   z.object({
   *     name: z.string(),
   *     age: z.int(),
   *   }),
   *   {
   *     info() {
   *       return `"${this.name}" (${this.age})`;
   *     },
   *   },
   * );
   *
   * const user = User.decode({
   *   name: "John Doe",
   *   age: 18
   * });
   * console.log(user.info()); // -> "John Doe" (18)
   * ```
   */
  <
    O extends object,
    I extends unknown,
    M extends object,
    T extends zod.util.Extend<O, M>,
  >(
    schema: zod.ZodType<O, I>,
    methods: M & ThisType<T>,
  ): zod.ZodType<T, I>;

  /**
   * Enhances a Zod schema by adding prototype methods to its output objects.
   * Supports both curried and direct invocation patterns.
   *
   * @param args - Either a single methods object (curried form) or schema and methods (direct form)
   * @returns An enhanced Zod schema with prototype methods
   *
   * @example
   * ```typescript
   * import { withPrototype } from "@chrock-studio/zod-utils/apply";
   *
   * const User = z.object({
   *   name: z.string(),
   *   age: z.int(),
   * }).apply(withPrototype({
   *   info() {
   *     return `"${this.name}" (${this.age})`;
   *   },
   * }));
   *
   * const user = User.decode({
   *   name: "John Doe",
   *   age: 18
   * });
   * console.log(user.info()); // -> "John Doe" (18)
   * ```
   */
  <
    O extends object,
    I extends unknown,
    M extends object,
    T extends zod.util.Extend<O, M>,
  >(
    methods: M & ThisType<T>,
  ): (schema: zod.ZodType<O, I>) => zod.ZodType<T, I>;
};
