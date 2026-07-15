import { describe, expect, it } from "vitest";
import { parsePublicSupabaseConfig } from "./supabase.js";

describe("parsePublicSupabaseConfig", () => {
  it("Supabase URL과 publishable key를 읽는다", () => {
    expect(
      parsePublicSupabaseConfig({
        url: "https://example.supabase.co",
        publishableKey: "sb_publishable_example",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_example",
    });
  });

  it("예시 placeholder 값은 거절한다", () => {
    expect(() =>
      parsePublicSupabaseConfig({
        url: "https://PROJECT_REF.supabase.co",
        publishableKey: "sb_publishable_REPLACE_ME",
      }),
    ).toThrow();
  });
});
