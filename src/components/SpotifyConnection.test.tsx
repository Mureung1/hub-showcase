import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpotifyConnection } from "./SpotifyConnection";

function response(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

const props = {
  apiBaseUrl: "http://localhost:3000",
  accessToken: "valid-token",
};

describe("SpotifyConnection", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => vi.unstubAllGlobals());

  it("shows a connect action when no account is connected", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({
      data: { connected: false, displayName: null, scope: null, tokenExpiresAt: null },
    }));

    render(<SpotifyConnection {...props} />);

    expect(await screen.findByRole("button", { name: "Spotify 계정 연결" })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/spotify/connection",
      expect.objectContaining({ headers: { Authorization: "Bearer valid-token" } }),
    );
  });

  it("requests an authorize URL and moves to Spotify after the connect action", async () => {
    const onNavigate = vi.fn();
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({
        data: { connected: false, displayName: null, scope: null, tokenExpiresAt: null },
      }))
      .mockResolvedValueOnce(response({
        data: { authorizeUrl: "https://accounts.spotify.com/authorize?state=safe-state" },
      }));

    render(<SpotifyConnection {...props} onNavigate={onNavigate} />);
    fireEvent.click(await screen.findByRole("button", { name: "Spotify 계정 연결" }));

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalledWith(
        "https://accounts.spotify.com/authorize?state=safe-state",
      );
    });
    expect(fetch).toHaveBeenLastCalledWith(
      "http://localhost:3000/api/spotify/connect",
      { headers: { Authorization: "Bearer valid-token" } },
    );
  });

  it("shows the connected account and disconnects it only after success", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({
        data: {
          connected: true,
          displayName: "잔잔한파도",
          scope: "playlist-modify-private",
          tokenExpiresAt: "2026-07-29T12:00:00.000Z",
        },
      }))
      .mockResolvedValueOnce(response({ data: { connected: false } }));

    render(<SpotifyConnection {...props} />);

    expect(await screen.findByText("잔잔한파도 연결됨")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "연결 해제" }));

    expect(await screen.findByRole("button", { name: "Spotify 계정 연결" })).toBeInTheDocument();
    expect(fetch).toHaveBeenLastCalledWith(
      "http://localhost:3000/api/spotify/connection",
      {
        method: "DELETE",
        headers: { Authorization: "Bearer valid-token" },
      },
    );
  });

  it("keeps the connected state when disconnecting fails", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({
        data: {
          connected: true,
          displayName: "잔잔한파도",
          scope: "playlist-modify-private",
          tokenExpiresAt: "2026-07-29T12:00:00.000Z",
        },
      }))
      .mockResolvedValueOnce(response({
        error: { message: "연결 해제에 실패했어요." },
      }, false));

    render(<SpotifyConnection {...props} />);
    fireEvent.click(await screen.findByRole("button", { name: "연결 해제" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("연결 해제에 실패했어요.");
    expect(screen.getByText("잔잔한파도 연결됨")).toBeInTheDocument();
  });

  it("shows the callback result and removes only OAuth parameters", async () => {
    window.history.replaceState({}, "", "/?profile=blue&spotify=connected");
    vi.mocked(fetch).mockResolvedValueOnce(response({
      data: {
        connected: true,
        displayName: null,
        scope: "playlist-modify-private",
        tokenExpiresAt: "2026-07-29T12:00:00.000Z",
      },
    }));

    render(<SpotifyConnection {...props} />);

    expect(await screen.findByText("Spotify 계정이 연결됐어요.")).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.search).toBe("?profile=blue");
    });
  });

  it("does not trust a connected callback parameter without a persisted connection", async () => {
    window.history.replaceState({}, "", "/?spotify=connected");
    vi.mocked(fetch).mockResolvedValueOnce(response({
      data: { connected: false, displayName: null, scope: null, tokenExpiresAt: null },
    }));

    render(<SpotifyConnection {...props} />);

    expect(await screen.findByRole("button", { name: "Spotify 계정 연결" })).toBeInTheDocument();
    expect(screen.queryByText("Spotify 계정이 연결됐어요.")).not.toBeInTheDocument();
    expect(window.location.search).toBe("");
  });
});
