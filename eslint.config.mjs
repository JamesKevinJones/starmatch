import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored from the Bklit UI shadcn registry (`npx shadcn add @bklit/...`).
    // Linting third-party source we do not author would either force us to
    // rewrite 58 files or bury them in inline disables, and both make future
    // registry updates a merge conflict. Our own chart code -
    // distance-chart.tsx and calibration-chart.tsx - is linted normally.
    "src/components/charts/**",
  ]),
]);

export default eslintConfig;
