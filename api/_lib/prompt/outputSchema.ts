import {
  candidateMaxLength,
  metadataMaxLength,
  parseGeneratedReply,
  type GeneratedReply,
} from '../../../src/shared/generation/contracts.js'

export const generatedReplyJsonSchema = {
  type: 'object',
  properties: {
    candidates: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          toneLevel: { type: 'integer', enum: [1, 2, 3] },
          text: { type: 'string', minLength: 1, maxLength: candidateMaxLength },
        },
        required: ['toneLevel', 'text'],
        additionalProperties: false,
      },
    },
    situationSummary: {
      type: 'string',
      minLength: 1,
      maxLength: metadataMaxLength,
    },
    warning: {
      type: 'string',
      minLength: 1,
      maxLength: metadataMaxLength,
    },
  },
  required: ['candidates'],
  additionalProperties: false,
} as const

export const generatedReplyOutputConfig = {
  format: {
    type: 'json_schema',
    schema: generatedReplyJsonSchema,
  },
} as const

export type AcceptedStopReason = 'end_turn'

export const isAcceptedStopReason = (value: unknown): value is AcceptedStopReason =>
  value === 'end_turn'

export const parseCompletedStructuredOutput = (
  stopReason: unknown,
  text: unknown,
): GeneratedReply | null => {
  if (!isAcceptedStopReason(stopReason) || typeof text !== 'string') return null

  try {
    const parsed: unknown = JSON.parse(text)
    return parseGeneratedReply(parsed)
  } catch {
    return null
  }
}
