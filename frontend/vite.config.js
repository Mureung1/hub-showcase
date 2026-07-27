import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: command === "serve" ? "/" : (process.env.VITE_BASE_PATH || "/"),
  plugins: [react()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  server: {
    open: true,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
}));
