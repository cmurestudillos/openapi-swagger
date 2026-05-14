"use strict";

const js = require("@eslint/js");
const prettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = [
  {
    ignores: ["node_modules/**", "release/**", "dist/**"],
  },
  js.configs.recommended,
  prettierRecommended,
  {
    files: ["**/*.js"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "warn",
      eqeqeq: ["error", "always"],
      curly: "error",
    },
  },
];
