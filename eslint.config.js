import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  // 1. Global Ignores
  {
    ignores: [
      "node_modules/",
      "build/",
      "dist/",
      "coverage/",
      "**/*.config.js",
      "**/*.config.ts",
      "result.html",
      "ecosystem.config.js"
    ],
  },
  
  // 2. Global JS/TS Baseline (Warnings for legacy debt)
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "no-shadow": "off",
      "@typescript-eslint/no-shadow": "error",
      "no-unreachable": "error",
      "@typescript-eslint/consistent-type-imports": "warn",
      // Downgrade recommended strictness for legacy codebase
      "prefer-const": "warn",
      "no-empty": "warn",
      "no-useless-assignment": "warn",
      "no-var": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "@typescript-eslint/no-shadow": "warn", // 41 existing violations, needs manual fix
      "@typescript-eslint/no-unused-expressions": "warn",
      "no-constant-binary-expression": "warn",
      "no-useless-escape": "warn",
      "@typescript-eslint/no-wrapper-object-types": "warn",
      "no-async-promise-executor": "warn",
      "no-extra-boolean-cast": "warn",
      "preserve-caught-error": "warn"
    }
  },

  // 3. Frontend Override (React / Browser)
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        project: ["./src/tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": hooksPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-floating-promises": "error",
    }
  },

  // 4. Backend Override (Node / Server)
  {
    files: ["server/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        project: ["./server/tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
    }
  }
);
