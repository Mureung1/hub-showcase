import { z } from 'zod'

const normalizedDatePattern = /^\d{4}-\d{2}-\d{2}$/

function isValidNormalizedDate(value) {
  if (!normalizedDatePattern.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export const AiRawItemKindSchema = z.enum([
  'deadline',
  'task',
  'submission',
  'requirement',
  'caution',
])

export const AiRawCalendarEventTypeSchema = z.enum([
  'deadline',
  'start',
  'end',
  'announcement',
  'meeting',
  'other',
])

export const AiRawConfidenceSchema = z.enum(['high', 'medium', 'low'])

export const AiRawNormalizedDateSchema = z.union([
  z.literal(''),
  z
    .string()
    .regex(normalizedDatePattern, 'Expected YYYY-MM-DD or an empty string.')
    .refine(isValidNormalizedDate, 'Expected a valid calendar date.'),
])

export const AiRawWarningSchema = z.union([
  z.string(),
  z
    .object({
      type: z.string().optional(),
      message: z.string(),
    })
    .strict(),
])

export const AiRawItemSchema = z
  .object({
    kind: AiRawItemKindSchema,
    title: z.string(),
    description: z.string(),
    dateExpression: z.string(),
    normalizedDate: AiRawNormalizedDateSchema,
    evidence: z.string(),
    confidence: AiRawConfidenceSchema,
    reviewRequired: z.boolean(),
  })
  .strict()

export const AiRawCalendarEventCandidateSchema = z
  .object({
    title: z.string(),
    eventType: AiRawCalendarEventTypeSchema,
    dateExpression: z.string(),
    normalizedDate: AiRawNormalizedDateSchema,
    evidence: z.string(),
    confidence: AiRawConfidenceSchema,
    reviewRequired: z.boolean(),
  })
  .strict()

export const AiRawAnalysisSchema = z
  .object({
    summary: z.string(),
    items: z.array(AiRawItemSchema),
    calendarEventCandidates: z.array(AiRawCalendarEventCandidateSchema),
    warnings: z.array(AiRawWarningSchema),
  })
  .strict()

export function parseAiRawAnalysis(input) {
  return AiRawAnalysisSchema.parse(input)
}

export function safeParseAiRawAnalysis(input) {
  return AiRawAnalysisSchema.safeParse(input)
}
