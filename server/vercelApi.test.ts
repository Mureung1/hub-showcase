import { describe, expect, it } from "vitest";
import api from "../api/[...route]";

describe("Vercel API entry", () => {
  it("serves the Hono health route through the Web fetch handler", async () => {
    const response = await api.fetch(new Request("https://example.test/api/health"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      api: "hono",
      storageMode: "memory",
      supabaseConfigured: false,
    });
  });
});
