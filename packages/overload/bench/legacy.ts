/**
 * Frozen copy of the interpreted dispatcher shipped in `0.2.0`.
 *
 * It is kept verbatim so benchmark numbers stay comparable even if the
 * production interpreter is optimized later. Do not import it outside `bench/`.
 */
import type { Matcher } from "../matcher.ts";

/**
 * Builds the `0.2.0` dispatcher for a matcher list.
 *
 * @param matchers - Matchers in dispatch order.
 * @param fallback - Optional fallback for unmatched calls.
 * @returns The interpreted callable.
 */
export const legacyDispatch = (matchers: Matcher[], fallback?: (...args: any[]) => any) =>
  function (this: unknown, ...args: any[]): any {
    let fn = fallback;

    for (const matcher of matchers) {
      if (matcher.check(args)) {
        fn = matcher.implement;
        break;
      }
    }

    if (fn) {
      return fn.apply(this, args);
    } else {
      throw new TypeError("No overload matched");
    }
  };
