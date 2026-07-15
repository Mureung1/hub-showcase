import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  base: command === "serve" ? "/" : "/hub/",
  plugins: [react()],
  server: {
    open: true,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
}));
