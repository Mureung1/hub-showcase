import { prisma } from "../db/prisma.js";
import {
  createSubmissionFeedback,
  isLowMissionFit,
  parseStoredFeedback,
} from "./feedbackService.js";

const splitSentences = (value) =>
  String(value || "")
    .split(/(?<=[.!?。])\s+|\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

export const createPortfolioDraft = ({ submission, feedback }) => {
  const descriptionSentences = splitSentences(submission?.submittedDescription);
  const approach = descriptionSentences.length
    ? descriptionSentences.slice(0, 4)
    : [
        "문제 상황과 대상자를 정의했습니다.",
        "필요한 결과물 형식을 정리했습니다.",
        "제출 가능한 산출물로 구성했습니다.",
      ];
  const portfolioPoints = Array.isArray(feedback?.portfolioPoints)
    ? feedback.portfolioPoints
    : [
        `${submission?.missionTitle || "수행 미션"} 경험을 프로젝트 제목으로 정리할 수 있습니다.`,
        "문제 정의와 수행 결과를 연결해 설명할 수 있습니다.",
      ];

  return {
    title: submission?.missionTitle || "미션 프로젝트",
    subtitle: "제출 결과물을 바탕으로 구성한 포트폴리오 프로젝트입니다.",
    problem:
      descriptionSentences[0] ||
      "대상자의 상황을 분석하고, 실제로 활용 가능한 결과물로 정리하는 것을 목표로 했습니다.",
    approach,
    skills: ["문제 정의", "자료 조사", "결과 정리"],
    artifact:
      submission?.submittedUrl ||
      submission?.submittedFileName ||
      "제출 결과물",
    outcome:
      feedback?.overall ||
      "수행 결과를 포트폴리오에 넣을 수 있는 프로젝트 경험으로 정리했습니다.",
    interviewPitch: `${submission?.missionTitle || "이번 프로젝트"}에서는 문제를 먼저 정의하고, 대상자에게 필요한 정보를 실행 가능한 결과물로 바꾸는 데 집중했습니다. 자료 조사와 결과 정리 과정을 통해 실무에서 필요한 문서화 역량과 사용자 관점의 사고를 보여줄 수 있습니다.`,
    portfolioPoints,
    learningItems: [
      "문제를 먼저 정의해야 결과물의 방향과 평가 기준이 명확해진다는 점을 확인했습니다.",
      "수행 과정과 의사결정 근거를 함께 기록해야 포트폴리오 설득력이 높아집니다.",
      descriptionSentences.length
        ? "제출 설명을 바탕으로 수행 과정, 결과, 개선점을 분리해 정리하는 연습이 필요합니다."
        : "결과물만 제출하기보다 과정과 배운 점을 함께 남겨야 면접 답변으로 확장하기 쉽습니다.",
    ],
  };
};

export const parseStoredPortfolioDraft = (value) => {
  if (!value) {
    return null;
  }

  try {
    const draft = JSON.parse(value);
    return draft && typeof draft === "object" ? draft : null;
  } catch {
    return null;
  }
};

const publicSubmissionFields = (submission) => {
  if (!submission) {
    return null;
  }

  return {
    id: submission.id,
    userId: submission.userId,
    missionId: submission.missionId,
    missionTitle: submission.missionTitle || submission.mission?.title || "",
    status: submission.status,
    submittedUrl: submission.submittedUrl,
    submittedDescription: submission.submittedDescription,
    submittedFileName: submission.submittedFileName,
    submittedFileType: submission.submittedFileType,
    submittedFileData: submission.submittedFileData,
    submittedAt: submission.submittedAt,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
  };
};

const findLatestSubmittedMission = (userId) => {
  return prisma.userMission.findFirst({
    where: {
      userId,
      status: "submitted",
    },
    include: {
      mission: true,
    },
    orderBy: {
      submittedAt: "desc",
    },
  });
};

const buildPortfolioResponse = (submission) => ({
  submission: publicSubmissionFields(submission),
  portfolioDraft: parseStoredPortfolioDraft(submission?.portfolioDraft),
});

export const getLatestPortfolioDraft = async (userId) => {
  const submission = await findLatestSubmittedMission(userId);

  if (!submission) {
    return {
      submission: null,
      portfolioDraft: null,
    };
  }

  return buildPortfolioResponse(submission);
};

export const saveLatestPortfolioDraft = async (userId) => {
  const submission = await findLatestSubmittedMission(userId);

  if (!submission) {
    const error = new Error("포트폴리오로 만들 제출 결과물이 없습니다.");
    error.statusCode = 404;
    throw error;
  }

  const feedback =
    parseStoredFeedback(submission.feedback) || createSubmissionFeedback(submission);

  if (isLowMissionFit(feedback)) {
    const error = new Error("미션 적합도가 낮아 포트폴리오에 반영할 수 없습니다. 결과물을 다시 제출해 주세요.");
    error.statusCode = 422;
    error.details = {
      missionFit: feedback.missionFit,
      action: "resubmit",
    };
    throw error;
  }

  const portfolioDraft = createPortfolioDraft({ submission, feedback });
  const updatedSubmission = await prisma.userMission.update({
    where: {
      id: submission.id,
    },
    data: {
      feedback: JSON.stringify(feedback),
      portfolioDraft: JSON.stringify(portfolioDraft),
    },
    include: {
      mission: true,
    },
  });

  return buildPortfolioResponse(updatedSubmission);
};
