import { z } from 'zod'
import {
  ConfidenceSchema,
  EventTypeSchema,
  IdSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
  IsoTimeSchema,
  NonEmptyStringSchema,
  ReviewReasonSchema,
  SchemaVersionSchema,
  TargetActorSchema,
  TimezoneSchema,
  UrlSchema,
  createUniquePrimitiveArraySchema,
  hasMatchingReviewState,
} from './commonSchemas.js'
import { EvidenceRefSchema } from './extractionSchema.js'

export const CalendarEventStatusSchema = z.enum([
  'published',
  'updated',
  'cancelled',
  'suppressed',
])

export const CalendarEventSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    eventId: IdSchema,
    sourceNoticeId: IdSchema,
    sourceCandidateId: IdSchema,
    title: NonEmptyStringSchema,
    description: z.string(),
    eventType: EventTypeSchema,
    eventSubtype: NonEmptyStringSchema.nullable(),
    targetActor: TargetActorSchema,
    startDate: IsoDateSchema,
    endDate: IsoDateSchema,
    startTime: IsoTimeSchema.nullable(),
    endTime: IsoTimeSchema.nullable(),
    isAllDay: z.boolean(),
    timezone: TimezoneSchema.nullable(),
    sourceUrl: UrlSchema.nullable(),
    evidence: z.array(EvidenceRefSchema),
    confidence: ConfidenceSchema,
    reviewRequired: z.boolean(),
    reviewReasons: createUniquePrimitiveArraySchema(ReviewReasonSchema, {
      message: 'Expected unique review reasons.',
    }),
    status: CalendarEventStatusSchema,
    sequence: z.number().int().nonnegative(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict()
  .superRefine((event, context) => {
    if (event.endDate < event.startDate) {
      context.addIssue({
        code: 'custom',
        message: 'endDate must be on or after startDate.',
        path: ['endDate'],
      })
    }

    if (event.isAllDay) {
      const nullableAllDayFields = [
        ['startTime', event.startTime],
        ['endTime', event.endTime],
        ['timezone', event.timezone],
      ]

      nullableAllDayFields.forEach(([fieldName, value]) => {
        if (value !== null) {
          context.addIssue({
            code: 'custom',
            message: `An all-day event requires ${fieldName}=null.`,
            path: [fieldName],
          })
        }
      })
    } else {
      if (event.startTime === null) {
        context.addIssue({
          code: 'custom',
          message: 'A timed event requires startTime.',
          path: ['startTime'],
        })
      }

      if (event.timezone === null) {
        context.addIssue({
          code: 'custom',
          message: 'A timed event requires timezone.',
          path: ['timezone'],
        })
      }
    }

    if (event.endTime !== null && event.startTime === null) {
      context.addIssue({
        code: 'custom',
        message: 'endTime requires startTime.',
        path: ['startTime'],
      })
    }

    if (
      event.startDate === event.endDate &&
      event.startTime !== null &&
      event.endTime !== null &&
      event.endTime < event.startTime
    ) {
      context.addIssue({
        code: 'custom',
        message: 'On the same date, endTime must be on or after startTime.',
        path: ['endTime'],
      })
    }

    if (!hasMatchingReviewState(event.reviewRequired, event.reviewReasons)) {
      context.addIssue({
        code: 'custom',
        message:
          'reviewRequired must be true if and only if reviewReasons is non-empty.',
        path: ['reviewRequired'],
      })
    }
  })

export function parseCalendarEvent(input) {
  return CalendarEventSchema.parse(input)
}

export function safeParseCalendarEvent(input) {
  return CalendarEventSchema.safeParse(input)
}
