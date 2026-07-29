import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Vercel deployment contract", () => {
  it("proxies API requests to the Render service before the SPA fallback", async () => {
    const config = JSON.parse(
      await readFile(resolve(process.cwd(), "vercel.json"), "utf8")
    );

    expect(config.framework).toBe("vite");
    expect(config.outputDirectory).toBe("dist");
    expect(config.rewrites[0]).toEqual({
      source: "/api/:path*",
      destination:
        "https://relationship-ai-api.onrender.com/api/:path*"
    });
    expect(config.rewrites[1]).toEqual({
      source: "/:path*",
      destination: "/index.html"
    });
  });

  it("prevents API responses from being cached by the Vercel edge", async () => {
    const config = JSON.parse(
      await readFile(resolve(process.cwd(), "vercel.json"), "utf8")
    );
    const apiHeaders = config.headers.find(
      (entry) => entry.source === "/api/:path*"
    );

    expect(apiHeaders.headers).toContainEqual({
      key: "Cache-Control",
      value: "no-store"
    });
  });

  it("keeps the Render Blueprint service name aligned with the proxy host", async () => {
    const blueprint = await readFile(
      resolve(process.cwd(), "render.yaml"),
      "utf8"
    );

    expect(blueprint).toContain("name: relationship-ai-api");
  });
});
