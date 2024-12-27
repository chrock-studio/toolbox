import globals from "globals";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-plugin-prettier/recommended";

export default tseslint.config(
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  prettier,
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-namespace": "off",
    },
  },
);
