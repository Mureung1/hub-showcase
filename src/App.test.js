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
