import { prisma } from "../db/prisma.js";

const normalizeSubmissionInput = (input) => ({
  missionId: String(input?.missionId || "").trim(),
  missionTitle: String(input?.missionTitle || "").trim(),
  submittedUrl: String(input?.submittedUrl || "").trim(),
  submittedDescription: String(input?.submittedDescription || "").trim(),
  submittedFileName: String(input?.submittedFileName || "").trim(),
  submittedFileType: String(input?.submittedFileType || "").trim(),
  submittedFileData: String(input?.submittedFileData || "").trim(),
});

const isValidUrl = (value) => {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
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
    feedback: submission.feedback,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
  };
};

export const saveSubmission = async ({ userId, submission }) => {
  const data = normalizeSubmissionInput(submission);

  if (!data.missionId || !data.missionTitle) {
    const error = new Error("제출할 미션 정보가 필요합니다.");
    error.statusCode = 400;
    throw error;
  }

  if (!data.submittedUrl && !data.submittedFileName) {
    const error = new Error("결과물 링크 또는 파일 중 하나는 입력해야 합니다.");
    error.statusCode = 400;
    throw error;
  }

  if (!isValidUrl(data.submittedUrl)) {
    const error = new Error("결과물 링크는 http 또는 https 주소로 입력해 주세요.");
    error.statusCode = 400;
    throw error;
  }

  await prisma.mission.upsert({
    where: { id: data.missionId },
    update: {
      title: data.missionTitle,
      description: data.submittedDescription || data.missionTitle,
    },
    create: {
      id: data.missionId,
      title: data.missionTitle,
      description: data.submittedDescription || data.missionTitle,
    },
  });

  const savedSubmission = await prisma.userMission.upsert({
    where: {
      userId_missionId: {
        userId,
        missionId: data.missionId,
      },
    },
    update: {
      status: "submitted",
      missionTitle: data.missionTitle,
      submittedUrl: data.submittedUrl || null,
      submittedDescription: data.submittedDescription || null,
      submittedFileName: data.submittedFileName || null,
      submittedFileType: data.submittedFileType || null,
      submittedFileData: data.submittedFileData || null,
      submittedAt: new Date(),
    },
    create: {
      userId,
      missionId: data.missionId,
      status: "submitted",
      missionTitle: data.missionTitle,
      submittedUrl: data.submittedUrl || null,
      submittedDescription: data.submittedDescription || null,
      submittedFileName: data.submittedFileName || null,
      submittedFileType: data.submittedFileType || null,
      submittedFileData: data.submittedFileData || null,
      submittedAt: new Date(),
    },
    include: {
      mission: true,
    },
  });

  return publicSubmissionFields(savedSubmission);
};

export const getMySubmissions = async (userId) => {
  const submissions = await prisma.userMission.findMany({
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

  return submissions.map(publicSubmissionFields);
};

export const getLatestSubmission = async (userId) => {
  const submission = await prisma.userMission.findFirst({
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

  return publicSubmissionFields(submission);
};
