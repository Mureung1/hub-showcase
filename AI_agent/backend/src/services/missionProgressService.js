import { prisma } from "../db/prisma.js";

const normalizeTextList = (items) =>
  Array.isArray(items)
    ? [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))]
    : [];

export const normalizeProgressInput = (input) => ({
  missionId: String(input?.missionId || "").trim(),
  missionTitle: String(input?.missionTitle || "").trim(),
  missionSummary: String(input?.missionSummary || "").trim(),
  checkedItems: normalizeTextList(input?.checkedItems),
  checklistItems: normalizeTextList(input?.checklistItems),
});

export const calculateMissionStatus = ({
  existingStatus,
  checkedItems,
  checklistItems,
}) => {
  if (existingStatus === "submitted") {
    return "submitted";
  }

  if (!checkedItems.length) {
    return "pending";
  }

  const checkedItemSet = new Set(checkedItems);
  const isCompleted =
    checklistItems.length > 0 &&
    checklistItems.every((item) => checkedItemSet.has(item));

  return isCompleted ? "completed" : "in_progress";
};

const publicProgressFields = (progress) => {
  if (!progress) {
    return null;
  }

  return {
    id: progress.id,
    userId: progress.userId,
    missionId: progress.missionId,
    missionTitle: progress.missionTitle || progress.mission?.title || "",
    status: progress.status,
    checkedItems: progress.checkedItems || [],
    submittedAt: progress.submittedAt,
    createdAt: progress.createdAt,
    updatedAt: progress.updatedAt,
  };
};

export const getMissionProgress = async ({ userId, missionId }) => {
  const progress = await prisma.userMission.findUnique({
    where: {
      userId_missionId: {
        userId,
        missionId,
      },
    },
    include: {
      mission: true,
    },
  });

  return publicProgressFields(progress);
};

export const saveMissionProgress = async ({ userId, progress }) => {
  const data = normalizeProgressInput(progress);

  if (!data.missionId || !data.missionTitle) {
    const error = new Error("저장할 미션 정보가 필요합니다.");
    error.statusCode = 400;
    throw error;
  }

  await prisma.mission.upsert({
    where: { id: data.missionId },
    update: {
      title: data.missionTitle,
      description: data.missionSummary || data.missionTitle,
    },
    create: {
      id: data.missionId,
      title: data.missionTitle,
      description: data.missionSummary || data.missionTitle,
    },
  });

  const existingProgress = await prisma.userMission.findUnique({
    where: {
      userId_missionId: {
        userId,
        missionId: data.missionId,
      },
    },
  });
  const nextStatus = calculateMissionStatus({
    existingStatus: existingProgress?.status,
    checkedItems: data.checkedItems,
    checklistItems: data.checklistItems,
  });

  const savedProgress = await prisma.userMission.upsert({
    where: {
      userId_missionId: {
        userId,
        missionId: data.missionId,
      },
    },
    update: {
      status: nextStatus,
      missionTitle: data.missionTitle,
      checkedItems: data.checkedItems,
    },
    create: {
      userId,
      missionId: data.missionId,
      status: nextStatus,
      missionTitle: data.missionTitle,
      checkedItems: data.checkedItems,
    },
    include: {
      mission: true,
    },
  });

  return publicProgressFields(savedProgress);
};
