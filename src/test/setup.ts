import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

// Coverage instrumentation and concurrent jsdom suites can delay resolved API
// state on Windows beyond Testing Library's 1-second default.
configure({ asyncUtilTimeout: 5_000 });

afterEach(() => {
  if (typeof document !== "undefined") cleanup();
});
