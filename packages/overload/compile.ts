/**
 * Ahead-of-time dispatcher compilation for `@chrock-studio/overload`.
 *
 * Turns the ordered matcher list into an arity-specialized function with inlined
 * guards, so a call performs no array allocation, no iterator walk and — for
 * schemas created by {@link check} — no `StandardSchemaV1` result allocation.
 *
 * Generated source only ever contains identifiers derived from slot indices
 * (`s0`, `a0`, …); no runtime value is interpolated into it.
 *
 * This module is excluded from the package export map.
 *
 * @module "@chrock-studio/overload/compile.ts"
 */
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { getFastCheck, internalsOf, warnOnce, type Guard, type MatcherInternals } from "./internal.ts";
import type { Matcher } from "./matcher.ts";

/** A callable dispatcher produced either by compilation or by the interpreter. */
export type Dispatch = (this: unknown, ...args: any[]) => any;

/** Compiled factory: accepts guard/implementation slots and returns a dispatcher. */
type Factory = (...slots: unknown[]) => Dispatch;

/** How a single parameter is checked at dispatch time. */
type GuardKind = "pred" | "validate";

/** Structural description of a single overload branch. */
interface BranchShape {
  /** Guard kind per fixed parameter. */
  readonly fixed: readonly GuardKind[];
  /** Whether the branch validates the remaining arguments with a rest schema. */
  readonly hasRest: boolean;
}

/** Structural description of a whole overloaded function. */
interface Shape {
  readonly branches: readonly BranchShape[];
  readonly hasFallback: boolean;
}

/** Renders a thrown value for a warning message. */
const describe = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

/** Whether code generation from strings has been ruled out for this process. */
let state: "unknown" | "ok" | "blocked" = "unknown";
/** The value thrown while probing (or compiling), when blocked. */
let blocker: unknown;

/**
 * Reports whether `new Function` is usable, probing at most once per process.
 *
 * The probe is deferred until the first AOT request so that merely importing
 * the package never touches the code-generation path.
 */
const available = (): boolean => {
  if (state === "unknown") {
    try {
      new Function("return 1")();
      state = "ok";
    } catch (error) {
      state = "blocked";
      blocker = error;
    }
  }
  if (state === "blocked") {
    warnOnce(
      "unavailable",
      `AOT dispatch is unavailable in this runtime (${describe(blocker)}); falling back to interpreted dispatch.`,
    );
    return false;
  }
  return true;
};

/** Compiled factories keyed by shape; identical shapes share one compilation. */
const factories = new Map<string, Factory>();

/**
 * Builds the cache key for a shape.
 *
 * The key must capture everything that affects the generated source: guard
 * kinds, rest usage, branch order and fallback presence.
 */
const shapeKey = (shape: Shape): string =>
  shape.branches
    .map(
      (branch) => `${branch.fixed.map((kind) => (kind === "pred" ? "p" : "v")).join("")}${branch.hasRest ? "r" : ""}`,
    )
    .join("|") + (shape.hasFallback ? "f" : "");

/** Generated source plus the metadata needed to instantiate it. */
interface CompiledSource {
  readonly source: string;
  readonly arity: number;
  readonly slots: number;
}

/**
 * Emits the factory source for a shape.
 *
 * The generated factory declares one parameter per slot and returns the actual
 * dispatcher, which reads those slots from its closure.
 */
const buildSource = (shape: Shape): CompiledSource => {
  const arity = shape.branches.reduce((max, branch) => Math.max(max, branch.fixed.length), 0);
  const params = Array.from({ length: arity }, (_, index) => `a${index}`).join(", ");
  const lines: string[] = [];
  let slot = 0;

  for (const branch of shape.branches) {
    const guards = branch.fixed.map(() => `s${slot++}`);
    const rest = branch.hasRest ? `s${slot++}` : undefined;
    const implement = `s${slot++}`;
    const condition = guards.map((guard, index) => `${guard}(a${index})`).join(" && ") || "true";

    if (rest === undefined) {
      lines.push(`  if (${condition}) return ${implement}.apply(this, arguments);`);
      continue;
    }

    lines.push(`  if (${condition}) {`);
    lines.push(`    let ok = true;`);
    lines.push(`    for (let i = ${branch.fixed.length}; i < arguments.length; i++) {`);
    lines.push(`      if (!${rest}(arguments[i])) { ok = false; break; }`);
    lines.push(`    }`);
    lines.push(`    if (ok) return ${implement}.apply(this, arguments);`);
    lines.push(`  }`);
  }

  if (shape.hasFallback) {
    lines.push(`  return s${slot++}.apply(this, arguments);`);
  } else {
    lines.push(`  throw new TypeError("No overload matched");`);
  }

  return {
    source: `"use strict";\nreturn function (${params}) {\n${lines.join("\n")}\n};`,
    arity,
    slots: slot,
  };
};

