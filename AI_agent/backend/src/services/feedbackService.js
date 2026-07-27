import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { collectSubmissionArtifactEvidence } from "./artifactContentService.js";
import { generateSubmissionFeedback } from "./openaiService.js";

const summarizeArtifactEvidence = (artifactEvidence = []) => {
  const readableEvidence = artifactEvidence.filter((evidence) => evidence.text);
  const mediaEvidence = artifactEvidence.filter(
    (evidence) => evidence.status === "attached" && ["image", "pdf"].includes(evidence.modality)
  );

  if (readableEvidence.length > 0) {
    const mediaSummary =
      mediaEvidence.length > 0 && env.openaiFileFeedbackEnabled
        ? ` 이미지/PDF ${mediaEvidence.length}건도 평가 입력에 포함했습니다.`
        : "";

    return `텍스트/코드 결과물 내용 ${readableEvidence.length}건을 읽고 평가했습니다.${mediaSummary}`;
  }

  if (mediaEvidence.length > 0) {
    return env.openaiFileFeedbackEnabled
      ? `이미지/PDF 결과물 ${mediaEvidence.length}건을 평가 입력에 포함했습니다.`
      : "이미지/PDF 결과물이 제출되었지만 파일 직접 평가는 꺼져 있어 제출 설명과 미션 정보를 기준으로 평가했습니다.";
  }

  if (artifactEvidence.length > 0) {
    return `제출 링크/파일을 직접 열람하려 했지만 ${artifactEvidence
      .map((evidence) => evidence.reason)
      .filter(Boolean)
      .join(" / ")} 제출 설명을 함께 기준으로 평가했습니다.`;
  }

  return "제출 설명과 미션 정보를 기준으로 평가했습니다.";
};

