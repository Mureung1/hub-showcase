import {
  evaluateSyntheticRetrievalRankings,
  syntheticRankingCases,
} from '../api/_lib/retrieval/evaluation.js'

console.log(JSON.stringify(evaluateSyntheticRetrievalRankings(syntheticRankingCases), null, 2))
