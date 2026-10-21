# `@chrock-studio/toolbox`

[![JSR Scope](https://jsr.io/badges/@chrock-studio)](https://jsr.io/@chrock-studio)

A tool set for `Chrock Studio`.

| Package                       |                                                                                                                                  Version                                                                                                                                  |
| :---------------------------- | :-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
| `@chrock-studio/code-block`   |     [![JSR Scope](https://jsr.io/badges/@chrock-studio/code-block/score) ![JSR Downloads](https://jsr.io/badges/@chrock-studio/code-block/total-downloads) ![JSR Version](https://jsr.io/badges/@chrock-studio/code-block)](https://jsr.io/@chrock-studio/code-block)     |
| `@chrock-studio/overload`     |         [![JSR Scope](https://jsr.io/badges/@chrock-studio/overload/score) ![JSR Downloads](https://jsr.io/badges/@chrock-studio/overload/total-downloads) ![JSR Version](https://jsr.io/badges/@chrock-studio/overload)](https://jsr.io/@chrock-studio/overload)         |
| `@chrock-studio/shared`       |             [![JSR Scope](https://jsr.io/badges/@chrock-studio/shared/score) ![JSR Downloads](https://jsr.io/badges/@chrock-studio/shared/total-downloads) ![JSR Version](https://jsr.io/badges/@chrock-studio/shared)](https://jsr.io/@chrock-studio/shared)             |
| `@chrock-studio/signal-proxy` | [![JSR Scope](https://jsr.io/badges/@chrock-studio/signal-proxy/score) ![JSR Downloads](https://jsr.io/badges/@chrock-studio/signal-proxy/total-downloads) ![JSR Version](https://jsr.io/badges/@chrock-studio/signal-proxy)](https://jsr.io/@chrock-studio/signal-proxy) |
| `@chrock-studio/signals`      |           [![JSR Scope](https://jsr.io/badges/@chrock-studio/signals/score) ![JSR Downloads](https://jsr.io/badges/@chrock-studio/signals/total-downloads) ![JSR Version](https://jsr.io/badges/@chrock-studio/signals)](https://jsr.io/@chrock-studio/signals)           |
| `@chrock-studio/zod-utils`    |       [![JSR Scope](https://jsr.io/badges/@chrock-studio/zod-utils/score) ![JSR Downloads](https://jsr.io/badges/@chrock-studio/zod-utils/total-downloads) ![JSR Version](https://jsr.io/badges/@chrock-studio/zod-utils)](https://jsr.io/@chrock-studio/zod-utils)       |
| `@chrock-studio/sql-kv`       |             [![JSR Scope](https://jsr.io/badges/@chrock-studio/sql-kv/score) ![JSR Downloads](https://jsr.io/badges/@chrock-studio/sql-kv/total-downloads) ![JSR Version](https://jsr.io/badges/@chrock-studio/sql-kv)](https://jsr.io/@chrock-studio/sql-kv)             |

## Development

This monorepo is developed with [Bun](https://bun.sh) and [Oxc](https://oxc.rs) (`oxfmt` for formatting, `oxlint` for linting).

```sh
bun install        # install workspace dependencies
bun test           # run every package's test suite (bun:test)
bun run typecheck  # type-check all packages with tsc --noEmit
bun run fmt        # format with oxfmt
bun run lint       # lint with oxlint
```

Each package keeps a `package.json` (for Bun workspaces) and a `jsr.json` (publishing metadata for JSR).
Packages are still published to JSR; the dry-run and publish commands are run from a package directory:

```sh
cd packages/signals
bunx jsr publish --dry-run   # validate what would be published
bunx jsr publish             # publish (the JSR CLI downloads Deno for this step)
```
