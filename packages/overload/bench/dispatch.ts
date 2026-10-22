/**
 * Dispatch micro-benchmark for `@chrock-studio/overload`.
 *
 * Compares the frozen `0.2.0` interpreter, the current interpreter and the
 * ahead-of-time compiled dispatcher produced by `fn.aot()`.
 *
 * Run with `bun run bench`. For a V8 comparison, run the same scenarios through
 * `node --input-type=module` (Node 26 strips TypeScript natively).
 */
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { check } from "../checker.ts";
import { Overload } from "../overload.ts";
import { legacyDispatch } from "./legacy.ts";

type AnyFn = (...args: any[]) => any;

/** Calls the AOT counterpart of an overloaded function. */
const toAot = (fn: AnyFn): AnyFn => (fn as unknown as { aot: () => AnyFn }).aot();

/** Prevents the JIT from discarding benchmarked calls. */
let sinkValue = 0;
const sink = (value: unknown): void => {
  sinkValue += typeof value === "number" ? value : 1;
};

/** Returns the median of a numeric sample list. */
const median = (samples: number[]): number => [...samples].sort((a, b) => a - b)[Math.floor(samples.length / 2)];

const ROUNDS = 5;
const WARMUP = 100_000;

/** Benchmarks a single-argument call, alternating a matching string and number. */
const time1 = (fn: AnyFn, iters: number): number => {
  const samples: number[] = [];
  for (let round = 0; round < ROUNDS; round++) {
    for (let i = 0; i < WARMUP; i++) sink((i & 1) === 0 ? fn("s") : fn(7));
    const start = Bun.nanoseconds();
    for (let i = 0; i < iters; i++) sink((i & 1) === 0 ? fn("s") : fn(7));
    samples.push((Bun.nanoseconds() - start) / iters);
  }
  return median(samples);
};

/** Benchmarks a two-argument call. */
const time2 = (fn: AnyFn, iters: number): number => {
  const samples: number[] = [];
  for (let round = 0; round < ROUNDS; round++) {
    for (let i = 0; i < WARMUP; i++) sink((i & 1) === 0 ? fn("s", 1) : fn(7, 3));
    const start = Bun.nanoseconds();
    for (let i = 0; i < iters; i++) sink((i & 1) === 0 ? fn("s", 1) : fn(7, 3));
    samples.push((Bun.nanoseconds() - start) / iters);
  }
  return median(samples);
};

/** Benchmarks a call with rest parameters. */
const timeRest = (fn: AnyFn, iters: number): number => {
  const samples: number[] = [];
  for (let round = 0; round < ROUNDS; round++) {
    for (let i = 0; i < WARMUP; i++) sink((i & 1) === 0 ? fn("s", 1, 2, 3) : fn("s", 1));
    const start = Bun.nanoseconds();
    for (let i = 0; i < iters; i++) sink((i & 1) === 0 ? fn("s", 1, 2, 3) : fn("s", 1));
    samples.push((Bun.nanoseconds() - start) / iters);
  }
  return median(samples);
};

/** Benchmarks a single-object call against a third-party schema. */
const timeObject = (fn: AnyFn, iters: number): number => {
  const value = { name: "Alice", age: 25 };
  const samples: number[] = [];
  for (let round = 0; round < ROUNDS; round++) {
    for (let i = 0; i < WARMUP; i++) sink(fn(value));
    const start = Bun.nanoseconds();
    for (let i = 0; i < iters; i++) sink(fn(value));
    samples.push((Bun.nanoseconds() - start) / iters);
  }
  return median(samples);
};

const str = check((x): x is string => typeof x === "string");
const num = check((x): x is number => typeof x === "number");
const bool = check((x): x is boolean => typeof x === "boolean");
const nil = check((x): x is null => x === null);
const arr = check((x): x is unknown[] => Array.isArray(x));
const obj = check((x): x is object => typeof x === "object" && x !== null);
const fun = check((x): x is (...args: any[]) => any => typeof x === "function");
const undef = check((x): x is undefined => x === undefined);

const schemas = [str, num, bool, nil, arr, obj, fun, undef].slice(0, 8);

