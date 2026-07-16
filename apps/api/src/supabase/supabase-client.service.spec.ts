import { ConfigService } from "@nestjs/config";
import { SupabaseClientService } from "./supabase-client.service";

describe("SupabaseClientService", () => {
  it("fails clearly when the remote Supabase URL is missing", () => {
    expect(() =>
      new SupabaseClientService(new ConfigService({ SUPABASE_SECRET_KEY: "secret-value" })),
    ).toThrow("SUPABASE_URL");
  });

  it("fails without exposing the Supabase secret", () => {
    let error: Error | undefined;

    try {
      new SupabaseClientService(new ConfigService({ SUPABASE_URL: "https://example.supabase.co" }));
    } catch (caught) {
      error = caught as Error;
    }

    expect(error?.message).toContain("SUPABASE_SECRET_KEY");
    expect(error?.message).not.toContain("secret-value");
  });

  it("creates a server-only Supabase client when configuration is complete", () => {
    const service = new SupabaseClientService(
      new ConfigService({
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SECRET_KEY: "test-secret",
      }),
    );

    expect(service.client).toBeDefined();
  });
});
