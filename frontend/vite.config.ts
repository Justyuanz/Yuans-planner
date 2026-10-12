import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const apiTarget = process.env.VITE_PLANNER_API_TARGET ?? "http://127.0.0.1:8765";

export default defineConfig({
  plugins: [react()],
  // "@/" means src/. Vite resolves it for the build and for vitest;
  // tsconfig.json's paths entry has to say the same thing for type checking.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  server: {
    proxy: {
      "/api": apiTarget,
      "/favicon.ico": apiTarget
    }
  }
});
