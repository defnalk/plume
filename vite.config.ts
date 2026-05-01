import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Use root base for custom domain (plume.defne.dev), or '/plume/' for
  // defnalk.github.io/plume. Set via env var so the deploy script can toggle.
  base: process.env.VITE_BASE ?? "/",
  build: {
    target: "es2022",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          r3f: ["@react-three/fiber", "@react-three/drei"],
        },
      },
    },
  },
  worker: {
    format: "es",
  },
});
