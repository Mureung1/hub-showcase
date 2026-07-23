import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import QuestionnairePage from "./QuestionnairePage";
import { routePaths } from "../routes/routePaths";

const server = setupServer(
  http.get("http://localhost:4000/api/mentors/mentor-1", () =>
    HttpResponse.json({ data: { id: "mentor-1", name: "김민준" } }),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

const PLACEHOLDERS = {
  introduction: "학년, 전공, 관심 분야를 간단히 적어주세요.",
  concern: "진로, 연구실, 전공 수업, 대학원 준비 중 가장 궁금한 점을 적어주세요.",
  goal: "면담 후 어떤 판단이나 정보를 얻고 싶은지 적어주세요.",
  preferredTime: "예: 화요일 19:00, 금요일 15:00",
};

const renderQuestionnairePage = () =>
  render(
    <MemoryRouter
      initialEntries={[
        { pathname: routePaths.menteeApplicationNew, state: { mentorIds: ["mentor-1"] } },
      ]}
    >
      <Routes>
        <Route path={routePaths.menteeApplicationNew} element={<QuestionnairePage />} />
      </Routes>
    </MemoryRouter>,
  );

const fillField = (placeholder, value) => {
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });
};

describe("QuestionnairePage 질문지 필수값 검증 (integration)", () => {
  it.each([["introduction"], ["concern"], ["goal"], ["preferredTime"]])(
    "%s 항목이 비어있으면 제출이 막히고 에러 메시지가 표시된다",
    async (emptyField) => {
      renderQuestionnairePage();
      await screen.findByText("김민준 멘토"); // 멘토 정보 로딩 완료 대기

      Object.entries(PLACEHOLDERS).forEach(([name, placeholder]) => {
        if (name === emptyField) return; // 이 필드만 비워둔다
        fillField(placeholder, `${name} 답변입니다`);
      });

      fireEvent.click(screen.getByRole("button", { name: "면담 신청 제출" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "사전 질문지의 모든 필수 항목을 입력해 주세요.",
      );
    },
  );

  it("4개 항목을 모두 입력하면 클라이언트 검증을 통과하고 신청 API를 호출한다", async () => {
    let capturedBody = null;
    server.use(
      http.post("http://localhost:4000/api/applications", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ data: { id: "application-1", status: "pending" } }, { status: 201 });
      }),
    );

    renderQuestionnairePage();
    await screen.findByText("김민준 멘토");

    Object.entries(PLACEHOLDERS).forEach(([name, placeholder]) => {
      fillField(placeholder, `${name} 답변입니다`);
    });

    fireEvent.click(screen.getByRole("button", { name: "면담 신청 제출" }));

    await waitFor(() => {
      expect(capturedBody).toEqual({
        mentorIds: ["mentor-1"],
        questionnaire: {
          introduction: "introduction 답변입니다",
          concern: "concern 답변입니다",
          goal: "goal 답변입니다",
          preferredTime: "preferredTime 답변입니다",
        },
      });
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
