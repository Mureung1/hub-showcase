import { prisma } from "../db/prisma.js";
import { generateCareerAnalysis } from "./openaiService.js";
import { getUserSpec } from "./specService.js";

const requiredSpecFields = ["targetRole", "grade", "gpa", "projects", "activities"];

const normalizeAnalysis = (analysis) => ({
  readiness: Number(analysis.readiness),
  targetRole: String(analysis.targetRole || ""),
  fitLevel: String(analysis.fitLevel || "보완 필요"),
  portfolioLevel: String(analysis.portfolioLevel || "보완 필요"),
  burnoutLevel: String(analysis.burnoutLevel || "낮음"),
  strengths: Array.isArray(analysis.strengths) ? analysis.strengths.map(String) : [],
  gaps: Array.isArray(analysis.gaps) ? analysis.gaps.map(String) : [],
  recommendations: Array.isArray(analysis.recommendations)
    ? analysis.recommendations.map(String)
    : [],
});

const publicAnalysisFields = (analysis) => {
  if (!analysis) {
    return null;
  }

  return {
    id: analysis.id,
    userId: analysis.userId,
    readiness: analysis.readiness,
    targetRole: analysis.targetRole,
    fitLevel: analysis.fitLevel,
    portfolioLevel: analysis.portfolioLevel,
    burnoutLevel: analysis.burnoutLevel,
    strengths: analysis.strengths,
    gaps: analysis.gaps,
    recommendations: analysis.recommendations,
    analyzedAt: analysis.createdAt,
  };
};

export const getLatestAnalysis = async (userId) => {
  const analysis = await prisma.analysisResult.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return publicAnalysisFields(analysis);
};

export const runCareerAnalysis = async (user) => {
  const spec = await getUserSpec(user.id);

  if (!spec) {
    const error = new Error("스펙을 먼저 등록해 주세요.");
    error.statusCode = 400;
    throw error;
  }

  const missingFields = requiredSpecFields.filter(
    (field) => !String(spec[field] || "").trim()
  );

  if (missingFields.length > 0) {
    const error = new Error("스펙 핵심 항목을 모두 등록한 뒤 분석할 수 있습니다.");
    error.statusCode = 400;
    throw error;
  }

  const { result, rawResponse } = await generateCareerAnalysis({ user, spec });
  const normalizedAnalysis = normalizeAnalysis(result);

  const savedAnalysis = await prisma.analysisResult.create({
    data: {
      userId: user.id,
      ...normalizedAnalysis,
      rawResponse,
    },
  });

  return publicAnalysisFields(savedAnalysis);
};