/** Builds an interpreted overload with `count` single-parameter branches. */
const buildBranches = (count: number): AnyFn => {
  let fn: any = Overload.withFallback(() => 0);
  for (let index = 0; index < count; index++) {
    fn = fn.overload([schemas[index]], () => index + 1);
  }
  return fn as AnyFn;
};

interface Row {
  readonly scenario: string;
  readonly legacy: number;
  readonly current: number;
  readonly compiled: number;
}

const rows: Row[] = [];

/** Runs one scenario across the three dispatch implementations. */
const scenario = (name: string, plain: AnyFn, measure: (fn: AnyFn) => number): void => {
  const legacy = legacyDispatch((plain as any).matchers, (plain as any).fallback);
  const compiled = toAot(plain);

  rows.push({
    scenario: name,
    legacy: measure(legacy),
    current: measure(plain),
    compiled: measure(compiled),
  });
};

scenario("2 branches / 1 arg", buildBranches(2), (fn) => time1(fn, 2_000_000));
scenario("4 branches / 1 arg", buildBranches(4), (fn) => time1(fn, 2_000_000));
scenario("8 branches / 1 arg", buildBranches(8), (fn) => time1(fn, 1_000_000));

scenario(
  "2 branches / 2 args",
  Overload.withFallback(() => 0)
    .overload([str, num], () => 1)
    .overload([num, num], () => 2) as AnyFn,
  (fn) => time2(fn, 2_000_000),
);

scenario("rest parameters", Overload.withFallback(() => 0).overload([str], num, () => 1) as AnyFn, (fn) =>
  timeRest(fn, 1_000_000),
);

const heavy = {
  "~standard": {
    version: 1,
    vendor: "bench",
    validate: (value: unknown) => {
      if (typeof value !== "object" || value === null) {
        return { issues: [{ message: "not an object" }] };
      }
      const candidate = value as { name?: unknown; age?: unknown };
      if (typeof candidate.name !== "string" || typeof candidate.age !== "number") {
        return { issues: [{ message: "invalid shape" }] };
      }
      return { value: { name: candidate.name, age: candidate.age } };
    },
  },
} as StandardSchemaV1;

scenario("external schema", Overload.withFallback(() => 0).overload([heavy], () => 1) as AnyFn, (fn) =>
  timeObject(fn, 1_000_000),
);

const columns = { scenario: 24, legacy: 10, current: 10, compiled: 12, speedup: 8 };
const line = (cells: string[]) =>
  [
    cells[0].padEnd(columns.scenario),
    cells[1].padStart(columns.legacy),
    cells[2].padStart(columns.current),
    cells[3].padStart(columns.compiled),
    cells[4].padStart(columns.speedup),
  ].join("");

console.log("overload dispatch benchmark (ns/op, median of 5 rounds)\n");
console.log(line(["scenario", "legacy", "current", "aot", "speedup"]));
console.log(line(["-".repeat(columns.scenario), "-".repeat(9), "-".repeat(9), "-".repeat(11), "-".repeat(7)]));
for (const row of rows) {
  console.log(
    line([
      row.scenario,
      row.legacy.toFixed(2),
      row.current.toFixed(2),
      row.compiled.toFixed(2),
      `${(row.legacy / row.compiled).toFixed(2)}x`,
    ]),
  );
}

const representative = buildBranches(4);
const instances = 10_000;
let instanceStart = Bun.nanoseconds();
for (let index = 0; index < instances; index++) toAot(representative);
const instanceCost = (Bun.nanoseconds() - instanceStart) / instances;

const source = `"use strict";\nreturn function (a0) {\n  if (s0(a0)) return s1.apply(this, arguments);\n  return s2.apply(this, arguments);\n};`;
const compilations = 1_000;
let compileStart = Bun.nanoseconds();
for (let index = 0; index < compilations; index++) new Function("s0", "s1", "s2", source);
const compileCost = (Bun.nanoseconds() - compileStart) / compilations;

console.log(`\naot() construction (shape cached): ${instanceCost.toFixed(0)} ns/instance`);
console.log(`new Function (2-branch shape):     ${(compileCost / 1_000).toFixed(2)} µs/shape`);
console.log(`sink ${sinkValue}`);