/**
 * Normalizes a schema into a boolean guard.
 *
 * Schemas created by {@link check} expose their raw predicate, so the guard is
 * the predicate itself and no result object is allocated. Any other Standard
 * Schema keeps the exact semantics of `Matcher.check`: a check passes when the
 * validation result's `issues` is falsy.
 */
const guardOf = (schema: StandardSchemaV1): { kind: GuardKind; guard: Guard } => {
  const fast = getFastCheck(schema);
  if (fast !== undefined) {
    return { kind: "pred", guard: fast as Guard };
  }
  return {
    kind: "validate",
    guard: (value) => !(schema["~standard"].validate(value) as StandardSchemaV1.Result<unknown>).issues,
  };
};

/**
 * Compiles a matcher list into a specialized dispatcher.
 *
 * Never throws: when matchers are not real `Matcher` instances, when the
 * runtime forbids code generation, or when compilation fails, it warns once and
 * returns `undefined` so the caller can fall back to interpreted dispatch.
 *
 * @param matchers - Ordered matchers, checked in list order.
 * @param fallback - Optional function invoked when no branch matches.
 * @returns A compiled dispatcher, or `undefined` when AOT dispatch is unavailable.
 */
export const compile = (matchers: readonly Matcher[], fallback?: (...args: any[]) => any): Dispatch | undefined => {
  const internals: MatcherInternals[] = [];
  for (const matcher of matchers) {
    const entry = internalsOf(matcher);
    if (entry === undefined) {
      warnOnce(
        "unsupported-matcher",
        "AOT dispatch requires branches created by Matcher.make(); falling back to interpreted dispatch.",
      );
      return undefined;
    }
    internals.push(entry);
  }

  if (!available()) {
    return undefined;
  }

  const branches: BranchShape[] = [];
  const slots: unknown[] = [];

  for (let index = 0; index < internals.length; index++) {
    const entry = internals[index];
    const fixed: GuardKind[] = [];
    for (const schema of entry.schemas) {
      const { kind, guard } = guardOf(schema);
      fixed.push(kind);
      slots.push(guard);
    }
    if (entry.rest !== undefined) {
      slots.push(guardOf(entry.rest).guard);
    }
    slots.push(matchers[index].implement);
    branches.push({ fixed, hasRest: entry.rest !== undefined });
  }

  if (fallback !== undefined) {
    slots.push(fallback);
  }

  const shape: Shape = { branches, hasFallback: fallback !== undefined };
  const key = shapeKey(shape);
  let factory = factories.get(key);

  if (factory === undefined) {
    const { source, slots: count } = buildSource(shape);
    const names = Array.from({ length: count }, (_, index) => `s${index}`);
    try {
      factory = new Function(...names, source) as Factory;
    } catch (error) {
      state = "blocked";
      blocker = error;
      warnOnce(
        "compile-failed",
        `AOT code generation failed (${describe(error)}); falling back to interpreted dispatch.`,
      );
      return undefined;
    }
    factories.set(key, factory);
  }

  const dispatcher = factory(...slots) as Dispatch;
  Object.defineProperty(dispatcher, "length", { value: 0, configurable: true });
  return dispatcher;
};

/**
 * Overrides the code-generation availability state.
 *
 * Exposed for tests only; production code never calls it.
 *
 * @param next - The state to force.
 * @param error - Optional value reported as the blocking reason.
 */
export const __setAotStateForTest = (next: "unknown" | "ok" | "blocked", error?: unknown): void => {
  state = next;
  blocker = next === "blocked" ? error : undefined;
};
