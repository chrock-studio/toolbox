/**
 * Utilities for type-check.
 * @module
 */

/**
 * Expands the given type `<T>` if it is an `object` type.
 *
 * This type alias forces TypeScript to expand object types, making their
 * properties visible in type hints. This is particularly useful when type
 * inference produces overly generic or wrapped types.
 *
 * @typeParam T - The type to expand.
 * @returns If `T` is an object, returns the expanded object type; otherwise returns the original type.
 *
 * @example
 * ```ts
 * type Example = Flatten<{ a: number } & { b: string }>;
 * // Result: { a: number; b: string }
 * ```
 *
 * @example
 * ```ts
 * type Primitive = Flatten<number>;
 * // Result: number
 * ```
 */
export type Flatten<T> = T extends object ? { [key in keyof T]: T[key] } : T;

/**
 * A union type representing either `Promise<T>` or `T`.
 *
 * Used for handling values that may be synchronous or asynchronous,
 * commonly seen in function return values or callbacks.
 *
 * @typeParam T - The type of the value.
 *
 * @example
 * ```ts
 * function process<T>(value: MaybePromise<T>): Promise<T> {
 *   return Promise.resolve(value);
 * }
 * ```
 */
export type MaybePromise<T> = T | PromiseLike<T>;

/**
 * A type representing an empty object.
 *
 * Used to define object types without any specific properties,
 * commonly used as a base type or placeholder.
 *
 * @example
 * ```ts
 * const empty: EmptyData = {};
 * ```
 */
export type EmptyData = Record<PropertyKey, unknown>;

/**
 * A getter function type.
 *
 * A function with no parameters that returns a value of type `T`.
 * Commonly used for implementing lazy evaluation or reading values in reactive systems.
 *
 * @typeParam T - The type of the return value.
 *
 * @example
 * ```ts
 * const getValue: Getter<number> = () => 42;
 * console.log(getValue()); // 42
 * ```
 */
export type Getter<T> = () => T;

/**
 * A type that may be a getter function or a direct value.
 *
 * Allows passing either a value or a function that returns that value,
 * providing greater flexibility. Commonly used in API design to allow
 * users to optionally use lazy evaluation.
 *
 * @typeParam T - The type of the value.
 *
 * @example
 * ```ts
 * function resolve<T>(value: MaybeGetter<T>): T {
 *   return typeof value === 'function' ? (value as Getter<T>)() : value;
 * }
 *
 * resolve(42);        // Direct value
 * resolve(() => 42); // Getter function
 * ```
 */
export type MaybeGetter<T> = T | Getter<T>;

/**
 * A setter function type.
 *
 * A function that accepts a parameter of type `T` and returns void.
 * Commonly used for updating values in reactive systems.
 *
 * @typeParam T - The type of the value to set.
 *
 * @example
 * ```ts
 * let count = 0;
 * const setCount: Setter<number> = (value) => { count = value; };
 * setCount(10);
 * console.log(count); // 10
 * ```
 */
export type Setter<T> = (value: T) => void;

/**
 * A mapper function type.
 *
 * A function that accepts a parameter of type `T` and returns a value of type `R`.
 * Commonly used for data transformation or computing derived values in reactive systems.
 *
 * @typeParam T - The type of the input value.
 * @typeParam R - The type of the output value.
 *
 * @example
 * ```ts
 * const double: Mapper<number, number> = (x) => x * 2;
 * console.log(double(5)); // 10
 * ```
 */
export type Mapper<T, R> = (value: T) => R;

/**
 * A type that may be a mapper function or a direct value.
 *
 * Allows passing either a mapper function or a direct value,
 * providing greater flexibility. Commonly used in API design to
 * allow users to optionally provide transformation logic or direct results.
 *
 * @typeParam T - The type of the input value (for mapper function).
 * @typeParam R - The type of the output value.
 *
 * @example
 * ```ts
 * function apply<T, R>(value: T, mapper: MaybeMapper<T, R>): R {
 *   return typeof mapper === 'function' ? (mapper as Mapper<T, R>)(value) : mapper;
 * }
 *
 * apply(5, (x) => x * 2);  // Using mapper function, result: 10
 * apply(5, 100);           // Using direct value, result: 100
 */
export type MaybeMapper<T, R> = R | Mapper<T, R>;
