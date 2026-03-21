import { defineConfig } from "tsup";

export default defineConfig({
  config: "./tsconfig.json",
  entry: {
    index: "lib/index.ts",
  },
  format: "esm",
  dts: true,
  outDir: "dist",
  clean: true,
  target: "esnext",
});
