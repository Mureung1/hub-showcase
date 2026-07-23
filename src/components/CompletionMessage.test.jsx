import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CompletionMessage from "./CompletionMessage.jsx";

describe("CompletionMessage", () => {
  it("완료 문구는 props와 무관하게 항상 보인다 (기본)", () => {
    render(<CompletionMessage />);

    expect(
      screen.getByText("완료했어요! 오늘도 한 걸음 나아갔어요."),
    ).toBeInTheDocument();
  });

  it("모든 props가 있으면 4개 항목이 모두 보인다 (happy path)", () => {
    render(
      <CompletionMessage
        title="[QA] 테스트 할일"
        microTask="생각나는 키워드 3개만 적어보기"
        elapsedLabel="00:07"
        entryLevel={2}
      />,
    );

    expect(screen.getByText("완료한 할일")).toBeInTheDocument();
    expect(screen.getByText("[QA] 테스트 할일")).toBeInTheDocument();
    expect(screen.getByText("첫 행동")).toBeInTheDocument();
    expect(screen.getByText("생각나는 키워드 3개만 적어보기")).toBeInTheDocument();
    expect(screen.getByText("집중 시간")).toBeInTheDocument();
    expect(screen.getByText("00:07")).toBeInTheDocument();
    expect(screen.getByText("진입 레벨")).toBeInTheDocument();
    expect(screen.getByText("Lv2")).toBeInTheDocument();
  });

  it("microTask가 없으면 '첫 행동' 항목 자체가 렌더링되지 않는다 (분기 — 카드 직접 클릭 경로)", () => {
    render(
      <CompletionMessage
        title="[QA] 테스트 할일"
        elapsedLabel="00:03"
        microTask={null}
        entryLevel={null}
      />,
    );

    expect(screen.getByText("완료한 할일")).toBeInTheDocument();
    expect(screen.queryByText("첫 행동")).not.toBeInTheDocument();
    expect(screen.queryByText("진입 레벨")).not.toBeInTheDocument();
  });

  it("entryLevel이 0이어도 '진입 레벨' 항목이 보인다 (경계)", () => {
    render(<CompletionMessage title="[QA] 테스트 할일" entryLevel={0} />);

    expect(screen.getByText("진입 레벨")).toBeInTheDocument();
    expect(screen.getByText("Lv0")).toBeInTheDocument();
  });
});
