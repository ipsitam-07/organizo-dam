import eslintJs from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default [
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/build/**"],
  },

  eslintJs.configs.recommended,

  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...prettierConfig.rules,
      "prettier/prettier": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },

  {
  files: ["apps/api/**/*.{ts,js}"],
  languageOptions: {
    globals: globals.node,
  },
  },

  {
  files: ["apps/web/**/*.{ts,tsx,js,jsx}"],
  languageOptions: {
    globals: globals.browser,
  },
  },
    {
  files: ["packages/**/*.{ts,tsx,js,jsx}"],
   languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
];
