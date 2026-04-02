/**
 * Utilities for type-checks of `alien-signals`.
 * @module "@chrock-studio/signals/types"
 */
import type { computed, signal } from "alien-signals";

/**
 * `ReturnType<typeof signal<T>>`
 */
export type Signal<T> = ReturnType<typeof signal<T>>;
/**
 * `ReturnType<typeof computed<T>>`
 */
export type Computed<T> = ReturnType<typeof computed<T>>;
