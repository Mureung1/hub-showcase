import { fireEvent, render, screen } from "@testing-library/react";
import App from "./App";

test("실제 장소 검색을 위한 빈 지도 화면을 표시한다", () => {
  window.history.pushState({}, "", "/");
  render(<App />);

  expect(screen.getByLabelText("식당 또는 카페 검색")).toBeInTheDocument();
  expect(screen.getByText("검색 결과가 여기에 표시됩니다")).toBeInTheDocument();
  expect(screen.getByText("지금리뷰")).toBeInTheDocument();
  expect(screen.queryByText("올드문래")).not.toBeInTheDocument();
});

test("로그인 경로에서 로그인 폼을 표시한다", () => {
  window.history.pushState({}, "", "/login");
  render(<App />);

  expect(screen.getByRole("heading", { name: "다시 만나서 반가워요" })).toBeInTheDocument();
  expect(screen.getByLabelText("이메일")).toBeInTheDocument();
  expect(screen.getByLabelText("비밀번호")).toBeInTheDocument();
});

test("검색 버튼 없이 Enter로 검색하고 X 버튼으로 검색어를 지운다", () => {
  window.history.pushState({}, "", "/");
  render(<App />);

  const searchInput = screen.getByLabelText("식당 또는 카페 검색");

  expect(screen.queryByRole("button", { name: "검색" })).not.toBeInTheDocument();

  fireEvent.change(searchInput, { target: { value: "성수 카페" } });
  const clearButton = screen.getByRole("button", { name: "검색어 지우기" });

  fireEvent.click(clearButton);

  expect(searchInput).toHaveValue("");
  expect(searchInput).toHaveFocus();
  expect(screen.queryByRole("button", { name: "검색어 지우기" })).not.toBeInTheDocument();
});

test("업체 상세에서 지도로 돌아오면 이전 검색 결과를 복원한다", () => {
  sessionStorage.setItem("jigeum-review:map-screen", JSON.stringify({
    searchInput: "성수 카페",
    places: [{ id: "place-1", title: "테스트 카페", category: "카페", address: "서울 성동구", x: 127.05, y: 37.54 }],
    placeStatus: "ready",
    selectedPlaceId: "place-1",
    searchRadius: 3000,
  }));
  window.history.pushState({}, "", "/");
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "테스트 카페 상세 보기" }));
  fireEvent.click(screen.getByRole("button", { name: "← 지도" }));

  expect(screen.getByLabelText("식당 또는 카페 검색")).toHaveValue("성수 카페");
  expect(screen.getByRole("button", { name: "테스트 카페 상세 보기" })).toBeInTheDocument();
  sessionStorage.removeItem("jigeum-review:map-screen");
  sessionStorage.removeItem("jigeum-review:selected-place");
});

test("로그인 사용자는 별점 없이 영수증 리뷰 작성 화면을 이용한다", async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ user: { id: "user-1", name: "테스터", email: "test@example.com" } }),
  });
  sessionStorage.setItem("jigeum-review:selected-place", JSON.stringify({
    id: "place-1",
    title: "테스트 카페",
    category: "카페",
    address: "서울 성동구",
  }));
  window.history.pushState({}, "", "/places/place-1/reviews/new");
  render(<App />);

  expect(await screen.findByRole("heading", { name: "테스트 카페" })).toBeInTheDocument();
  expect(screen.getByLabelText("리뷰 내용")).toBeInTheDocument();
  expect(screen.queryByLabelText(/별점/)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "작성 내용 임시 저장" }));
  expect(screen.getByRole("alert")).toHaveTextContent("영수증 이미지를 선택");

  global.fetch = originalFetch;
  sessionStorage.removeItem("jigeum-review:selected-place");
});
