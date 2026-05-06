/**
 * Filter operators for collection queries.
 *
 * Provides a set of composable filter operators that can be used
 * with {@link Collection.find} to build typed query conditions.
 *
 * @module "@chrock-studio/sql-kv/filter"
 */

import type { Filter, SQLInputValue } from "./types.ts";

// ---------------------------------------------------------------------------
// Internal filter implementations
// ---------------------------------------------------------------------------

class ComparisonFilter implements Filter {
  constructor(
    private readonly operator: string,
    private readonly value: SQLInputValue,
  ) {}

  toSQL(path: string): { where: string; params: SQLInputValue[] } {
    return { where: `${path} ${this.operator} ?`, params: [this.value] };
  }
}

class InFilter implements Filter {
  constructor(private readonly values: SQLInputValue[]) {}

  toSQL(path: string): { where: string; params: SQLInputValue[] } {
    const placeholders = this.values.map(() => "?").join(", ");
    return { where: `${path} IN (${placeholders})`, params: [...this.values] };
  }
}

class NotInFilter implements Filter {
  constructor(private readonly values: SQLInputValue[]) {}

  toSQL(path: string): { where: string; params: SQLInputValue[] } {
    const placeholders = this.values.map(() => "?").join(", ");
    return { where: `${path} NOT IN (${placeholders})`, params: [...this.values] };
  }
}

class BetweenFilter implements Filter {
  constructor(
    private readonly a: SQLInputValue,
    private readonly b: SQLInputValue,
  ) {}

  toSQL(path: string): { where: string; params: SQLInputValue[] } {
    return { where: `${path} BETWEEN ? AND ?`, params: [this.a, this.b] };
  }
}

class LikeFilter implements Filter {
  constructor(private readonly pattern: string) {}

  toSQL(path: string): { where: string; params: SQLInputValue[] } {
    return { where: `${path} LIKE ?`, params: [this.pattern] };
  }
}

class LogicalFilter implements Filter {
  constructor(
    private readonly operator: "AND" | "OR",
    private readonly filters: Filter[],
  ) {}

  toSQL(path: string): { where: string; params: SQLInputValue[] } {
    if (this.filters.length === 0) {
      return { where: "TRUE", params: [] };
    }
    const parts = this.filters.map((f) => f.toSQL(path));
    return {
      where: `(${parts.map((p) => p.where).join(` ${this.operator} `)})`,
      params: parts.flatMap((p) => p.params),
    };
  }
}

class IsNullFilter implements Filter {
  toSQL(path: string): { where: string; params: SQLInputValue[] } {
    return { where: `${path} IS NULL`, params: [] };
  }
}

class IsNotNullFilter implements Filter {
  toSQL(path: string): { where: string; params: SQLInputValue[] } {
    return { where: `${path} IS NOT NULL`, params: [] };
  }
}

// ---------------------------------------------------------------------------
// Public filter factories
// ---------------------------------------------------------------------------

/**
 * Create a filter that checks for equality.
 *
 * @param value - The value to compare against
 * @returns A {@link Filter} instance
 *
 * @example
 * ```ts
 * kv.eq("John")
 * kv.eq(42)
 * ```
 */
export function eq(value: SQLInputValue): Filter {
  return new ComparisonFilter("==", value);
}

/**
 * Create a filter that checks for inequality.
 *
 * @param value - The value to compare against
 * @returns A {@link Filter} instance
 */
export function neq(value: SQLInputValue): Filter {
  return new ComparisonFilter("!=", value);
}

/**
 * Create a filter that checks if a value is strictly less than the given value.
 *
 * @param value - The upper bound (exclusive)
 * @returns A {@link Filter} instance
 *
 * @example
 * ```ts
 * kv.lt(20)  // age < 20
 * ```
 */
export function lt(value: SQLInputValue): Filter {
  return new ComparisonFilter("<", value);
}

/**
 * Create a filter that checks if a value is less than or equal to the given value.
 *
 * @param value - The upper bound (inclusive)
 * @returns A {@link Filter} instance
 */
export function lte(value: SQLInputValue): Filter {
  return new ComparisonFilter("<=", value);
}

/**
 * Create a filter that checks if a value is strictly greater than the given value.
 *
 * @param value - The lower bound (exclusive)
 * @returns A {@link Filter} instance
 *
 * @example
 * ```ts
 * kv.gt(18)  // age > 18
 * ```
 */
export function gt(value: SQLInputValue): Filter {
  return new ComparisonFilter(">", value);
}

/**
 * Create a filter that checks if a value is greater than or equal to the given value.
 *
 * @param value - The lower bound (inclusive)
 * @returns A {@link Filter} instance
 */
export function gte(value: SQLInputValue): Filter {
  return new ComparisonFilter(">=", value);
}

/**
 * Create a filter that matches a value against a regular expression.
 *
 * @param pattern - The regex pattern string (database-specific syntax)
 * @returns A {@link Filter} instance
 *
 * @example
 * ```ts
 * kv.regexp("[^@]+@.+\\..+")  // match email-like strings
 * ```
 */
export function regexp(pattern: string): Filter {
  return new ComparisonFilter("REGEXP", pattern);
}

/**
 * Create a filter that checks if a value is in the given list.
 *
 * @param values - The list of values to match against
 * @returns A {@link Filter} instance
 *
 * @example
 * ```ts
 * kv.isIn(["New York", "Washington"])
 * ```
 */
export function isIn(values: SQLInputValue[]): Filter {
  return new InFilter(values);
}

/**
 * Create a filter that checks if a value is NOT in the given list.
 *
 * @param values - The list of values to exclude
 * @returns A {@link Filter} instance
 */
export function notIn(values: SQLInputValue[]): Filter {
  return new NotInFilter(values);
}

/**
 * Create a filter that checks if a value is between two values (inclusive).
 *
 * @param a - The lower bound
 * @param b - The upper bound
 * @returns A {@link Filter} instance
 *
 * @example
 * ```ts
 * kv.between(18, 65)  // age between 18 and 65
 * ```
 */
export function between(a: SQLInputValue, b: SQLInputValue): Filter {
  return new BetweenFilter(a, b);
}

/**
 * Create a filter that matches a value against a LIKE pattern.
 *
 * @param pattern - The LIKE pattern (e.g., `"John%"`)
 * @returns A {@link Filter} instance
 */
export function like(pattern: string): Filter {
  return new LikeFilter(pattern);
}

/**
 * Combine multiple filters with logical OR.
 *
 * @param filters - The filters to combine
 * @returns A {@link Filter} instance
 *
 * @example
 * ```ts
 * kv.or(kv.eq("New York"), kv.eq("Washington"))
 * ```
 */
export function or(...filters: Filter[]): Filter {
  return new LogicalFilter("OR", filters);
}

/**
 * Combine multiple filters with logical AND.
 *
 * @param filters - The filters to combine
 * @returns A {@link Filter} instance
 */
export function and(...filters: Filter[]): Filter {
  return new LogicalFilter("AND", filters);
}

/**
 * Create a filter that checks if a value is NULL.
 *
 * @returns A {@link Filter} instance
 */
export function isNull(): Filter {
  return new IsNullFilter();
}

/**
 * Create a filter that checks if a value is NOT NULL.
 *
 * @returns A {@link Filter} instance
 */
export function isNotNull(): Filter {
  return new IsNotNullFilter();
}
