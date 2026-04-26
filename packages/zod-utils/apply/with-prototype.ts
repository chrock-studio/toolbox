import type zod from "zod";
import type * as hkt from "hkt-core";

/**
 * A Higher-Kinded Type (HKT) that customizes the return type of {@link withPrototype}.
 *
 * This interface accepts three type arguments:
 * - `input`: The input type of the original Zod schema
 * - `output`: The output type after applying prototype methods
 * - `methods`: The prototype methods object
 *
 * By extending this interface and overriding `return`, you can control the exact
 * Zod type returned by `withPrototype`, which is useful for preserving specific
 * schema types (such as `z.ZodObject`) when chaining multiple prototype layers.
 *
 * @example Extending `Overwrite` to preserve `z.ZodObject` type
 * ```typescript
 * const shape = {
 *   name: z.string(),
 *   age: z.number(),
 * };
 *
 * interface UserOverwrite extends Overwrite {
 *   return: z.ZodObject<
 *     typeof shape,
 *     Overwrite.Methods<this> extends infer O ? z.core.$strip & { out: O } : never
 *   >;
 * }
 *
 * const User = z.object(shape)
 *   .apply(
 *     withPrototype.assert<UserOverwrite>()({
 *       info() {
 *         return `"${this.name}" (Age: ${this.age})`;
 *       },
 *     },
 *   ),
 * );
 * ```
 */
export interface Overwrite extends hkt.TypeLambda<[input: unknown, output: object, methods: object], zod.ZodType> {
}

export declare namespace Overwrite {
  /**
   * Extracts the input type parameter (`Arg0`) from an {@link Overwrite} HKT.
   *
   * @template O - The `Overwrite` HKT to extract from
   */
  export type Input<O extends Overwrite> = hkt.Arg0<O>;

  /**
   * Extracts the output type parameter (`Arg1`) from an {@link Overwrite} HKT.
   *
   * @template O - The `Overwrite` HKT to extract from
   */
  export type Output<O extends Overwrite> = hkt.Arg1<O>;

  /**
   * Extracts the methods type parameter (`Arg2`) from an {@link Overwrite} HKT.
   *
   * @template O - The `Overwrite` HKT to extract from
   */
  export type Methods<O extends Overwrite> = hkt.Arg2<O>;

  /**
   * The default implementation of {@link Overwrite}.
   *
   * Returns a plain `zod.ZodType<Output, Input>`, which is suitable for most
   * use cases. When you need to preserve a more specific Zod type (e.g.
   * `z.ZodObject`), extend {@link Overwrite} directly instead.
   */
  export interface Default extends Overwrite {
    return: zod.ZodType<Output<this>, Input<this>>;
  }
}

export interface WithPrototype<P extends Overwrite = Overwrite.Default> {
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
  ): /** @ts-expect-error -- It's OK! */
  hkt.Apply<P, [I, T, M]>;

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
  ): /** @ts-expect-error -- It's OK! */
  (schema: zod.ZodType<O, I>) => hkt.Apply<P, [I, T, M]>;

  assert<T extends Overwrite>(): WithPrototype<T>;
}

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
 *     // Also supports getter and setter
 *     get info() {
 *       return `"${this.name}" (${this.age})`;
 *     },
 *   },
 * );
 *
 * const user = User.decode({
 *   name: "John Doe",
 *   age: 18
 * });
 * console.log(user.info); // -> "John Doe" (18)
 * ```
 *
 * @example Using with prototype-chain
 *
 * ```typescript
 * const User = (z.object({
 *   name: z.string(),
 *   age: z.number(),
 * }).apply(withPrototype({
 *   info() {
 *     return `"${this.name}" (Age: ${this.age})`;
 *   },
 * })) as z.ZodObject<{ name: z.ZodString; age: z.ZodNumber }, { in: {}; out: { info(): string } }>)
 * .extend({
 *   length: z.number(),
 * }).apply(withPrototype({
 *   fullInformation() {
 *     return `${this.info()} (Length: ${this.length})`;
 *   },
 * }));
 *
 * const user = User.decode({
 *   name: "John Doe",
 *   age: 18,
 *   length: 160,
 * });
 *
 * assertEquals(user.info(), '"John Doe" (Age: 18)');
 * assertEquals(user.fullInformation(), '"John Doe" (Age: 18) (Length: 160)');
 * ```
 */
export const withPrototype = ((
  ...args: [schema: zod.ZodType<object>, methods: object] | [methods: object]
) => {
  if (args.length === 1) {
    return (schema: zod.ZodType<object>) => withPrototype(schema, args[0]);
  } else {
    return args[0].overwrite((x) => {
      // 获取当前对象的现有原型
      const proto = Object.getPrototypeOf(x);
      // 如果现有原型存在且不是默认的 Object.prototype，说明对象已有自定义原型链
      if (proto !== null && proto !== Object.prototype) {
        // 提取 methods 中所有属性的描述符
        const descriptors = Object.getOwnPropertyDescriptors(args[1]);
        // 创建一个新对象作为原型，将 methods 属性定义其上，并将其原型指向旧原型，从而保留整条原型链
        const newProto = Object.setPrototypeOf(Object.defineProperties({}, descriptors), proto);
        // 将当前对象的原型替换为“新方法+旧原型链”的复合原型
        return Object.setPrototypeOf(x, newProto);
      } else {
        // 若对象没有自定义原型，则直接将原型设为 methods 对象
        return Object.setPrototypeOf(x, args[1]);
      }
    });
  }
}) as WithPrototype;
withPrototype.assert = (() => withPrototype) as WithPrototype["assert"];
