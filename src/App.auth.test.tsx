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
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    authMocks.subscribeToAuthChanges.mockReturnValue(vi.fn());
    window.history.replaceState({}, "", "/");
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
    const logoutButton = screen.getByRole("button", { name: "로그아웃" });
    const themeButton = screen.getByRole("button", { name: "시스템 테마" });
    expect(logoutButton.closest(".app-header")).toBe(themeButton.closest(".app-header"));
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
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith("/api/users")) {
        return Promise.resolve(response({ data: [] }));
      }

      if (url.endsWith("/api/feed")) {
        return Promise.resolve(response({ data: [], meta: { followingCount: 0 } }));
      }

      if (url.includes("/api/spotify/")) {
        return Promise.resolve(response([spotifyTrack]));
      }

      if (url.endsWith("/api/music-records") && init?.method === "POST") {
        return Promise.resolve(response({ data: {} }));
      }

      return Promise.resolve(response({ data: [] }));
    }));

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
    const logoutButton = await screen.findByRole("button", { name: "로그아웃" });
    const darkThemeButton = document.querySelector<HTMLButtonElement>(
      ".theme-control button:nth-of-type(2)",
    );
    expect(darkThemeButton).not.toBeNull();
    fireEvent.click(darkThemeButton!);
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");

    fireEvent.click(logoutButton);
    await waitFor(() => expect(authMocks.signOut).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("heading", { name: "로그인" })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(localStorage.getItem("swim-theme")).toBe("dark");
  });

  it("persists a like from the authenticated user's music card", async () => {
    authMocks.getCurrentSession.mockResolvedValue(session);
    authMocks.getProfile.mockResolvedValue({
      id: "user-1",
      nickname: "고요한수영",
      bio: "",
      avatarUrl: null,
    });
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/feed")) {
        return Promise.resolve(response({ data: [], meta: { followingCount: 0 } }));
      }
      if (url.endsWith("/api/users")) {
        return Promise.resolve(response({ data: [] }));
      }
      if (url.endsWith("/api/music-records/7/likes")) {
        return Promise.resolve(response({
          data: { recordId: "7", liked: true, likeCount: 1 },
        }));
      }
      return Promise.resolve(response({ data: [] }));
    }));

    render(<App initialRecords={[{
      id: 7,
      spotifyTrackId: "track-1",
      songTitle: "Ditto",
      artistName: "NewJeans",
      albumName: "OMG",
      albumImageUrl: null,
      externalUrl: null,
      emotion: "오늘의 마음",
      recordDate: "2026-07-27",
      liked: false,
      likeCount: 0,
      author: { nickname: "고요한수영", avatarUrl: null },
    }]} />);

    fireEvent.click(await screen.findByRole("button", { name: "Ditto 기억하기" }));

    expect(await screen.findByRole("button", { name: "Ditto 기억 취소" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/music-records/7/likes",
      {
        method: "POST",
        headers: { Authorization: "Bearer valid-access-token" },
      },
    );
  });

  it("restores the nickname search after returning from a public profile", async () => {
    localStorage.setItem("swim-theme", "dark");
    authMocks.getCurrentSession.mockResolvedValue(session);
    authMocks.getProfile.mockResolvedValue({
      id: "user-1",
      nickname: "고요한수영",
      bio: "",
      avatarUrl: null,
    });
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/feed")) {
        return Promise.resolve(response({ data: [], meta: { followingCount: 0 } }));
      }
      if (url.includes("/api/users?q=blue")) {
        return Promise.resolve(response({
          data: [{
            nickname: "BlueWave",
            bio: "밤의 음악",
            avatarUrl: null,
            isFollowing: false,
          }],
        }));
      }
      if (url.endsWith("/api/users/BlueWave")) {
        return Promise.resolve(response({
          data: {
            nickname: "BlueWave",
            bio: "밤의 음악",
            avatarUrl: null,
            isMe: false,
            isFollowing: false,
          },
        }));
      }
      if (url.endsWith("/api/users")) {
        return Promise.resolve(response({ data: [] }));
      }
      return Promise.resolve(response({ data: [] }));
    }));

    render(<App initialRecords={[]} />);
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    const searchInput = await screen.findByLabelText("닉네임으로 찾기");
    fireEvent.change(searchInput, { target: { value: "blue" } });
    fireEvent.click(await screen.findByRole("button", { name: /BlueWave/ }));
    expect(await screen.findByRole("heading", { name: "BlueWave" })).toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get("profile")).toBe("BlueWave");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");

    fireEvent.click(screen.getByRole("button", { name: "← 음악 피드로 돌아가기" }));

    expect(new URLSearchParams(window.location.search).has("profile")).toBe(false);
    expect(await screen.findByLabelText("닉네임으로 찾기")).toHaveValue("blue");
    expect(await screen.findByRole("button", { name: /BlueWave/ })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/users?q=blue",
      {
        headers: { Authorization: "Bearer valid-access-token" },
        signal: expect.any(AbortSignal),
      },
    );
  });

  it("restores a directly addressed profile and follows popstate navigation", async () => {
    window.history.replaceState({}, "", "/?profile=BlueWave");
    authMocks.getCurrentSession.mockResolvedValue(session);
    authMocks.getProfile.mockResolvedValue({
      id: "user-1",
      nickname: "고요한수영",
      bio: "",
      avatarUrl: null,
    });
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/users/BlueWave")) {
        return Promise.resolve(response({
          data: {
            nickname: "BlueWave",
            bio: "밤의 음악",
            avatarUrl: null,
            isMe: false,
            isFollowing: false,
          },
        }));
      }
      if (url.endsWith("/api/users/BlueWave/music-records")) {
        return Promise.resolve(response({
          data: { todayRecord: null, records: [], nextCursor: null },
        }));
      }
      if (url.endsWith("/api/feed")) {
        return Promise.resolve(response({ data: [], meta: { followingCount: 0 } }));
      }
      if (url.endsWith("/api/users")) {
        return Promise.resolve(response({ data: [] }));
      }
      return Promise.resolve(response({ data: [] }));
    }));

    render(<App initialRecords={[]} />);
    expect(await screen.findByRole("heading", { name: "BlueWave" })).toBeInTheDocument();

    window.history.pushState({}, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(await screen.findByRole("heading", { name: "Create Record" })).toBeInTheDocument();

    window.history.pushState({}, "", "/?profile=BlueWave");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(await screen.findByRole("heading", { name: "BlueWave" })).toBeInTheDocument();
  });
});
