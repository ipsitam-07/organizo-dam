import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api/auth": {
        target: "http://api:3001",
        changeOrigin: true,
      },
      "/api/upload": {
        target: "http://upload:3002",
        changeOrigin: true,
      },
      "/api/asset": {
        target: "http://asset:3003",
        changeOrigin: true,
      },
      "/api/share": {
        target: "http://asset:3000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
