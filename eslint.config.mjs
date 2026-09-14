import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // These client-only planet surfaces intentionally hydrate a saved galaxy
  // from sessionStorage after mount. React's generic set-state-in-effect rule
  // cannot distinguish that external-store synchronization from derived state.
  {
    files: [
      "src/components/world/dynamic-planet-law-v2.tsx",
      "src/components/world/dynamic-planet-story-v4.tsx",
      "src/components/world/planet-observation-archive.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
