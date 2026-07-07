import type { ReactionTemplate } from './types'
import { sn2Reaction } from './sn2'
import { electrophilicAdditionReaction } from './electrophilicAddition'
import { e2EliminationReaction } from './e2Elimination'
import { fischerEsterificationReaction } from './fischerEsterification'

export const REACTION_TEMPLATES: ReactionTemplate[] = [
  sn2Reaction,
  electrophilicAdditionReaction,
  fischerEsterificationReaction,
  e2EliminationReaction,
]
