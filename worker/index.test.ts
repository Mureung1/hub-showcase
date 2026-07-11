import { describe, expect, it, vi } from "vitest";
import worker from "./index";

describe("Sites Worker asset routing", () => {
  it("serves index.html for direct SPA route navigation", async () => {
    const fetchAsset = vi.fn(async (request: Request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === "/index.html") {
        return new Response("<!doctype html><title>Modu Brain</title>", {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
      return new Response(null, { status: 404 });
    });

    const response = await worker.fetch(
      new Request("https://modu-brain.example/projects/abc", {
        headers: { Accept: "text/html" },
      }),
      {
        ASSETS: { fetch: fetchAsset },
        SUPABASE_URL: "https://demo.supabase.co",
      },
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Modu Brain");
    expect(fetchAsset).toHaveBeenCalledTimes(2);
    expect(response.headers.get("content-security-policy")).toContain(
      "https://demo.supabase.co",
    );
  });
});
