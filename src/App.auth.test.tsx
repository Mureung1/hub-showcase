import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  getProfile: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  subscribeToAuthChanges: vi.fn(() => vi.fn()),
}));

vi.mock("./services/authService", () => authMocks);

import { App } from "./App";

const session = {
  user: { id: "user-1", email: "swimmer@example.com" },
  access_token: "valid-access-token",
} as Session;

const spotifyTrack = {
  spotifyTrackId: "spotify-track-1",
  title: "Ditto",
  artistName: "NewJeans",
  albumName: "OMG",
  albumImageUrl: "https://example.com/album.jpg",
  externalUrl: "https://open.spotify.com/track/spotify-track-1",
};

function response(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

describe("app authentication flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.subscribeToAuthChanges.mockReturnValue(vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the login screen after confirming there is no saved session", async () => {
    authMocks.getCurrentSession.mockResolvedValue(null);
    render(<App initialRecords={[]} />);
    expect(screen.getByText("당신의 음악 일기를 여는 중...")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "로그인" })).toBeInTheDocument();
  });

  it("returns to login with guidance when session restoration fails", async () => {
    authMocks.getCurrentSession.mockRejectedValue(new Error("로그인 상태를 확인하지 못했어요."));
    render(<App initialRecords={[]} />);
    expect(await screen.findByRole("heading", { name: "로그인" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("로그인 상태를 확인하지 못했어요.");
  });

  it("restores a saved session and loads its profile", async () => {
    authMocks.getCurrentSession.mockResolvedValue(session);
    authMocks.getProfile.mockResolvedValue({ id: "user-1", nickname: "고요한수영", bio: "", avatarUrl: null });
    render(<App initialRecords={[]} />);
    expect(await screen.findByText("고요한수영")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Create Record" })).toBeInTheDocument();
    expect(authMocks.getProfile).toHaveBeenCalledWith("user-1");
  });

  it("includes the restored session token when loading music records", async () => {
    authMocks.getCurrentSession.mockResolvedValue(session);
    authMocks.getProfile.mockResolvedValue({ id: "user-1", nickname: "고요한수영", bio: "", avatarUrl: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    }));

    render(<App />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/music-records", {
        headers: { Authorization: "Bearer valid-access-token" },
      });
    });
  });

  it("includes the restored session token when creating a music record", async () => {
    authMocks.getCurrentSession.mockResolvedValue(session);
    authMocks.getProfile.mockResolvedValue({ id: "user-1", nickname: "고요한수영", bio: "", avatarUrl: null });
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(response([spotifyTrack]))
      .mockResolvedValueOnce(response({ data: {} }))
      .mockResolvedValueOnce(response({ data: [] })));

    render(<App initialRecords={[]} />);
    await screen.findByRole("heading", { name: "Create Record" });

    fireEvent.change(screen.getByLabelText("노래 검색"), { target: { value: "ditto" } });
    fireEvent.click(await screen.findByRole("option", { name: /Ditto/i }));
    fireEvent.change(screen.getByLabelText("한 줄로 남기기"), {
      target: { value: "오늘 하루를 위로받은 기분" },
    });
    fireEvent.click(screen.getByRole("button", { name: "기록하기" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/music-records", expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-access-token",
        },
      }));
    });
  });

  it("returns to the login screen after logout", async () => {
    authMocks.getCurrentSession.mockResolvedValue(session);
    authMocks.getProfile.mockResolvedValue({ id: "user-1", nickname: "고요한수영", bio: "", avatarUrl: null });
    authMocks.signOut.mockResolvedValue(undefined);
    render(<App initialRecords={[]} />);
    fireEvent.click(await screen.findByRole("button", { name: "로그아웃" }));
    await waitFor(() => expect(authMocks.signOut).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("heading", { name: "로그인" })).toBeInTheDocument();
  });
});
