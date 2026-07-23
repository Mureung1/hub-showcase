import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import MentorHomePage from "./MentorHomePage";
import { AuthProvider } from "../context/AuthContext";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

const pendingApplication = {
  id: "application-1",
  applicationStatus: "pending",
  mentorStatus: "pending",
  acceptedMentorId: null,
  mentee: {
    id: "mentee-1",
    name: "홍길동",
    school: "서울대학교",
    major: "컴퓨터공학",
    grade: "2",
    enrollmentStatus: "enrolled",
  },
  questionnaire: { introduction: "자기소개", concern: "고민", goal: "목표", preferredTime: "평일 저녁" },
  meeting: undefined,
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-20T00:00:00.000Z",
};

const confirmedApplication = {
  ...pendingApplication,
  applicationStatus: "confirmed",
  mentorStatus: "confirmed",
  acceptedMentorId: "mentor-1",
};

const renderMentorHomePage = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <MentorHomePage />
      </AuthProvider>
    </MemoryRouter>,
  );

describe("MentorHomePage 신청 수락 (integration)", () => {
  it("수락 버튼을 누르면 신청이 confirmed로 바뀌고 목록을 다시 불러와 확정 탭으로 전환된다", async () => {
    let accepted = false;
    server.use(
      http.get("http://localhost:4000/api/applications", () =>
        HttpResponse.json({
          data: accepted ? [confirmedApplication] : [pendingApplication],
          meta: { total: 1 },
        }),
      ),
      http.patch("http://localhost:4000/api/applications/application-1/accept", () => {
        accepted = true;
        return HttpResponse.json({
          data: {
            id: "application-1",
            status: "confirmed",
            acceptedMentorId: "mentor-1",
            updatedAt: "2026-07-23T00:00:00.000Z",
          },
        });
      }),
    );

    renderMentorHomePage();

    // 초기 로딩: 대기(pending) 탭에 신청 1건이 표시된다.
    expect(await screen.findByText("홍길동 멘티")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "수락" }));

    // 수락 후 활성 탭이 "확정"으로 전환된다.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /확정/ })).toHaveAttribute("aria-current", "page");
    });

    // 목록을 다시 불러와, 같은 신청이 confirmed 상태 배지로 표시된다.
    expect(await screen.findByText("홍길동 멘티")).toBeInTheDocument();
    expect(screen.getByText("확정", { selector: ".mentor-application-status" })).toBeInTheDocument();
  });
});
