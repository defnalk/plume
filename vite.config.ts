import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // '/plume/' for GitHub Pages (defnalk.github.io/plume), or '/' for a
  // custom domain. Set VITE_BASE=/ when deploying to plume.defne.dev.
  base: process.env.VITE_BASE ?? "/plume/",
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
