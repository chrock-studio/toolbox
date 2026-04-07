/**
 * Zod utilities library providing enhanced functionality for Zod schemas.
 *
 * @module "@chrock-studio/zod-utils"
 *
 * This module includes:
 * - `apply` utilities: Add prototype methods and other enhancements to Zod schemas
 *
 * @example Using withPrototype to add methods to objects
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
 */
export * from "./apply/mod.ts";
