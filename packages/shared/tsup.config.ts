import { defineConfig } from "tsup";

export default defineConfig({
  config: "./tsconfig.json",
  entry: ["lib/index.ts", "lib/types.ts", "lib/delegate.ts"],
  format: "esm",
  dts: true,
  outDir: "dist",
  clean: true,
  target: "esnext",
});
