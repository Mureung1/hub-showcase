// Card 컴포넌트 테스트(첫 화면 컴포넌트 테스트). 렌더링 결과와 클릭 동작을 본다.
// 특히 별(★) 클릭이 카드 열기로 번지지 않는지(stopPropagation)가 버그 나기 쉬운 자리라 꼭 잡는다.
import { test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Card from "./Card.jsx";

// 기본 공고 하나. 각 테스트에서 필요한 필드만 덮어쓴다.
const item = (over = {}) => ({
  id: "1", title: "테스트 공고", org: "테스트기관", source: "콘테스트코리아",
  category: "공모전", url: "https://example.com", deadline: null,
  status: "eligible", eligibilityText: "누구나", failed: [], ...over,
});

test("제목·카테고리·주최·출처를 보여준다", () => {
  render(<Card item={item()} fav={false} onToggleFav={() => {}} onOpen={() => {}} />);
  expect(screen.getByText("테스트 공고")).toBeInTheDocument();
  expect(screen.getByText("공모전")).toBeInTheDocument();
  expect(screen.getByText("테스트기관 · 콘테스트코리아")).toBeInTheDocument();
});

test("주최가 비어 있으면 앞에 '· '가 안 붙는다", () => {
  render(<Card item={item({ org: "" })} fav={false} onToggleFav={() => {}} onOpen={() => {}} />);
  expect(screen.getByText("콘테스트코리아")).toBeInTheDocument();
  expect(screen.queryByText("· 콘테스트코리아")).toBeNull();
});

test("거의 가능(near)이면 '이것만 맞으면 가능' 문구를 보여준다", () => {
  const near = item({ status: "near", failed: [{ label: "지역", req: "부산", mine: "서울" }] });
  render(<Card item={near} fav={false} onToggleFav={() => {}} onOpen={() => {}} />);
  expect(screen.getByText(/이것만 맞으면 가능: 지역 부산/)).toBeInTheDocument();
});

test("확인 필요인데 근거 원문이 없으면 대시 없이 '확인 필요'만 (빈 대시 방지)", () => {
  const review = item({ status: "review", eligibilityText: "" });
  render(<Card item={review} fav={false} onToggleFav={() => {}} onOpen={() => {}} />);
  expect(screen.getByText("확인 필요")).toBeInTheDocument();
  expect(screen.queryByText("확인 필요 —")).toBeNull();
});

test("즐겨찾기면 채운 별(★), 아니면 빈 별(☆)", () => {
  const { rerender } = render(<Card item={item()} fav={true} onToggleFav={() => {}} onOpen={() => {}} />);
  expect(screen.getByLabelText("즐겨찾기").textContent).toBe("★");
  rerender(<Card item={item()} fav={false} onToggleFav={() => {}} onOpen={() => {}} />);
  expect(screen.getByLabelText("즐겨찾기").textContent).toBe("☆");
});

test("카드를 누르면 onOpen이 불린다", () => {
  const onOpen = vi.fn();
  render(<Card item={item()} fav={false} onToggleFav={() => {}} onOpen={onOpen} />);
  fireEvent.click(screen.getByText("테스트 공고"));
  expect(onOpen).toHaveBeenCalledOnce();
});

test("별을 누르면 onToggleFav만 불리고 카드 열기(onOpen)로 번지지 않는다", () => {
  const onOpen = vi.fn();
  const onToggleFav = vi.fn();
  render(<Card item={item()} fav={false} onToggleFav={onToggleFav} onOpen={onOpen} />);
  fireEvent.click(screen.getByLabelText("즐겨찾기"));
  expect(onToggleFav).toHaveBeenCalledOnce();
  expect(onOpen).not.toHaveBeenCalled();
});
