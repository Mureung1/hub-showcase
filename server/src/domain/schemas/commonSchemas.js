import { z } from 'zod'

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/
const isoTimePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/

export const CAMPUS_IDS = [
  'chuncheon',
  'samcheok',
  'dogye',
  'gangneung_wonju',
]

export function isValidIsoDate(value) {
  if (!isoDatePattern.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function isUniquePrimitiveArray(values) {
  return new Set(values).size === values.length
}

export function createUniquePrimitiveArraySchema(
  itemSchema,
  { min = 0, message = 'Expected unique values.' } = {},
) {
  let arraySchema = z.array(itemSchema)

  if (min > 0) {
    arraySchema = arraySchema.min(min)
  }

  return arraySchema.refine(isUniquePrimitiveArray, { message })
}

export function hasMatchingReviewState(reviewRequired, reviewReasons) {
  return reviewRequired === (reviewReasons.length > 0)
}

export function hasExactlyAllCampusIds(campuses) {
  return (
    campuses.length === CAMPUS_IDS.length &&
    CAMPUS_IDS.every((campusId) => campuses.includes(campusId))
  )
}

export const SchemaVersionSchema = z.literal(1)
export const NonEmptyStringSchema = z.string().trim().min(1)
export const IdSchema = NonEmptyStringSchema
export const InstitutionIdSchema = NonEmptyStringSchema
export const UrlSchema = z.string().url()
export const HashSchema = NonEmptyStringSchema
export const TimezoneSchema = NonEmptyStringSchema

export const IsoDateSchema = z
  .string()
  .regex(isoDatePattern, 'Expected YYYY-MM-DD.')
  .refine(isValidIsoDate, 'Expected a valid calendar date.')

export const IsoTimeSchema = z
  .string()
  .regex(isoTimePattern, 'Expected a valid HH:mm time.')

export const IsoDateTimeSchema = z
  .string()
  .regex(
    isoDateTimePattern,
    'Expected an ISO datetime with a timezone offset or Z.',
  )
  .refine(
    (value) =>
      isValidIsoDate(value.slice(0, 10)) && !Number.isNaN(Date.parse(value)),
    'Expected a valid ISO datetime.',
  )

export const CampusIdSchema = z.enum(CAMPUS_IDS)

export const NoticeTypeSchema = z.enum([
  'school_notice',
  'scholarship',
  'competition',
  'job_posting',
  'assignment',
  'other',
  'unknown',
])

export const ConfidenceSchema = z.enum(['high', 'medium', 'low'])

export const TargetActorSchema = z.enum([
  'student',
  'applicant',
  'department',
  'staff',
  'public',
  'unknown',
])

export const EventTypeSchema = z.enum([
  'deadline',
  'start',
  'end',
  'announcement',
  'meeting',
  'other',
])

export const ReviewReasonSchema = z.enum([
  'ambiguous_date',
  'relative_date_resolved',
  'missing_evidence',
  'evidence_not_exact',
  'low_confidence',
  'target_campus_unresolved',
  'source_target_campus_conflict',
  'notice_type_conflict',
  'invalid_time',
  'unknown_actor',
  'invalid_source_item_reference',
  'other',
])
