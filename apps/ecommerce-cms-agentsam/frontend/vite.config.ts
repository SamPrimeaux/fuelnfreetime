import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Hashed bundles live here; public routes are /admin/analytics/* (Worker SPA fallback)
  base: "/admin/_spa/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    proxy: {
      "/api": "http://localhost:8787",
      "/admin/css": "http://localhost:8787",
      "/admin/analytics/assets": "http://localhost:8787",
    },
  },
});
