import type { StudyTerm } from './types'

export const CONCEPT_MAP_ORDER = ['interest-rate', 'base-rate', 'inflation', 'growth-stock', 'per', 'valuation']

export const STUDY_TERMS: Record<string, StudyTerm> = {
  'interest-rate': {
    id: 'interest-rate',
    label: '금리',
    description: '돈의 가격을 의미하며, 주식 시장의 투자 심리에 큰 영향을 줍니다.',
    easyExplanation: '금리가 오르면 미래 이익 기대가 큰 성장주가 먼저 흔들리는 경우가 많습니다.',
    relatedTermIds: ['base-rate', 'inflation', 'growth-stock', 'per', 'exchange-rate'],
  },
  'base-rate': {
    id: 'base-rate',
    label: '기준금리',
    description: '중앙은행이 정하는 기준이 되는 금리로, 시중 금리와 자산 가격의 출발점이 됩니다.',
    easyExplanation: '기준금리가 오르면 예금 이자가 매력적으로 변해 주식에서 자금이 빠질 수 있습니다.',
    relatedTermIds: ['interest-rate', 'inflation', 'exchange-rate'],
  },
  inflation: {
    id: 'inflation',
    label: '인플레이션',
    description: '물가가 전반적으로 오르는 현상으로, 돈의 실질 가치가 낮아지는 것을 의미합니다.',
    easyExplanation: '물가가 계속 오르면 중앙은행이 금리를 올려 대응할 가능성이 커집니다.',
    relatedTermIds: ['interest-rate', 'base-rate', 'growth-stock'],
  },
  'growth-stock': {
    id: 'growth-stock',
    label: '성장주',
    description: '현재 이익보다 미래 성장 가능성을 보고 높은 가격에 거래되는 주식입니다.',
    easyExplanation: '금리가 낮을 때 유리하고, 금리가 오르면 상대적으로 부담이 커집니다.',
    relatedTermIds: ['interest-rate', 'per', 'valuation'],
  },
  per: {
    id: 'per',
    label: 'PER',
    description: '주가를 주당순이익으로 나눈 값으로, 주가가 이익 대비 비싼지 싼지를 보여줍니다.',
    easyExplanation: 'PER이 높을수록 시장이 그 기업의 미래 성장에 큰 기대를 걸고 있다는 뜻입니다.',
    relatedTermIds: ['growth-stock', 'valuation'],
  },
  valuation: {
    id: 'valuation',
    label: '밸류에이션',
    description: '기업의 가치를 현재 주가와 비교해 적정한지 평가하는 작업입니다.',
    easyExplanation: '밸류에이션이 높다는 건 좋은 기업이라도 지금 사기엔 비쌀 수 있다는 뜻입니다.',
    relatedTermIds: ['per', 'growth-stock'],
  },
  'exchange-rate': {
    id: 'exchange-rate',
    label: '환율',
    description: '한 나라의 통화가 다른 나라 통화에 비해 갖는 교환 비율입니다.',
    easyExplanation: '환율이 오르면(원화 약세) 수출 기업에는 유리하지만 수입 물가는 오를 수 있습니다.',
    relatedTermIds: ['interest-rate', 'inflation'],
  },
}
