import { z } from "zod";

export const opportunityCategorySchema = z.enum([
  "scholarship",
  "contest",
  "activity",
  "volunteer",
  "support",
  "unknown",
]);

export const eligibilityTypeSchema = z.enum([
  "grade",
  "major",
  "region",
  "school",
  "gpa",
  "income",
  "period",
  "team",
  "other",
]);

export const matchStatusSchema = z.enum([
  "eligible",
  "conditionally_eligible",
  "not_eligible",
  "insufficient_info",
]);

export const profileSchema = z.object({
  school: z.string().trim().min(1, "학교를 입력해주세요."),
  grade: z.coerce.number().int().min(1).max(8),
  majors: z.array(z.string().trim().min(1)).default([]),
  interests: z.array(z.string().trim().min(1)).default([]),
  regions: z.array(z.string().trim().min(1)).default([]),
  canJoinTeam: z.boolean().default(false),
});

export const analyzeRequestSchema = z.object({
  profile: profileSchema,
  url: z.string().url("URL 형식이 올바르지 않습니다.").optional().or(z.literal("")),
  rawText: z.string().optional().default(""),
}).superRefine((value, context) => {
  if (!value.rawText?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "본문을 직접 붙여넣어 주세요.",
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
  score: z.number().min(0).max(100),
  summary: z.string(),
  matchedReasons: z.array(z.string()),
  missingInfo: z.array(z.string()),
  disqualifyingReasons: z.array(z.string()),
  nextActions: z.array(z.string()),
});

export const taskSchema = z.object({
  title: z.string(),
  dueDate: z.string().nullable(),
  status: z.enum(["todo", "done"]),
});

export const analyzeResponseSchema = z.object({
  mode: z.enum(["mock", "openai"]),
  opportunity: opportunitySchema,
  match: matchSchema,
  tasks: z.array(taskSchema),
});

export const analyzeResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["mode", "opportunity", "match", "tasks"],
  properties: {
    mode: { type: "string", enum: ["mock", "openai"] },
    opportunity: {
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
        category: {
          type: "string",
          enum: ["scholarship", "contest", "activity", "volunteer", "support", "unknown"],
        },
        deadline: { type: ["string", "null"] },
        target: { type: ["string", "null"] },
        eligibility: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["type", "condition", "evidence", "required"],
            properties: {
              type: {
                type: "string",
                enum: ["grade", "major", "region", "school", "gpa", "income", "period", "team", "other"],
              },
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
    },
    match: {
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
        status: {
          type: "string",
          enum: ["eligible", "conditionally_eligible", "not_eligible", "insufficient_info"],
        },
        score: { type: "number", minimum: 0, maximum: 100 },
        summary: { type: "string" },
        matchedReasons: { type: "array", items: { type: "string" } },
        missingInfo: { type: "array", items: { type: "string" } },
        disqualifyingReasons: { type: "array", items: { type: "string" } },
        nextActions: { type: "array", items: { type: "string" } },
      },
    },
    tasks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "dueDate", "status"],
        properties: {
          title: { type: "string" },
          dueDate: { type: ["string", "null"] },
          status: { type: "string", enum: ["todo", "done"] },
        },
      },
    },
  },
};

export function formatZodError(error) {
  return error.issues.map((issue) => issue.message).join(" ");
}
