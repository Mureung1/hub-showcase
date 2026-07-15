import { z } from "zod";
import {
  ANALYSIS_MODES,
  ANALYSIS_RAW_TEXT_MAX_LENGTH,
  ANALYSIS_RAW_TEXT_MIN_LENGTH,
  ELIGIBILITY_TYPES,
  MATCH_STATUSES,
  OPPORTUNITY_CATEGORIES,
  TASK_STATUSES,
} from "../../src/constants/opportunity.js";

export const opportunityCategorySchema = z.enum(OPPORTUNITY_CATEGORIES);
export const eligibilityTypeSchema = z.enum(ELIGIBILITY_TYPES);
export const matchStatusSchema = z.enum(MATCH_STATUSES);

const nullableNumber = (schema) => z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.union([z.null(), schema]),
);

const languageScoreSchema = z.object({
  type: z.string().trim().min(1, "어학시험 종류를 입력해주세요."),
  score: z.string().trim().min(1, "어학성적을 입력해주세요."),
});

export const profileSchema = z.object({
  id: z.string().trim().min(1).optional(),
  updatedAt: z.string().datetime().optional(),
  school: z.string().trim().min(1, "학교를 입력해주세요."),
  grade: nullableNumber(z.coerce.number().int().min(1).max(8)),
  majors: z.array(z.string().trim().min(1)).min(1, "전공을 하나 이상 입력해주세요."),
  interests: z.array(z.string().trim().min(1)).min(1, "관심 분야를 하나 이상 입력해주세요."),
  regions: z.array(z.string().trim().min(1)).min(1, "활동 가능 지역을 하나 이상 입력해주세요."),
  canJoinTeam: z.union([z.boolean(), z.null()]),
  availableHoursPerWeek: nullableNumber(z.coerce.number().min(0).max(168)).default(null),
  gpa: nullableNumber(z.coerce.number().min(0).max(4.5)).default(null),
  incomeBracket: nullableNumber(z.coerce.number().int().min(1).max(10)).default(null),
  languageScores: z.array(languageScoreSchema).default([]),
});

export const analyzeRequestSchema = z.object({
  profile: profileSchema.nullish().default(null),
  url: z.string().url("URL 형식이 올바르지 않습니다.").nullish().or(z.literal("")),
  sourceUrl: z.string().url("URL 형식이 올바르지 않습니다.").nullish().or(z.literal("")),
  rawText: z.string().optional().default(""),
}).superRefine((value, context) => {
  const rawTextLength = value.rawText.trim().length;
  const sourceUrl = value.url?.trim() || value.sourceUrl?.trim();

  if (!sourceUrl && !rawTextLength) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "공고 URL을 입력하거나 본문을 직접 붙여넣어 주세요.",
      path: ["url"],
    });
  }

  if (rawTextLength > 0 && rawTextLength < ANALYSIS_RAW_TEXT_MIN_LENGTH) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `공고 본문은 공백을 제외하고 ${ANALYSIS_RAW_TEXT_MIN_LENGTH}자 이상 입력해 주세요.`,
      path: ["rawText"],
    });
  }

  if (rawTextLength > ANALYSIS_RAW_TEXT_MAX_LENGTH) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `공고 본문은 ${ANALYSIS_RAW_TEXT_MAX_LENGTH.toLocaleString("ko-KR")}자 이하로 입력해 주세요.`,
      path: ["rawText"],
    });
  }
});

export const eligibilitySchema = z.object({
  type: eligibilityTypeSchema,
  condition: z.string(),
  evidence: z.string(),
  required: z.boolean(),
});

export const preferredConditionSchema = z.object({
  condition: z.string(),
  evidence: z.string(),
});

export const opportunitySchema = z.object({
  title: z.string().nullable(),
  organizer: z.string().nullable(),
  category: opportunityCategorySchema,
  deadline: z.string().nullable(),
  target: z.string().nullable(),
  eligibility: z.array(eligibilitySchema),
  preferred: z.array(preferredConditionSchema),
  requiredDocuments: z.array(z.string()),
  benefits: z.array(z.string()),
  activityPeriod: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  uncertainFields: z.array(z.string()),
});

