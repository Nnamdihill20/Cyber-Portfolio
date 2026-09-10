import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // maplibre-gl is the large majority of the bundle and rarely
          // changes alongside app code - splitting it into its own chunk
          // means a browser that's already visited once can reuse it from
          // cache after an app-only update, instead of re-downloading it
          // every time any file changes.
          maplibre: ["maplibre-gl"],
        },
      },
    },
  },
});
