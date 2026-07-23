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

export const createSubmissionFeedback = (submission, artifactEvidence = []) => {
  const hasUrl = Boolean(submission?.submittedUrl);
  const hasFile = Boolean(submission?.submittedFileName);
  const hasDescription =
    String(submission?.submittedDescription || "").trim().length >= 80;
  const evidenceSummary = summarizeArtifactEvidence(artifactEvidence);

  return {
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

    return {
      ...result,
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
    return feedback && typeof feedback === "object" ? feedback : null;
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
