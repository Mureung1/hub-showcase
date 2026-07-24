import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserList } from "./UserList";

function response(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

describe("UserList", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("shows users and their persisted follow state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({
      data: [
        { nickname: "잔잔한파도", bio: "밤의 음악", avatarUrl: null, isFollowing: true },
        { nickname: "푸른기억", bio: "", avatarUrl: null, isFollowing: false },
      ],
    }));

    render(<UserList apiBaseUrl="http://localhost:3000" accessToken="valid-token" />);

    expect(screen.getByRole("status")).toHaveTextContent("사람들을 불러오는 중...");
    expect(await screen.findByText("잔잔한파도")).toBeInTheDocument();
    expect(screen.getByText("팔로잉")).toBeInTheDocument();
    expect(screen.getByText("새로운 사람")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/users", {
      headers: { Authorization: "Bearer valid-token" },
      signal: expect.any(AbortSignal),
    });
  });

  it("shows the empty state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ data: [] }));
    render(<UserList apiBaseUrl="http://localhost:3000" accessToken="valid-token" />);

    expect(await screen.findByText("아직 함께할 사람이 없어요.")).toBeInTheDocument();
  });

  it("shows an error and retries the request", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({
        error: { message: "사용자 목록 조회 중 오류가 발생했습니다." },
      }, false))
      .mockResolvedValueOnce(response({ data: [] }));
    render(<UserList apiBaseUrl="http://localhost:3000" accessToken="valid-token" />);

    expect(await screen.findByText("사용자 목록 조회 중 오류가 발생했습니다.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("아직 함께할 사람이 없어요.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("debounces a trimmed nickname search and shows a search-specific empty state", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({ data: [] }))
      .mockResolvedValueOnce(response({ data: [] }));
    render(<UserList apiBaseUrl="http://localhost:3000" accessToken="valid-token" />);
    await screen.findByText("아직 함께할 사람이 없어요.");

    fireEvent.change(screen.getByLabelText("닉네임으로 찾기"), {
      target: { value: "  blue  " },
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/users?q=blue",
        {
          headers: { Authorization: "Bearer valid-token" },
          signal: expect.any(AbortSignal),
        },
      );
    });
    expect(await screen.findByText("일치하는 사람을 찾지 못했어요.")).toBeInTheDocument();
  });

  it("does not request a one-character search and returns to the full list when cleared", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({ data: [] }))
      .mockResolvedValueOnce(response({ data: [] }));
    render(<UserList apiBaseUrl="http://localhost:3000" accessToken="valid-token" />);
    await screen.findByText("아직 함께할 사람이 없어요.");

    fireEvent.change(screen.getByLabelText("닉네임으로 찾기"), {
      target: { value: "a" },
    });
    expect(screen.getByText("검색어는 2자 이상 입력해 주세요.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("닉네임으로 찾기"), {
      target: { value: "" },
    });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("아직 함께할 사람이 없어요.")).toBeInTheDocument();
  });

  it("aborts an older search as soon as the input changes", async () => {
    let searchSignal: AbortSignal | undefined;
    const pendingSearch = new Promise<Response>(() => undefined);
    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url.includes("?q=blue")) {
        searchSignal = init?.signal ?? undefined;
        return pendingSearch;
      }
      return Promise.resolve(response({ data: [] }));
    });
    render(<UserList apiBaseUrl="http://localhost:3000" accessToken="valid-token" />);
    await screen.findByText("아직 함께할 사람이 없어요.");

    fireEvent.change(screen.getByLabelText("닉네임으로 찾기"), {
      target: { value: "blue" },
    });
    await waitFor(() => expect(searchSignal).toBeDefined());

    fireEvent.change(screen.getByLabelText("닉네임으로 찾기"), {
      target: { value: "green" },
    });

    expect(searchSignal?.aborted).toBe(true);
  });
});
