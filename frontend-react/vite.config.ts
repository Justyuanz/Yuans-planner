import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const apiTarget = process.env.VITE_PLANNER_API_TARGET ?? "http://127.0.0.1:8765";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": apiTarget,
      "/css": apiTarget,
      "/favicon.ico": apiTarget,
      "/js": apiTarget,
      "/legacy": {
        target: apiTarget,
        rewrite: (path) => path.replace(/^\/legacy\/?/, "/")
      }
    }
  }
});
