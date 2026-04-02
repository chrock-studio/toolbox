/**
 * Utilities for type-checks of `ECMAScript proposal decorators (stage 3)`.
 *
 * @module "@chrock-studio/signals/decorators/types"
 */

/**
 * Type definition for a class getter decorator.
 *
 * A getter decorator transforms a class getter method into a reactive computed signal.
 * It wraps the getter's return value with signal reactivity, allowing automatic
 * dependency tracking and updates when dependencies change.
 *
 * @typeParam This - The class type that contains the decorated getter
 * @typeParam Value - The return type of the getter
 *
 * @param target - The original getter function that returns a value
 * @param context - Metadata about the getter being decorated
 * @returns Either a modified getter function or void (if modifying in place)
 */
export type ClassGetterDecorator = <
  This extends object,
  Value = unknown,
>(
  target: (this: This) => Value,
  context: ClassGetterDecoratorContext<This, Value>,
) => ((this: This) => Value) | void;

/**
 * Type definition for a class setter decorator.
 *
 * A setter decorator modifies the behavior of a class setter method,
 * enabling reactive updates when values are assigned.
 *
 * @typeParam This - The class type that contains the decorated setter
 * @typeParam Value - The type of value being set
 *
 * @param target - The original setter function that accepts a value
 * @param context - Metadata about the setter being decorated
 * @returns Either a modified setter function or void (if modifying in place)
 */
export type ClassSetterDecorator = <
  This extends object,
  Value = unknown,
>(
  target: (this: This, value: Value) => void,
  context: ClassSetterDecoratorContext<This, Value>,
) => ((this: This, value: Value) => void) | void;

/**
 * Type definition for a class accessor decorator.
 *
 * An accessor decorator replaces both getter and setter with reactive versions.
 * It provides full control over property access and assignment, enabling
 * bidirectional reactive bindings.
 *
 * @typeParam This - The class type that contains the decorated accessor
 * @typeParam Value - The type of the accessor's value
 *
 * @param target - The original accessor object containing get/set methods
 * @param context - Metadata about the accessor being decorated
 * @returns A result object that can replace the original accessor behavior
 */
export type ClassAccessorDecorator = <
  This extends object,
  Value = unknown,
>(
  target: ClassAccessorDecoratorTarget<This, Value>,
  context: ClassAccessorDecoratorContext<This, Value>,
) => ClassAccessorDecoratorResult<This, Value>;

/**
 * Type definition for a class method decorator.
 *
 * A method decorator modifies class methods, potentially wrapping them
 * with additional behavior like logging, validation, or signal tracking.
 *
 * @typeParam This - The class type that contains the decorated method
 * @typeParam Value - The function type of the method
 *
 * @param target - The original method function
 * @param context - Metadata about the method being decorated
 * @returns Either a modified method function or void (if modifying in place)
 */
export type ClassMethodDecorator = <
  This extends object,
  Value extends (this: This, ...args: any[]) => any,
>(
  target: Value,
  context: ClassMethodDecoratorContext<This, Value>,
) => Value | void;

/**
 * Type definition for a class decorator.
 *
 * A class decorator operates on the entire class constructor,
 * enabling modifications to the class prototype or static members.
 *
 * @typeParam Class - The class constructor type being decorated
 *
 * @param target - The class constructor function
 * @param context - Metadata about the class being decorated
 * @returns Either a modified class constructor or void (if modifying in place)
 */
export type ClassDecorator = <
  Class extends abstract new (...args: any) => any,
>(
  target: Class,
  context: ClassDecoratorContext<Class>,
) => Class | void;
