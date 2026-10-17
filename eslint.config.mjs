import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// ESLint 9 needs a flat config; eslint-config-next 16 ships flat configs.
const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // `_`-prefixed names and rest siblings are intentionally unused
      // (e.g. dropping fields with `const { a: _a, ...rest } = obj`).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      // Pre-existing findings in older components and tailwind.config.ts.
      // Kept as warnings so `next build` (which lints) passes as it did before
      // this config existed; listed in docs/DHSJR_MCP_FINAL_REPORT.md.
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "react-hooks/static-components": "warn",
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "src/types/supabase.type.ts"],
  },
];

export default config;
