import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    env: {
      NODE_ENV: "test",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SECRET_KEY: "test-secret-key",
      GEMINI_API_KEY: "test-gemini-key",
    },
    include: [
      "tests/**/*.test.js",
      "tests/**/*.test.jsx",
    ],
    setupFiles: ["./tests/setupTests.js"],
  },
});
