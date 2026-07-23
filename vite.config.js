import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  base: command === "serve" ? "/" : "/hub/",
  plugins: [react()],
  test: {
    environment: "node",
    include: [
      "test/**/*.test.js",
      "test/**/*.test.jsx",
    ],
    setupFiles: ["./test/setupTests.js"],
  },
  server: {
    open: true,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
}));
