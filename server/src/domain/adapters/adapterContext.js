import { z } from 'zod'
import {
  HashSchema,
  IdSchema,
  IsoDateTimeSchema,
  NonEmptyStringSchema,
} from '../schemas/commonSchemas.js'

const FunctionSchema = z.custom(
  (value) => typeof value === 'function',
  'Expected a function.',
)

export const AdapterContextSchema = z
  .object({
    now: IsoDateTimeSchema,
    idFactory: FunctionSchema,
    hashText: FunctionSchema,
  })
  .strict()

export function parseAdapterContext(input) {
  return AdapterContextSchema.parse(input)
}

export function createAdapterId(context, entityType) {
  const parsedEntityType = NonEmptyStringSchema.parse(entityType)
  return IdSchema.parse(context.idFactory(parsedEntityType))
}

export function hashAdapterText(context, input) {
  return HashSchema.parse(context.hashText(input))
}