const missionFitLabels = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const tokenize = (value) =>
  String(value || "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

const getSubmissionText = (submission, artifactEvidence = []) =>
  [
    submission?.submittedDescription,
    submission?.submittedUrl,
    submission?.submittedFileName,
    ...artifactEvidence.map((evidence) => evidence.text || ""),
  ].join(" ");

export const assessMissionFit = (submission, artifactEvidence = []) => {
  const missionText = [
    submission?.missionTitle,
    submission?.mission?.title,
    submission?.mission?.description,
  ].join(" ");
  const submissionText = getSubmissionText(submission, artifactEvidence);
  const missionTokens = [...new Set(tokenize(missionText))];
  const submissionTokens = new Set(tokenize(submissionText));
  const matchedTokens = missionTokens.filter((token) => submissionTokens.has(token));
  const matchRate = missionTokens.length
    ? matchedTokens.length / missionTokens.length
    : 0;
  const normalizedSubmissionText = submissionText.toLowerCase();
  const requiredProcessTerms = ["흐름", "프로세스", "문제", "개선", "우선순위"];
  const processMission =
    missionText.includes("업무") ||
    missionText.includes("프로세스") ||
    missionText.toLowerCase().includes("process");
  const matchedProcessTerms = requiredProcessTerms.filter((term) =>
    normalizedSubmissionText.includes(term)
  );
  const unrelatedMarketingTerms = [
    "카페",
    "신메뉴",
    "라떼",
    "sns",
    "홍보",
    "이벤트",
    "mango",
    "latte",
    "campaign",
    "marketing",
  ];

  const hasUnrelatedMarketingTerms = unrelatedMarketingTerms.some((term) =>
    normalizedSubmissionText.includes(term)
  );

  if ((processMission || hasUnrelatedMarketingTerms) && matchedProcessTerms.length < 2 && hasUnrelatedMarketingTerms) {
    return {
      level: "low",
      label: missionFitLabels.low,
      canCreatePortfolio: false,
      reasons: [
        "제출물이 업무 프로세스 개선보다 홍보 콘텐츠 기획에 가깝습니다.",
        "현재 흐름, 병목, 개선안, 우선순위 근거가 충분히 확인되지 않습니다.",
      ],
    };
  }

  if (matchRate < 0.12 && matchedProcessTerms.length === 0) {
    return {
      level: "low",
      label: missionFitLabels.low,
      canCreatePortfolio: false,
      reasons: [
        "미션 제목과 제출 설명 사이의 핵심 키워드 연결이 약합니다.",
        "미션 요구사항을 충족했다는 근거가 부족합니다.",
      ],
    };
  }

  if (matchRate < 0.28 || (processMission && matchedProcessTerms.length < 3)) {
    return {
      level: "medium",
      label: missionFitLabels.medium,
      canCreatePortfolio: true,
      reasons: [
        "미션과 일부 연결되지만 요구사항을 더 구체적으로 보완하는 편이 좋습니다.",
      ],
    };
  }

  return {
    level: "high",
    label: missionFitLabels.high,
    canCreatePortfolio: true,
    reasons: ["제출 설명이 미션 요구사항과 충분히 연결됩니다."],
  };
};

export const normalizeMissionFit = (missionFit) => {
  const level = ["high", "medium", "low"].includes(missionFit?.level)
    ? missionFit.level
    : "medium";

  return {
    level,
    label: missionFit?.label || missionFitLabels[level],
    canCreatePortfolio:
      typeof missionFit?.canCreatePortfolio === "boolean"
        ? missionFit.canCreatePortfolio
        : level !== "low",
    reasons: Array.isArray(missionFit?.reasons)
      ? missionFit.reasons.map(String).filter(Boolean)
      : [],
  };
};

export const isLowMissionFit = (feedback) =>
  normalizeMissionFit(feedback?.missionFit).level === "low";

export const createSubmissionFeedback = (submission, artifactEvidence = []) => {
  const hasUrl = Boolean(submission?.submittedUrl);
  const hasFile = Boolean(submission?.submittedFileName);
  const hasDescription =
    String(submission?.submittedDescription || "").trim().length >= 80;
  const evidenceSummary = summarizeArtifactEvidence(artifactEvidence);
  const missionFit = assessMissionFit(submission, artifactEvidence);

  return {
    missionFit,
    overall:
      `${evidenceSummary} 미션 결과물이 제출 형식에 맞게 정리되었습니다. 다음 단계에서는 문제 정의, 수행 과정, 결과를 더 명확히 연결하면 포트폴리오 완성도가 올라갑니다.`,
    strengths: [
      hasUrl
        ? "외부에서 확인 가능한 링크를 제출해 결과물 접근성이 좋습니다."
        : "파일 형태로 결과물을 정리해 산출물을 보관할 수 있습니다.",
      hasDescription
        ? "결과물 설명에 수행 맥락이 포함되어 피드백과 포트폴리오 작성의 기초가 됩니다."
        : "핵심 결과물을 먼저 제출해 다음 피드백 단계로 넘어갈 수 있습니다.",
    ],
    improvements: [
      "문제를 왜 해결하려 했는지 한 문장으로 먼저 정리해 주세요.",
      "본인이 맡은 역할과 의사결정 근거를 더 구체적으로 적어 주세요.",
    ],
    revisions: [
      "결과물 설명을 문제 정의, 수행 과정, 결과, 배운 점 순서로 나눠 보완하세요.",
      hasFile && !hasUrl
        ? "가능하다면 GitHub, Notion, 배포 URL처럼 열람 가능한 링크도 함께 제출하세요."
        : "링크 대상 페이지에 README나 요약 문서를 추가해 평가자가 빠르게 이해할 수 있게 하세요.",
    ],
    portfolioPoints: [
      `${submission?.missionTitle || "수행 미션"} 경험을 프로젝트 제목으로 정리할 수 있습니다.`,
      "문제 정의와 개선 결과를 숫자, 비교, 화면 캡처 중 하나로 보강하면 좋습니다.",
      "사용한 도구와 배운 점을 별도 섹션으로 분리하면 면접 답변에도 활용하기 쉽습니다.",
    ],
    evidenceSummary,
  };
};

export const createAiSubmissionFeedback = async (submission) => {
  const artifactEvidence = await collectSubmissionArtifactEvidence(submission);

  try {
    if (!env.openaiFeedbackEnabled) {
      throw new Error("OPENAI_FEEDBACK_ENABLED=false");
    }

    const { result } = await generateSubmissionFeedback({
      submission,
      artifactEvidence,
    });
    const heuristicMissionFit = assessMissionFit(submission, artifactEvidence);
    const aiMissionFit = normalizeMissionFit(result.missionFit);
    const missionFit =
      heuristicMissionFit.level === "low" && aiMissionFit.level !== "low"
        ? heuristicMissionFit
        : aiMissionFit;

    return {
      ...result,
      missionFit,
      evidenceSummary: summarizeArtifactEvidence(artifactEvidence),
    };
  } catch (error) {
    console.warn(`AI submission feedback fallback: ${error.message}`);
    return createSubmissionFeedback(submission, artifactEvidence);
  }
};

export const parseStoredFeedback = (value) => {
  if (!value) {
    return null;
  }

  try {
    const feedback = JSON.parse(value);
    return feedback && typeof feedback === "object"
      ? {
          ...feedback,
          missionFit: normalizeMissionFit(feedback.missionFit),
        }
      : null;
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

const buildFeedbackResponse = (submission) => ({
  submission: publicSubmissionFields(submission),
  feedback: parseStoredFeedback(submission?.feedback),
});

export const getLatestFeedback = async (userId) => {
  const submission = await findLatestSubmittedMission(userId);

  if (!submission) {
    return {
      submission: null,
      feedback: null,
    };
  }

  return buildFeedbackResponse(submission);
};

export const saveLatestFeedback = async (userId) => {
  const submission = await findLatestSubmittedMission(userId);

  if (!submission) {
    const error = new Error("피드백을 생성할 제출 결과물이 없습니다.");
    error.statusCode = 404;
    throw error;
  }

  const feedback = await createAiSubmissionFeedback(submission);
  const updatedSubmission = await prisma.userMission.update({
    where: {
      id: submission.id,
    },
    data: {
      feedback: JSON.stringify(feedback),
    },
    include: {
      mission: true,
    },
  });

  return buildFeedbackResponse(updatedSubmission);
};
