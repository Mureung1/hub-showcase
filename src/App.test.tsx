import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const apiRecord = {
  id: 1,
  songTitle: "Ditto",
  artistName: "NewJeans",
  emotionText: "조용히 위로받은 하루",
  recordDate: "2026-07-16",
  createdAt: "2026-07-16T10:30:00.000Z",
};

function response(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

function completeForm(title = "Ditto") {
  fireEvent.change(screen.getByLabelText("노래 제목"), { target: { value: title } });
  fireEvent.change(screen.getByLabelText("아티스트명"), { target: { value: "NewJeans" } });
  fireEvent.change(screen.getByLabelText("한 줄로 남기기"), { target: { value: "조용히 위로받은 하루" } });
}

describe("music record API flow", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("shows today without a date input", () => {
    render(<App initialRecords={[]} />);
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(document.querySelector('input[type="date"]')).not.toBeInTheDocument();
  });

  it("loads persisted records with GET on first render", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ data: [apiRecord] }));
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Ditto" })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/music-records");
  });

  it("shows validation before sending a request", () => {
    render(<App initialRecords={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "기록하기" }));
    expect(screen.getByText("노래 제목을 입력해주세요.")).toBeInTheDocument();
    expect(screen.getByText("아티스트명을 입력해주세요.")).toBeInTheDocument();
    expect(screen.getByText("한 줄 감정을 입력해주세요.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("posts a record and refreshes the list with GET", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({ data: apiRecord }, true, 201))
      .mockResolvedValueOnce(response({ data: [apiRecord] }));
    render(<App initialRecords={[]} />);
    completeForm();
    fireEvent.click(screen.getByRole("button", { name: "기록하기" }));

    expect(await screen.findByRole("heading", { name: "Ditto" })).toBeInTheDocument();
    expect(fetch).toHaveBeenNthCalledWith(1, "http://localhost:3000/api/music-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        songTitle: "Ditto",
        artistName: "NewJeans",
        emotionText: "조용히 위로받은 하루",
      }),
    });
    expect(fetch).toHaveBeenNthCalledWith(2, "http://localhost:3000/api/music-records");
  });

  it("shows a server error without using alert", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({
      error: { code: "INTERNAL_SERVER_ERROR", message: "음악 기록 저장 중 오류가 발생했습니다." },
    }, false, 500));
    render(<App initialRecords={[]} />);
    completeForm();
    fireEvent.click(screen.getByRole("button", { name: "기록하기" }));

    await waitFor(() => {
      expect(screen.getByText("음악 기록 저장 중 오류가 발생했습니다.")).toBeInTheDocument();
    });
    expect(screen.queryByRole("heading", { name: "Ditto" })).not.toBeInTheDocument();
  });
});
