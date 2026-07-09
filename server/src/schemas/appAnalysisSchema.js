import { z } from 'zod'

export const AppConfidenceSchema = z.enum(['high', 'medium', 'low'])

export const AppCalendarEventTypeSchema = z.enum([
  'deadline',
  'start',
  'end',
  'announcement',
  'meeting',
  'other',
])

const optionalExtractionFields = {
  dateExpression: z.string().optional(),
  normalizedDate: z.string().optional(),
  confidence: AppConfidenceSchema.optional(),
  reviewRequired: z.boolean().optional(),
}

const appBaseItemFields = {
  id: z.string(),
  evidence: z.string(),
  edited: z.boolean(),
}

export const AppWarningSchema = z
  .object({
    type: z.string(),
    message: z.string(),
  })
  .strict()

export const AppUserPreferencesSnapshotSchema = z
  .object({
    activeInstitution: z.literal('kangwon'),
    selectedCampuses: z.array(
      z.enum(['chuncheon', 'samcheok', 'dogye', 'gangneung_wonju']),
    ),
    includeCommonNotices: z.literal(true),
  })
  .strict()

export const AppAnalysisMetadataSchema = z
  .object({
    userPreferencesSnapshot: AppUserPreferencesSnapshotSchema.optional(),
  })
  .strict()

export const AppDeadlineSchema = z
  .object({
    ...appBaseItemFields,
    title: z.string(),
    date: z.string(),
    time: z.string(),
    description: z.string(),
    ...optionalExtractionFields,
  })
  .strict()

export const AppTaskSchema = z
  .object({
    ...appBaseItemFields,
    title: z.string(),
    dueDate: z.string(),
    completed: z.boolean(),
    description: z.string(),
    ...optionalExtractionFields,
  })
  .strict()

export const AppSubmissionSchema = z
  .object({
    ...appBaseItemFields,
    title: z.string(),
    description: z.string(),
    ...optionalExtractionFields,
  })
  .strict()

export const AppRequirementSchema = z
  .object({
    ...appBaseItemFields,
    title: z.string().optional(),
    text: z.string().optional(),
    description: z.string().optional(),
    ...optionalExtractionFields,
  })
  .strict()
  .refine((item) => item.title !== undefined || item.text !== undefined, {
    message: 'Expected either title or text.',
  })

export const AppCautionSchema = z
  .object({
    ...appBaseItemFields,
    title: z.string().optional(),
    text: z.string().optional(),
    description: z.string().optional(),
    ...optionalExtractionFields,
  })
  .strict()
  .refine((item) => item.title !== undefined || item.text !== undefined, {
    message: 'Expected either title or text.',
  })

export const AppCalendarEventSchema = z
  .object({
    ...appBaseItemFields,
    title: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    time: z.string(),
    description: z.string(),
    selected: z.boolean(),
    allDay: z.boolean(),
    reviewRequired: z.boolean(),
    dateConfidence: z.string(),
    dateSource: z.string(),
    referenceDate: z.string(),
    originalDateExpression: z.string(),
    eventType: AppCalendarEventTypeSchema.optional(),
    normalizedDate: z.string().optional(),
    confidence: AppConfidenceSchema.optional(),
  })
  .strict()

export const AppAnalysisSchema = z
  .object({
    title: z.string(),
    summary: z.string(),
    detectedNoticeType: z.string(),
    userSelectedNoticeType: z.string(),
    noticePublicationDate: z.string(),
    uploadedFileName: z.string(),
    deadlines: z.array(AppDeadlineSchema),
    tasks: z.array(AppTaskSchema),
    submissions: z.array(AppSubmissionSchema),
    requirements: z.array(AppRequirementSchema),
    cautions: z.array(AppCautionSchema),
    calendarEvents: z.array(AppCalendarEventSchema),
    warnings: z.array(AppWarningSchema),
    metadata: AppAnalysisMetadataSchema.optional(),
  })
  .strict()

export function parseAppAnalysis(input) {
  return AppAnalysisSchema.parse(input)
}

export function safeParseAppAnalysis(input) {
  return AppAnalysisSchema.safeParse(input)
}
