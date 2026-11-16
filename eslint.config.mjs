import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // React Three Fiber scene graph: three.js objects (materials, uniforms,
    // camera) are imperative and are mutated inside useFrame by design —
    // that is the zero-re-render animation path R3F recommends.
    files: ["src/components/gateway/scene/**/*.tsx"],
    rules: { "react-hooks/immutability": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "node_modules/**", "next-env.d.ts"]),
]);
