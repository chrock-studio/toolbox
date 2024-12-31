import { defineConfig } from "tsup";
// import pkg from "./package.json" with { type: "json" };

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

  // external: Object.keys(pkg.optionalDependencies),
});
