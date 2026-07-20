import {
  evaluateSyntheticRetrievalRankings,
  syntheticRankingCases,
} from '../api/_lib/retrieval/evaluation'

console.log(JSON.stringify(evaluateSyntheticRetrievalRankings(syntheticRankingCases), null, 2))
