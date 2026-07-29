export type ChatMessageRole = 'assistant' | 'user'

export interface ChatMessage {
  id: string
  role: ChatMessageRole
  text: string
}

interface ReplyRule {
  keywords: string[]
  response: string
}

const REPLY_RULES: ReplyRule[] = [
  {
    keywords: ['엔비디아', 'nvidia', 'nvda'],
    response:
      '엔비디아 분석은 성장성은 강하지만 단기 과열 신호가 있는 구간으로 정리했습니다. 관심 종목에서 NVIDIA를 누르면 가격 시나리오, 근거, 리스크가 있는 분석 화면으로 이동합니다.',
  },
  {
    keywords: ['삼성전자', '005930', '메모리'],
    response:
      '삼성전자는 메모리 업황 회복과 HBM 기대를 긍정 요인으로, 원화 약세와 실적 눈높이를 리스크로 정리했습니다. 관심 종목에서 삼성전자를 누르면 분석이 바로 열립니다.',
  },
  {
    keywords: ['비트코인', 'bitcoin', 'btc'],
    response:
      '비트코인은 위험자산 선호 회복에는 민감하게 반응하지만 변동성이 큰 자산입니다. 분석에서는 분할 접근과 손절 기준 확인을 강조합니다.',
  },
  {
    keywords: ['시장', '오늘', '움직'],
    response:
      '오늘 시황은 금리 인하 기대, 반도체 강세, 유가 상승을 핵심 변수로 볼 수 있습니다. 성장주는 우호적이지만 발표 전 변동성은 커질 수 있습니다.',
  },
  {
    keywords: ['일정', '캘린더', '다가오는'],
    response:
      '이번 주 캘린더에는 미국 CPI, 한국 무역수지, 삼성전자 공시, FOMC 의사록, KRX 마감 이벤트가 있습니다. 증시 캘린더에서 항목을 누르면 상세 설명이 열립니다.',
  },
  {
    keywords: ['뉴스', '소식'],
    response:
      '시장 소식에는 금리, 반도체, 에너지, 환율, 가상자산, 실적 프리뷰 뉴스를 넉넉히 넣었습니다. 아무 뉴스나 누르면 영향 해석 패널이 표시됩니다.',
  },
  {
    keywords: ['리스크', '위험'],
    response:
      '현재 리스크는 높은 밸류에이션, 유가 상승, 환율 변동, 실적 발표 전 차익실현입니다. 단기 진입 전에는 이벤트 날짜와 손절 기준을 먼저 확인하는 편이 좋습니다.',
  },
  {
    keywords: ['진입', '자리', '들어가'],
    response:
      '진입 판단은 바로 매수 신호를 주기보다 가격 구간, 변동성, 이벤트 전후 리스크를 함께 확인하도록 구성했습니다. 분석 화면에서 상승, 중립, 하락 시나리오를 같이 보여줍니다.',
  },
]

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    text: '궁금한 메뉴를 눌러보세요. 질문에 맞춰 분석 답변을 보여드릴게요.',
  },
]

export function getAiResponse(question: string): string {
  const normalizedQuestion = question.toLowerCase()
  const matchedRule = REPLY_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalizedQuestion.includes(keyword.toLowerCase())),
  )

  return (
    matchedRule?.response ??
    '좋아요. 시장 흐름, 관련 뉴스, 캘린더 이벤트, 종목 리스크를 묶어서 간단한 분석 답변으로 정리해드릴게요.'
  )
}
