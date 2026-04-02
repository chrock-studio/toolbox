import type { ClassAccessorDecorator, ClassGetterDecorator } from "./types.ts";
import type { Computed, Signal } from "../types.ts";
import { computed, signal } from "alien-signals";

const readonly: ClassGetterDecorator = <This extends object, Value = unknown>(
  target: (this: This) => Value,
) => {
  const caches = new WeakMap<This, Computed<Value>>();

  return function (this: This) {
    return caches.getOrInsertComputed(this, () => computed(target.bind(this)))();
  };
};

const writable: ClassAccessorDecorator = <This extends object, Value = unknown>(
  target: ClassAccessorDecoratorTarget<This, Value>,
): ClassAccessorDecoratorResult<This, Value> => {
  const caches = new WeakMap<This, Signal<Value>>();

  return {
    init(this, value) {
      caches.getOrInsertComputed(this, () => signal(value))(value);
      return value;
    },
    get(this) {
      return caches.getOrInsertComputed(this, () => signal(target.get.apply(this)))();
    },
    set(this, value) {
      caches.getOrInsertComputed(this, () => signal(target.get.apply(this)))(value);
    },
  };
};

/**
 * Decorator for `Accessor` and `Getter`.
 *
 * @example
 * ```typescript
 * class State {
 *   // Writable signal from accessor
 *   \@signalization
 *   accessor count = 0;
 *
 *   \@signalization
 *   accessor firstName = "John";
 *   \@signalization
 *   accessor lastName = "Doe";
 *
 *   // Readonly computed signal from getter
 *   \@signalization
 *   get fullName() {
 *     return `${this.firstName} ${this.lastName}`;
 *   }
 * }
 * ```
 *
 * @module "@chrock-studio/signals/decorators"
 */
export const signalization = ((...args) => {
  const context = args[1];
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
