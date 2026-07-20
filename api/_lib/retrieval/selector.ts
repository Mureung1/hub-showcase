import type { Mode, PurposeId, ScenarioId } from '../../../src/entities/message'
import {
  requirePromptExamplePair,
  type PromptExamplePair,
} from '../prompt/examples'
import {
  reviewedPromptExamplesFor,
  reviewedSeedCatalogVersion,
} from '../prompt/seedExamples'
import {
  reviewedRetrievalEntryFor,
  type RetrievalCatalogEntry,
} from './catalog'
import type { EmbeddingProvider } from './embedding'
import type { RetrievalExampleRepository } from './repository'

export type ReviewedExampleSelectorMode = 'retrieval-eval' | 'static'

export type ReviewedExampleSelectionRequest = {
  readonly mode: Mode
  readonly purposeId: PurposeId
  readonly queryText: string
  readonly scenarioId: ScenarioId
}

export type ReviewedExampleSelection = {
  readonly examples: PromptExamplePair
  readonly reason:
    | 'checksum_mismatch'
    | 'provider_failed'
    | 'retrieval_disabled'
    | 'retrieval_success'
    | 'too_few_candidates'
    | 'unknown_example'
  readonly source: 'retrieval' | 'static'
}

export type ReviewedExampleSelector = {
  select: (request: ReviewedExampleSelectionRequest) => Promise<ReviewedExampleSelection>
}

type RetrievalSelectorOptions = {
  readonly catalogVersion?: string
  readonly embeddingProvider?: EmbeddingProvider
  readonly mode?: ReviewedExampleSelectorMode
  readonly repository?: Pick<RetrievalExampleRepository, 'searchApprovedPair'>
  readonly resolveEntry?: (exampleId: string) => RetrievalCatalogEntry | null
}

const staticSelection = (
  scenarioId: ScenarioId,
  reason: Exclude<ReviewedExampleSelection['reason'], 'retrieval_success'>,
): ReviewedExampleSelection => ({
  examples: reviewedPromptExamplesFor(scenarioId),
  reason,
  source: 'static',
})

export const createReviewedExampleSelector = (
  options: RetrievalSelectorOptions = {},
): ReviewedExampleSelector => {
  const mode = options.mode ?? 'static'
  const resolveEntry = options.resolveEntry ?? reviewedRetrievalEntryFor

  return {
    async select(request) {
      if (mode !== 'retrieval-eval') {
        return staticSelection(request.scenarioId, 'retrieval_disabled')
      }
      if (!options.embeddingProvider || !options.repository) {
        return staticSelection(request.scenarioId, 'provider_failed')
      }

      try {
        const queryEmbedding = await options.embeddingProvider.embed({
          input: request.queryText,
          inputType: 'query',
        })
        const matches = await options.repository.searchApprovedPair({
          catalogVersion: options.catalogVersion ?? reviewedSeedCatalogVersion,
          embeddingModel: options.embeddingProvider.model,
          mode: request.mode,
          purposeId: request.purposeId,
          queryEmbedding,
          scenarioId: request.scenarioId,
        })

        if (matches.length !== 2 || matches[0]?.exampleId === matches[1]?.exampleId) {
          return staticSelection(request.scenarioId, 'too_few_candidates')
        }

        const entries = matches.map((match) => resolveEntry(match.exampleId))
        if (!entries[0] || !entries[1]) {
          return staticSelection(request.scenarioId, 'unknown_example')
        }
        if (
          entries[0].checksum !== matches[0].checksum ||
          entries[1].checksum !== matches[1].checksum
        ) {
          return staticSelection(request.scenarioId, 'checksum_mismatch')
        }

        return {
          examples: requirePromptExamplePair(request.scenarioId, [
            entries[0].example,
            entries[1].example,
          ]),
          reason: 'retrieval_success',
          source: 'retrieval',
        }
      } catch {
        return staticSelection(request.scenarioId, 'provider_failed')
      }
    },
  }
}
