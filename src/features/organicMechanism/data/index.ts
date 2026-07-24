import type { ReactionTemplate } from './types'
import { sn2Reaction } from './sn2'
import { electrophilicAdditionReaction } from './electrophilicAddition'
import { e2EliminationReaction } from './e2Elimination'
import { acylSubstitutionAspirinReaction } from './acylSubstitutionAspirin'

export const REACTION_TEMPLATES: ReactionTemplate[] = [
  sn2Reaction,
  electrophilicAdditionReaction,
  acylSubstitutionAspirinReaction,
  e2EliminationReaction,
]
