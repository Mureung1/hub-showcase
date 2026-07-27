import { z } from 'zod'

export const setMatchableSchema = z.object({
  is_matchable: z.boolean({ message: 'is_matchable는 boolean이어야 해요.' }),
})
