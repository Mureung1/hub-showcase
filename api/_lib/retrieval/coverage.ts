import {
  purposes,
  scenarios,
  type Mode,
  type PurposeId,
  type ScenarioId,
} from '../../../src/entities/message/index.js'
import type { RetrievalCatalogEntry } from './catalog.js'

const requiredModes = ['reply', 'initiate'] as const satisfies readonly Mode[]
export const minimumExamplesPerRetrievalCell = 2

export type RetrievalCoverageCell = {
  readonly count: number
  readonly mode: Mode
  readonly purposeId: PurposeId
  readonly scenarioId: ScenarioId
}

export type RetrievalCoverageReport = {
  readonly activationReadyCellCount: number
  readonly candidateCount: number
  readonly coveredCellCount: number
  readonly eligibleForProduction: boolean
  readonly exampleSetCount: number
  readonly missingCells: readonly RetrievalCoverageCell[]
  readonly requiredCellCount: number
}

export const retrievalCoverageReport = (
  catalog: readonly RetrievalCatalogEntry[],
): RetrievalCoverageReport => {
  const cells = scenarios.flatMap((scenario) =>
    purposes.flatMap((purpose) =>
      requiredModes.map((mode) => ({
        count: catalog.filter(
          (entry) =>
            entry.reviewStatus === 'approved' &&
            entry.scenarioId === scenario.id &&
            entry.purposeId === purpose.id &&
            entry.mode === mode,
        ).length,
        mode,
        purposeId: purpose.id,
        scenarioId: scenario.id,
      })),
    ),
  )
  const missingCells = cells.filter((cell) => cell.count < minimumExamplesPerRetrievalCell)

  return {
    activationReadyCellCount: cells.length - missingCells.length,
    candidateCount: catalog.reduce(
      (total, entry) => total + entry.example.candidates.length,
      0,
    ),
    coveredCellCount: cells.filter((cell) => cell.count > 0).length,
    eligibleForProduction: missingCells.length === 0,
    exampleSetCount: catalog.length,
    missingCells,
    requiredCellCount: cells.length,
  }
}

export const requireProductionRetrievalCoverage = (
  catalog: readonly RetrievalCatalogEntry[],
) => {
  const report = retrievalCoverageReport(catalog)
  if (!report.eligibleForProduction) {
    throw new Error('Retrieval catalog coverage is insufficient for production activation')
  }
  return report
}
