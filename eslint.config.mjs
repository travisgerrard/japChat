import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Add custom rule configuration here
  {
    rules: {
      // Configure the TypeScript ESLint rule for unused variables
      "@typescript-eslint/no-unused-vars": [
        "warn", // or "error" depending on preference
        {
          "argsIgnorePattern": "^_", // Ignore arguments starting with _
          "varsIgnorePattern": "^_", // Ignore local variables starting with _
          "caughtErrorsIgnorePattern": "^_", // Ignore catch block errors starting with _
        }
      ],
      // You might also need the base JS rule if not using TS exclusively
      // "no-unused-vars": [
      //   "warn",
      //   { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "caughtErrorsIgnorePattern": "^_" }
      // ]
    }
  }
];

export default eslintConfig;
