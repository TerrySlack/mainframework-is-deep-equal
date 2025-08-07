// eslint.config.js
const tsParser = await import("@typescript-eslint/parser");
const tsPlugin = await import("@typescript-eslint/eslint-plugin");

export default [
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    ignores: ["node_modules/**", "dist/**"],
    languageOptions: {
      parser: tsParser.default,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin.default,
    },
    rules: {
      "no-unused-vars": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      // add your other rules here
    },
  },
];
