import { prisma } from "../db/prisma.js";

const specFields = [
  "targetRole",
  "grade",
  "gpa",
  "certificates",
  "languageScore",
  "projects",
  "activities",
  "skills",
];

const requiredSpecFields = ["targetRole", "grade", "gpa", "projects", "activities"];

const requiredSpecFieldLabels = {
  targetRole: "목표 직무",
  grade: "학년",
  gpa: "학점",
  projects: "프로젝트 경험",
  activities: "대외활동/인턴 경험",
};

const normalizeSpecInput = (input) => {
  return specFields.reduce(
    (spec, field) => ({
      ...spec,
      [field]: String(input?.[field] || "").trim(),
    }),
    {}
  );
};

const publicSpecFields = (spec) => {
  if (!spec) {
    return null;
  }

  return {
    id: spec.id,
    userId: spec.userId,
    targetRole: spec.targetRole,
    grade: spec.grade,
    gpa: spec.gpa,
    certificates: spec.certificates,
    languageScore: spec.languageScore,
    projects: spec.projects,
    activities: spec.activities,
    skills: spec.skills,
    createdAt: spec.createdAt,
    updatedAt: spec.updatedAt,
  };
};

export const saveUserSpec = async ({ userId, spec }) => {
  const data = normalizeSpecInput(spec);
  const missingFields = requiredSpecFields.filter((field) => !data[field]);

  if (missingFields.length > 0) {
    const missingLabels = missingFields.map(
      (field) => requiredSpecFieldLabels[field] || field
    );
    const error = new Error(`필수 항목을 입력해 주세요: ${missingLabels.join(", ")}`);
    error.statusCode = 400;
    error.details = { missingFields, missingLabels };
    throw error;
  }

  const savedSpec = await prisma.userSpec.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      ...data,
    },
  });

  return publicSpecFields(savedSpec);
};

export const getUserSpec = async (userId) => {
  const spec = await prisma.userSpec.findUnique({
    where: { userId },
  });

  return publicSpecFields(spec);
};
