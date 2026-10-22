# `@chrock-studio/overload`

[![npm version](https://img.shields.io/npm/v/@chrock-studio%2Foverload)](https://www.npmjs.com/package/@chrock-studio/overload)
[![JSR](https://jsr.io/badges/@chrock-studio/overload)](https://jsr.io/@chrock-studio/overload)
[![license](https://img.shields.io/npm/l/@chrock-studio%2Foverload)](./LICENSE)

Type-safe runtime function overloading for TypeScript. Branches are selected by
the actual argument types at runtime, while the same overloads are checked and
inferred at compile time.

- Works with any [Standard Schema](https://standardschema.dev) validator, so
  `zod`, `valibot` and friends plug in directly.
- `check()` builds a schema from a plain type guard when you don't need a
  validator library.
- Rest parameters, fallbacks and `this` forwarding are supported.
- Optional ahead-of-time dispatch compilation for hot paths.

## Install

```sh
npm install @chrock-studio/overload
# or
bun add @chrock-studio/overload
# or
deno add jsr:@chrock-studio/overload
```

Requires an ESM runtime: Node.js 18+, Bun, Deno or a modern bundler.

## Quick start

```ts
import { check, Overload } from "@chrock-studio/overload";

const str = check((x): x is string => typeof x === "string");
const num = check((x): x is number => typeof x === "number");

const greet = Overload.withFallback((..._args: unknown[]) => "Unknown input")
  .overload([str], (name) => `Hello, ${name}!`)
  .overload([num], (age) => `Age: ${age}`);

greet("Alice"); // "Hello, Alice!"
greet(25); // "Age: 25"
greet(true); // "Unknown input"
```

Branches are prepended as you chain `.overload()`, so the **last added branch is
checked first**. The first branch whose schemas all pass is invoked.

## With a Standard Schema validator

Any object implementing [`StandardSchemaV1`](https://standardschema.dev) can be
used as a checker, so existing validators work without adapters:

```ts
import { Overload } from "@chrock-studio/overload";
import { z } from "zod";

const greet = Overload.withFallback((..._args: unknown[]) => "Unknown input")
  .overload([z.string()], (name) => `Hello, ${name}!`)
  .overload([z.number()], (age) => `Age: ${age}`);
```

## Multiple parameters

Every checker in the array maps to one positional argument:

```ts
const process = Overload.withFallback(() => "No match").overload(
  [str, num],
  (name, age) => `${name} is ${age} years old`,
);

process("Bob", 30); // "Bob is 30 years old"
```

Arguments beyond the declared checkers are ignored while matching but are still
forwarded to the implementation.

## Rest parameters

Pass a checker as the second argument to validate the remaining arguments:

```ts
const log = Overload.withFallback(() => {}).overload([str], num, (first, second, ...rest) =>
  console.log(first, second, rest),
);

log("item", 1, 2, 3); // "item" 1 [2, 3]
```

## No match

`Overload.withFallback` always provides a fallback, so unmatched calls are
handled there. Constructing `Overload` directly without one is also supported —
an unmatched call then throws a `TypeError`:

```ts
import { Matcher, Overload } from "@chrock-studio/overload";

const matcher = Matcher.make([str], (s: string) => s.toUpperCase());
const strict = new Overload([matcher]);

// Bypass the overload types to show the runtime behaviour:
(strict as (value: unknown) => string)("a"); // "A"
(strict as (value: unknown) => string)(1); // TypeError: No overload matched
```

## Precompiled dispatch

Dispatch walks the branch list on every call. For hot functions you can compile
the dispatcher ahead of time:

```ts
const greet = Overload.withFallback((..._args: unknown[]) => "Unknown input")
  .overload([str], (name) => `Hello, ${name}!`)
  .overload([num], (age) => `Age: ${age}`);

const fast = greet.aot();
fast("Alice"); // "Hello, Alice!"
```

`aot()` returns a new function with identical behaviour and types, and is
idempotent — calling it on an already compiled function returns the same
function. Build the whole chain first and call `aot()` once:

```ts
const fast = Overload.withFallback((..._args: unknown[]) => "Unknown input")
  .overload([str], (name) => `Hello, ${name}!`)
  .aot();
```

`Overload.aot` mirrors the builder for functions that should be compiled from the
start. Note that each `.overload()` compiles its intermediate function, so the
single `aot()` call above is usually cheaper.

Compilation uses `new Function`. In runtimes that forbid code generation (a
strict Content Security Policy, some edge runtimes) a warning is logged once and
the function transparently falls back to interpreted dispatch, which behaves
identically. `aot()` is therefore always safe to call.

## Performance

Measured with `bun run bench` (Bun 1.4, Apple Silicon, ns per call, median of five
rounds). "aot" is `fn.aot()`; the baseline is the interpreted dispatcher.

| Scenario                | interpreted |  aot | speedup |
| ----------------------- | ----------: | ---: | ------: |
| 2 branches, 1 argument  |       13.05 | 3.48 |    3.8x |
| 4 branches, 1 argument  |       37.26 | 8.13 |    4.6x |
| 8 branches, 1 argument  |       95.88 | 9.21 |   10.4x |
| 2 branches, 2 arguments |       30.59 | 4.66 |    6.6x |
| rest parameters         |       23.55 | 9.42 |    2.5x |
| third-party schema      |       14.18 | 5.76 |    2.5x |

Two effects stack up: compiled dispatch inlines the guards and skips the
arguments array, and schemas created with `check()` are validated through their
raw predicate instead of allocating a `StandardSchemaV1` result object. Schemas
from third-party validators keep their own validation cost, so their speedup is
limited by that work.

## Compatibility

- **Runtime:** ESM only; Node.js 18+, Bun, Deno and modern bundlers.
- **Types:** shipped as `.d.ts` next to the ESM build.
- **Code generation:** optional; when unavailable the library still works, only
  slower.

## API

| Export             | Description                                                          |
| ------------------ | -------------------------------------------------------------------- |
| `Overload`         | Builder and constructor for overloaded functions.                    |
| `Overload.aot`     | Same builder surface, compiled on construction.                      |
| `fn.aot()`         | Returns the precompiled counterpart of an overloaded function.       |
| `check(predicate)` | Wraps a type guard as a `StandardSchemaV1`.                          |
| `Matcher`          | A single branch: checkers, optional rest checker and implementation. |
| `Callable`         | Helper for wrapping a function as a callable object.                 |

The full API documentation, including examples, lives in the module JSDoc and on
[JSR](https://jsr.io/@chrock-studio/overload).

## License

[MIT](./LICENSE) © ChrockStudio
