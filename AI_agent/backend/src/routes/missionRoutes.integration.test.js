import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { createApp } from "../app.js";
import { prisma } from "../db/prisma.js";
import { hashPassword } from "../services/passwordService.js";
import { createAuthToken } from "../services/tokenService.js";

const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === "1";

let baseUrl = "";
let server;
let user;
const missionId = `integration-mission-${Date.now()}`;
const feedbackMissionId = `integration-feedback-mission-${Date.now()}`;
const portfolioMissionId = `integration-portfolio-mission-${Date.now()}`;

before(
  async () => {
    if (!runIntegrationTests) {
      return;
    }

    server = createApp().listen(0);
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;

    const uniqueSuffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    user = await prisma.user.create({
      data: {
        email: `mission-progress-${uniqueSuffix}@example.test`,
        username: `mission_progress_${uniqueSuffix}`.replace(/[^a-zA-Z0-9_]/g, "_"),
        name: "Mission Progress Integration Test",
        passwordHash: await hashPassword("test-password"),
        emailVerified: true,
        verifiedAt: new Date(),
      },
    });
  },
  { timeout: 15000 }
);

after(
  async () => {
    if (!runIntegrationTests) {
      return;
    }

    if (user?.id) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    }

    await prisma.mission.delete({ where: { id: missionId } }).catch(() => {});
    await prisma.mission.delete({ where: { id: feedbackMissionId } }).catch(() => {});
    await prisma.mission.delete({ where: { id: portfolioMissionId } }).catch(() => {});
    await prisma.$disconnect().catch(() => {});

    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  },
  { timeout: 15000 }
);

test(
  "mission progress API saves and reads checked checklist items",
  { skip: !runIntegrationTests },
  async () => {
    const token = createAuthToken(user);
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const saveResponse = await fetch(`${baseUrl}/api/missions/${missionId}/progress`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        missionTitle: "Integration Mission",
        missionSummary: "HTTP route to DB progress test",
        checkedItems: ["문제 정의", "입력 폼"],
        checklistItems: ["문제 정의", "입력 폼"],
      }),
    });
    const saveData = await saveResponse.json();

    assert.equal(saveResponse.status, 200);
    assert.equal(saveData.ok, true);
    assert.equal(saveData.progress.missionId, missionId);
    assert.equal(saveData.progress.status, "completed");
    assert.deepEqual(saveData.progress.checkedItems, ["문제 정의", "입력 폼"]);

    const getResponse = await fetch(`${baseUrl}/api/missions/${missionId}/progress`, {
      headers,
    });
    const getData = await getResponse.json();

    assert.equal(getResponse.status, 200);
    assert.equal(getData.ok, true);
    assert.equal(getData.progress.missionId, missionId);
    assert.equal(getData.progress.status, "completed");
    assert.deepEqual(getData.progress.checkedItems, ["문제 정의", "입력 폼"]);
  }
);

