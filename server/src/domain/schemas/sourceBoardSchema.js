import { z } from 'zod'
import {
  CampusIdSchema,
  IdSchema,
  InstitutionIdSchema,
  NonEmptyStringSchema,
  NoticeTypeSchema,
  UrlSchema,
  createUniquePrimitiveArraySchema,
} from './commonSchemas.js'

export const SourceBoardSchema = z
  .object({
    boardId: IdSchema,
    institutionId: InstitutionIdSchema,
    boardKey: NonEmptyStringSchema,
    displayName: NonEmptyStringSchema,
    category: NonEmptyStringSchema,
    canonical: z.boolean(),
    aliasBoardIds: createUniquePrimitiveArraySchema(IdSchema, {
      message: 'Expected unique alias board IDs.',
    }),
    listUrl: UrlSchema,
    noticeTypeHint: NoticeTypeSchema.optional(),
    supportedCampusFilters: createUniquePrimitiveArraySchema(CampusIdSchema, {
      message: 'Expected unique supported campus filters.',
    }),
  })
  .strict()
  .superRefine((board, context) => {
    if (board.aliasBoardIds.includes(board.boardId)) {
      context.addIssue({
        code: 'custom',
        message: 'A board cannot include its own boardId as an alias.',
        path: ['aliasBoardIds'],
      })
    }
  })

export function parseSourceBoard(input) {
  return SourceBoardSchema.parse(input)
}

export function safeParseSourceBoard(input) {
  return SourceBoardSchema.safeParse(input)
}
