import { afterEach, describe, expect, it } from "vitest";

import { normalizeProductRoute } from "./productRoute";

afterEach(() => window.history.replaceState({}, "", "/"));

describe("normalizeProductRoute", () => {
  it("keeps the general product URL at /home without query or hash", () => {
    window.history.replaceState({}, "", "/?market=연남&category=카페#analysis");

    normalizeProductRoute(window.location, window.history);

    expect(window.location.pathname).toBe("/home");
    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("");
  });

  it("keeps the English and demo entry points unchanged", () => {
    window.history.replaceState({}, "", "/en");
    normalizeProductRoute(window.location, window.history);
    expect(window.location.pathname).toBe("/en");

    window.history.replaceState({}, "", "/?demo=storefront");
    normalizeProductRoute(window.location, window.history);
    expect(window.location.search).toBe("?demo=storefront");
  });
});
