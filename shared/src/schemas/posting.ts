import { z } from "zod";

// Posting 카테고리 enum
export const PostingCategorySchema = z.enum([
  "COMPETITION",    // 공모전
  "ACTIVITY",       // 대외활동
  "POLICY",         // 정책/지원금
  "CAMPUS_EVENT",   // 교내행사
]);

export type PostingCategory = z.infer<typeof PostingCategorySchema>;

// Parse Status
export const ParseStatusSchema = z.enum([
  "CURATED",        // 수동 검증됨
  "NEEDS_REVIEW",   // 자동 파싱 후 검증 필요
  "FAILED",         // 파싱 실패
]);

export type ParseStatus = z.infer<typeof ParseStatusSchema>;

// Eligibility 스키마 (자격요건)
export const EligibilitySchema = z.object({
  id: z.string().uuid().optional(),
  postingId: z.string().uuid(),
  majors: z.array(z.string()).default([]),
  regions: z.array(z.string()).default([]),
  grades: z.array(z.number()).default([]),
  enrollmentStatuses: z.array(z.string()).default([]),
  ageMin: z.number().int().min(18).max(100).nullable().default(null),
  ageMax: z.number().int().min(18).max(100).nullable().default(null),
  incomeMax: z.number().int().min(1).max(10).nullable().default(null),
  gpaMin: z.number().min(0).max(4.5).nullable().default(null),
  rawEligibilityText: z.string(),
});

export type Eligibility = z.infer<typeof EligibilitySchema>;

// Posting 스키마
export const PostingSchema = z.object({
  id: z.string().uuid().optional(),
  rawPostingId: z.string().uuid().nullable().optional(),
  category: PostingCategorySchema,
  title: z.string().min(1).max(500),
  hostOrg: z.string().max(200).nullable().optional(),
  receptionStartDate: z.coerce.date().nullable().optional(),
  receptionEndDate: z.coerce.date().nullable().optional(),
  eventStartDate: z.coerce.date().nullable().optional(),
  eventEndDate: z.coerce.date().nullable().optional(),
  sourceUrl: z.string().url(),
  parseStatus: ParseStatusSchema.default("CURATED"),
  eligibility: EligibilitySchema.optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type Posting = z.infer<typeof PostingSchema>;

// 프론트엔드 카드 뷰용 간단한 응답
export const PostingCardSchema = PostingSchema.pick({
  id: true,
  category: true,
  title: true,
  hostOrg: true,
  receptionEndDate: true,
  sourceUrl: true,
}).extend({
  dDay: z.number().nullable().optional(),
  isEligible: z.boolean().optional(),
  eligibilityText: z.string().optional(),
});

export type PostingCard = z.infer<typeof PostingCardSchema>;

// 생성 요청 스키마
export const CreatePostingSchema = PostingSchema.pick({
  category: true,
  title: true,
  hostOrg: true,
  receptionStartDate: true,
  receptionEndDate: true,
  eventStartDate: true,
  eventEndDate: true,
  sourceUrl: true,
}).extend({
  rawEligibilityText: z.string(),
  majors: z.array(z.string()).default([]),
  regions: z.array(z.string()).default([]),
  grades: z.array(z.number()).default([]),
  enrollmentStatuses: z.array(z.string()).default([]),
  ageMin: z.number().int().nullable().optional(),
  ageMax: z.number().int().nullable().optional(),
  incomeMax: z.number().int().nullable().optional(),
  gpaMin: z.number().nullable().optional(),
});

export type CreatePostingRequest = z.infer<typeof CreatePostingSchema>;