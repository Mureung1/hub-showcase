import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  rpc: vi.fn(),
  auth: {
    signUp: vi.fn(),
  },
}));

vi.mock("../lib/supabase", () => ({
  getSupabaseBrowserClient: () => supabaseMock,
}));

import { signUp } from "./authService";

describe("signUp nickname identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.rpc.mockResolvedValue({ data: true, error: null });
    supabaseMock.auth.signUp.mockResolvedValue({
      data: {
        user: { identities: [{}] },
        session: null,
      },
      error: null,
    });
  });

  it("checks and stores the trimmed nickname without changing its display case", async () => {
    await signUp({
      email: "swimmer@example.com",
      password: "password123",
      nickname: "  SWIM  ",
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      "is_nickname_available",
      { candidate: "SWIM" },
    );
    expect(supabaseMock.auth.signUp).toHaveBeenCalledWith({
      email: "swimmer@example.com",
      password: "password123",
      options: { data: { nickname: "SWIM" } },
    });
  });

  it("rejects a normalized duplicate before creating an auth user", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: false, error: null });

    await expect(signUp({
      email: "other@example.com",
      password: "password123",
      nickname: " swim ",
    })).rejects.toThrow("이미 사용 중인 닉네임이에요.");

    expect(supabaseMock.auth.signUp).not.toHaveBeenCalled();
  });

  it("distinguishes an availability lookup failure from a duplicate nickname", async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: null,
      error: new Error("database unavailable"),
    });

    await expect(signUp({
      email: "swimmer@example.com",
      password: "password123",
      nickname: "SWIM",
    })).rejects.toThrow("닉네임 중복 여부를 확인하지 못했어요.");
  });

  it("keeps duplicate email errors distinct from nickname errors", async () => {
    supabaseMock.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: new Error("User already registered"),
    });

    await expect(signUp({
      email: "existing@example.com",
      password: "password123",
      nickname: "BlueWave",
    })).rejects.toThrow("이미 가입된 이메일이에요.");
  });

  it("does not label an unrelated database failure as a nickname duplicate", async () => {
    supabaseMock.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: new Error("Database error saving new user"),
    });

    await expect(signUp({
      email: "swimmer@example.com",
      password: "password123",
      nickname: "BlueWave",
    })).rejects.toThrow("회원가입을 완료하지 못했어요.");

    expect(supabaseMock.rpc).toHaveBeenCalledTimes(2);
  });

  it("reports a normalized duplicate when a concurrent signup wins the race", async () => {
    supabaseMock.rpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: false, error: null });
    supabaseMock.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: new Error("Database error saving new user"),
    });

    await expect(signUp({
      email: "second@example.com",
      password: "password123",
      nickname: " swim ",
    })).rejects.toThrow("이미 사용 중인 닉네임이에요.");

    expect(supabaseMock.rpc).toHaveBeenNthCalledWith(
      1,
      "is_nickname_available",
      { candidate: "swim" },
    );
    expect(supabaseMock.rpc).toHaveBeenNthCalledWith(
      2,
      "is_nickname_available",
      { candidate: "swim" },
    );
  });

  it("keeps a general signup error when the race-condition recheck fails", async () => {
    supabaseMock.rpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error("database unavailable") });
    supabaseMock.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: new Error("Database error saving new user"),
    });

    await expect(signUp({
      email: "swimmer@example.com",
      password: "password123",
      nickname: "BlueWave",
    })).rejects.toThrow("회원가입을 완료하지 못했어요.");
  });
});