test(
  "mission recommendation API returns recommended missions from context",
  { skip: !runIntegrationTests },
  async () => {
    const token = createAuthToken(user);
    const params = new URLSearchParams({
      major: "컴퓨터공학과",
      targetRole: "백엔드 개발자",
      skills: "React, API, DB",
    });
    const response = await fetch(`${baseUrl}/api/missions/recommendations?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.inferredTrack, "it");
    assert.ok(data.missions.length > 0);
    assert.equal(data.missions[0].id, "it-service-mvp");
  }
);

test(
  "portfolio API saves and reads a draft for the latest submitted mission",
  { skip: !runIntegrationTests },
  async () => {
    const token = createAuthToken(user);
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const submissionResponse = await fetch(`${baseUrl}/api/submissions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        missionId: portfolioMissionId,
        missionTitle: "Portfolio Integration Mission",
        submittedUrl: "https://example.com/portfolio-integration",
        submittedDescription:
          "문제 정의를 정리했습니다. 수행 과정을 문서화했습니다. 결과를 링크로 제출했습니다. 배운 점을 포트폴리오 문장으로 정리했습니다.",
      }),
    });
    const submissionData = await submissionResponse.json();

    assert.equal(submissionResponse.status, 201);
    assert.equal(submissionData.ok, true);
    assert.equal(submissionData.submission.missionId, portfolioMissionId);

    const firstGetResponse = await fetch(`${baseUrl}/api/portfolio/latest`, {
      headers,
    });
    const firstGetData = await firstGetResponse.json();

    assert.equal(firstGetResponse.status, 200);
    assert.equal(firstGetData.ok, true);
    assert.equal(firstGetData.submission.missionId, portfolioMissionId);
    assert.equal(firstGetData.portfolioDraft, null);

    const saveDraftResponse = await fetch(`${baseUrl}/api/portfolio/latest`, {
      method: "POST",
      headers,
    });
    const saveDraftData = await saveDraftResponse.json();

    assert.equal(saveDraftResponse.status, 200);
    assert.equal(saveDraftData.ok, true);
    assert.equal(saveDraftData.submission.missionId, portfolioMissionId);
    assert.equal(saveDraftData.portfolioDraft.title, "Portfolio Integration Mission");
    assert.equal(
      saveDraftData.portfolioDraft.artifact,
      "https://example.com/portfolio-integration"
    );
    assert.match(
      saveDraftData.portfolioDraft.interviewPitch,
      /Portfolio Integration Mission/
    );

    const secondGetResponse = await fetch(`${baseUrl}/api/portfolio/latest`, {
      headers,
    });
    const secondGetData = await secondGetResponse.json();

    assert.equal(secondGetResponse.status, 200);
    assert.equal(secondGetData.ok, true);
    assert.deepEqual(secondGetData.portfolioDraft, saveDraftData.portfolioDraft);

    const resubmissionResponse = await fetch(`${baseUrl}/api/submissions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        missionId: portfolioMissionId,
        missionTitle: "Portfolio Integration Mission Updated",
        submittedUrl: "https://example.com/portfolio-integration-updated",
        submittedDescription:
          "새로 제출한 결과물입니다. 기존 피드백과 포트폴리오 초안은 다시 생성되어야 합니다.",
      }),
    });
    const resubmissionData = await resubmissionResponse.json();

    assert.equal(resubmissionResponse.status, 201);
    assert.equal(resubmissionData.ok, true);
    assert.equal(resubmissionData.submission.feedback, null);
    assert.equal(resubmissionData.submission.portfolioDraft, null);

    const afterResubmissionResponse = await fetch(`${baseUrl}/api/portfolio/latest`, {
      headers,
    });
    const afterResubmissionData = await afterResubmissionResponse.json();

    assert.equal(afterResubmissionResponse.status, 200);
    assert.equal(afterResubmissionData.ok, true);
    assert.equal(afterResubmissionData.submission.missionId, portfolioMissionId);
    assert.equal(afterResubmissionData.portfolioDraft, null);
  }
);

test(
  "feedback API saves and reads feedback for the latest submitted mission",
  { skip: !runIntegrationTests },
  async () => {
    const token = createAuthToken(user);
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const submissionResponse = await fetch(`${baseUrl}/api/submissions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        missionId: feedbackMissionId,
        missionTitle: "Feedback Integration Mission",
        submittedUrl: "https://example.com/feedback-integration",
        submittedDescription:
          "문제 정의, 수행 과정, 결과와 배운 점을 포함해 피드백 저장 및 조회 흐름을 검증하기 위한 충분한 설명입니다.",
      }),
    });
    const submissionData = await submissionResponse.json();

    assert.equal(submissionResponse.status, 201);
    assert.equal(submissionData.ok, true);
    assert.equal(submissionData.submission.missionId, feedbackMissionId);

    const firstGetResponse = await fetch(`${baseUrl}/api/feedback/latest`, {
      headers,
    });
    const firstGetData = await firstGetResponse.json();

    assert.equal(firstGetResponse.status, 200);
    assert.equal(firstGetData.ok, true);
    assert.equal(firstGetData.submission.missionId, feedbackMissionId);
    assert.equal(firstGetData.feedback, null);

    const saveFeedbackResponse = await fetch(`${baseUrl}/api/feedback/latest`, {
      method: "POST",
      headers,
    });
    const saveFeedbackData = await saveFeedbackResponse.json();

    assert.equal(saveFeedbackResponse.status, 200);
    assert.equal(saveFeedbackData.ok, true);
    assert.equal(saveFeedbackData.submission.missionId, feedbackMissionId);
    assert.equal(typeof saveFeedbackData.feedback.overall, "string");
    assert.match(
      saveFeedbackData.feedback.portfolioPoints[0],
      /Feedback Integration Mission/
    );

    const secondGetResponse = await fetch(`${baseUrl}/api/feedback/latest`, {
      headers,
    });
    const secondGetData = await secondGetResponse.json();

    assert.equal(secondGetResponse.status, 200);
    assert.equal(secondGetData.ok, true);
    assert.deepEqual(secondGetData.feedback, saveFeedbackData.feedback);
  }
);