export const matchSchema = z.object({
  status: matchStatusSchema,
  score: z.number().min(0).max(100).nullable(),
  summary: z.string(),
  matchedReasons: z.array(z.string()),
  missingInfo: z.array(z.string()),
  disqualifyingReasons: z.array(z.string()),
  nextActions: z.array(z.string()),
});

export const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  dueDate: z.string().nullable(),
  status: z.enum(TASK_STATUSES),
});

export const analyzeResponseSchema = z.object({
  id: z.string().min(1),
  analyzedAt: z.string().datetime(),
  mode: z.enum(ANALYSIS_MODES),
  fallbackUsed: z.boolean().optional().default(false),
  fallbackReason: z.string().nullable().optional().default(null),
  opportunity: opportunitySchema,
  match: matchSchema,
  tasks: z.array(taskSchema),
});

const providerTaskSchema = z.object({
  id: z.string().nullable().optional(),
  title: z.string(),
  dueDate: z.string().nullable(),
  status: z.enum(TASK_STATUSES),
});

export const providerAnalysisSchema = z.object({
  mode: z.enum(ANALYSIS_MODES),
  opportunity: opportunitySchema,
  match: matchSchema,
  tasks: z.array(providerTaskSchema),
});

const opportunityJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "organizer",
    "category",
    "deadline",
    "target",
    "eligibility",
    "preferred",
    "requiredDocuments",
    "benefits",
    "activityPeriod",
    "sourceUrl",
    "uncertainFields",
  ],
  properties: {
    title: { type: ["string", "null"] },
    organizer: { type: ["string", "null"] },
    category: { type: "string", enum: OPPORTUNITY_CATEGORIES },
    deadline: { type: ["string", "null"] },
    target: { type: ["string", "null"] },
    eligibility: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "condition", "evidence", "required"],
        properties: {
          type: { type: "string", enum: ELIGIBILITY_TYPES },
          condition: { type: "string" },
          evidence: { type: "string" },
          required: { type: "boolean" },
        },
      },
    },
    preferred: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["condition", "evidence"],
        properties: {
          condition: { type: "string" },
          evidence: { type: "string" },
        },
      },
    },
    requiredDocuments: { type: "array", items: { type: "string" } },
    benefits: { type: "array", items: { type: "string" } },
    activityPeriod: { type: ["string", "null"] },
    sourceUrl: { type: ["string", "null"] },
    uncertainFields: { type: "array", items: { type: "string" } },
  },
};

const matchJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "status",
    "score",
    "summary",
    "matchedReasons",
    "missingInfo",
    "disqualifyingReasons",
    "nextActions",
  ],
  properties: {
    status: { type: "string", enum: MATCH_STATUSES },
    score: { type: ["number", "null"], minimum: 0, maximum: 100 },
    summary: { type: "string" },
    matchedReasons: { type: "array", items: { type: "string" } },
    missingInfo: { type: "array", items: { type: "string" } },
    disqualifyingReasons: { type: "array", items: { type: "string" } },
    nextActions: { type: "array", items: { type: "string" } },
  },
};

const providerTaskJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "title", "dueDate", "status"],
  properties: {
    id: { type: ["string", "null"] },
    title: { type: "string" },
    dueDate: { type: ["string", "null"] },
    status: { type: "string", enum: TASK_STATUSES },
  },
};

export const providerAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["mode", "opportunity", "match", "tasks"],
  properties: {
    mode: { type: "string", enum: ANALYSIS_MODES },
    opportunity: opportunityJsonSchema,
    match: matchJsonSchema,
    tasks: { type: "array", items: providerTaskJsonSchema },
  },
};

export const analyzeResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "analyzedAt", "mode", "opportunity", "match", "tasks"],
  properties: {
    id: { type: "string" },
    analyzedAt: { type: "string", format: "date-time" },
    mode: { type: "string", enum: ANALYSIS_MODES },
    opportunity: opportunityJsonSchema,
    match: matchJsonSchema,
    tasks: {
      type: "array",
      items: {
        ...providerTaskJsonSchema,
        properties: {
          ...providerTaskJsonSchema.properties,
          id: { type: "string" },
        },
      },
    },
  },
};

export function formatZodError(error) {
  return error.issues.map((issue) => issue.message).join(" ");
}
