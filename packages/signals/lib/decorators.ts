/**
 * @module decorators
 * @description
 * This module provides TypeScript decorator utilities for signal-based reactive programming.
 * It exports decorator types and implementations that work with the alien-signals library,
 * enabling reactive state management through class decorators.
 *
 * The module defines:
 * - Type definitions for various class decorator patterns (getter, setter, accessor, method, class)
 * - Implementation of `readonly` decorator for computed signals from getters
 * - Implementation of `writable` decorator for reactive accessors
 * - A unified `signalization` decorator that handles both getters and accessors
 */

import { computed, signal } from "alien-signals";
import { map } from "./utils";
import type { Computed, Signal } from "./types";

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
export type ClassGetterDecorator = <This extends {}, Value = unknown>(
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
export type ClassSetterDecorator = <This extends {}, Value = unknown>(
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
export type ClassAccessorDecorator = <This extends {}, Value = unknown>(
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
  This extends {},
  Value extends (this: This, ...args: any) => any,
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
export type ClassDecorator = <Class extends abstract new (...args: any) => any>(
  target: Class,
  context: ClassDecoratorContext<Class>,
) => Class | void;

/**
 * Readonly decorator implementation for getter methods.
 *
 * This decorator transforms a getter into a reactive computed signal.
 * It uses a WeakMap to cache the computed signal per instance, ensuring
 * each class instance has its own reactive computation.
 *
 * The computed signal automatically tracks dependencies and re-evaluates
 * when any dependency changes, providing efficient reactive updates.
 *
 * @typeParam This - The class type containing the decorated getter
 * @typeParam Value - The return type of the getter
 *
 * @param target - The original getter function
 * @returns A new getter function that returns a computed signal value
 *
 * @internal
 *
 * @example
 * ```typescript
 * class Example {
 *   name = signal("World");
 *
 *   // Creates a computed signal that tracks name changes
 *   @readonly
 *   get greeting() {
 *     return `Hello, ${this.name()}!`;
 *   }
 * }
 * ```
 */
const readonly: ClassGetterDecorator = <This extends {}, Value = unknown>(
  target: (this: This) => Value,
) => {
  // WeakMap stores computed signals per instance, allowing garbage collection
  // when instances are no longer referenced
  const caches = new WeakMap<This, Computed<Value>>();

  return function (this: This) {
    // Get or create cached computed signal for this instance
    // The factory function creates the computed signal on first access
    return map.get(caches, this, () => computed(target.bind(this)))();
  };
};

/**
 * Writable decorator implementation for accessor properties.
 *
 * This decorator transforms an accessor into a reactive signal with both
 * getter and setter capabilities. It maintains a signal cache per instance
 * and provides reactive read/write access to the property value.
 *
 * The getter creates or retrieves a signal, while the setter updates
 * the signal's value, triggering reactive updates to dependents.
 *
 * @typeParam This - The class type containing the decorated accessor
 * @typeParam Value - The type of the accessor's value
 *
 * @param target - The original accessor with get/set methods
 * @returns An accessor decorator result with reactive get/set behavior
 *
 * @internal
 *
 * @example
 * ```typescript
 * class Counter {
 *   // Creates a writable signal that tracks count changes
 *   @writable
 *   accessor count = 0;
 * }
 *
 * const c = new Counter();
 * c.count = 5; // Triggers reactive update
 * console.log(c.count); // Returns 5
 * ```
 */
const writable: ClassAccessorDecorator = <This extends {}, Value = unknown>(
  target: ClassAccessorDecoratorTarget<This, Value>,
): ClassAccessorDecoratorResult<This, Value> => {
  // WeakMap stores signal instances per instance for reactive state
  const caches = new WeakMap<This, Signal<Value>>();

  return {
    // Getter: retrieves or creates a signal, then returns its current value
    get(this) {
      return map.get(caches, this, () => signal(target.get.apply(this)))();
    },
    // Setter: retrieves or creates a signal, then updates its value
    set(this, value) {
      map.get(caches, this, () => signal(target.get.apply(this)))(value);
    },
  };
};

/**
 * Unified signalization decorator for getters and accessors.
 *
 * This is the main exported decorator that automatically detects the
 * decoration target type (getter or accessor) and applies the appropriate
 * transformation:
 * - For 'accessor': applies the `writable` decorator for reactive read/write
 * - For 'getter': applies the `readonly` decorator for computed signals
 *
 * The decorator uses runtime type checking via the `kind` property to
 * determine which decoration strategy to apply.
 *
 * @typeParam This - The class type being decorated
 * @typeParam Value - The type of the decorated property
 *
 * @param args - Variable arguments matching either writable or readonly decorator signature
 * @returns Decorated result based on the target kind
 * @throws {TypeError} If the decoration target is neither 'accessor' nor 'getter'
 *
 * @example
 * ```typescript
 * class State {
 *   // Readonly computed signal from getter
 *   @signalization
 *   get fullName() {
 *     return `${this.first} ${this.last}`;
 *   }
 *
 *   // Writable signal from accessor
 *   @signalization
 *   accessor count = 0;
 * }
 * ```
 */
export const signalization = ((...args) => {
  // Cast args[1] to access the kind property for type-safe discrimination
  const context = args[1];

  // Check the decoration target kind to determine strategy
  switch (context.kind) {
    case "accessor":
      // Apply writable decorator for accessor properties
      return writable(...(args as Parameters<typeof writable>));
    case "getter":
      // Apply readonly decorator for getter methods
      return readonly(...(args as Parameters<typeof readonly>));
    default:
      // Throw error for unsupported decoration targets
      throw new TypeError(
        `signalization decorator only supports 'accessor' or 'getter', got '${(context as { kind: string }).kind}'`,
      );
  }
}) as typeof readonly & typeof writable;
