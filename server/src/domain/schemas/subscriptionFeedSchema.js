import { z } from 'zod'
import {
  CampusIdSchema,
  EventTypeSchema,
  IdSchema,
  InstitutionIdSchema,
  IsoDateTimeSchema,
  NonEmptyStringSchema,
  NoticeTypeSchema,
  SchemaVersionSchema,
  TargetActorSchema,
  createUniquePrimitiveArraySchema,
} from './commonSchemas.js'

export const FeedStatusSchema = z.enum(['active', 'revoked', 'paused'])

export const SubscriptionIcsFeedSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    feedId: IdSchema,
    institutionId: InstitutionIdSchema,
    selectedCampuses: createUniquePrimitiveArraySchema(CampusIdSchema, {
      min: 1,
      message: 'Expected at least one unique selected campus.',
    }),
    selectedBoardIds: createUniquePrimitiveArraySchema(IdSchema, {
      min: 1,
      message: 'Expected at least one unique selected board ID.',
    }),
    selectedNoticeTypes: createUniquePrimitiveArraySchema(NoticeTypeSchema, {
      min: 1,
      message: 'Expected at least one unique selected notice type.',
    }),
    includedEventTypes: createUniquePrimitiveArraySchema(EventTypeSchema, {
      min: 1,
      message: 'Expected at least one unique included event type.',
    }),
    includeCommonNotices: z.boolean(),
    includeUnknownCampusNotices: z.boolean(),
    includeReviewRequired: z.boolean(),
    includedTargetActors: createUniquePrimitiveArraySchema(TargetActorSchema, {
      min: 1,
      message: 'Expected at least one unique included target actor.',
    }),
    publicSlug: NonEmptyStringSchema.nullable(),
    feedTokenHash: NonEmptyStringSchema.nullable(),
    feedTokenPrefix: NonEmptyStringSchema.nullable(),
    status: FeedStatusSchema,
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict()

export function parseSubscriptionIcsFeed(input) {
  return SubscriptionIcsFeedSchema.parse(input)
}

export function safeParseSubscriptionIcsFeed(input) {
  return SubscriptionIcsFeedSchema.safeParse(input)
}
