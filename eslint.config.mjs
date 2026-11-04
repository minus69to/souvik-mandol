import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

// Three.js scenes mutate memoised objects (vectors, matrices, instanced
// attributes) inside useFrame on purpose; the React Compiler rule does not apply.
eslintConfig.push({
  files: ["src/components/scenes/**/*.jsx"],
  rules: { "react-hooks/immutability": "off" },
});

export default eslintConfig;
