// 공공데이터 원본 배출방법 텍스트를 이해하기 쉬운 형태로 가공한 결과의 타입.
// LLM은 이 구조를 채우기만 할 뿐, 원본에 없는 새 배출 규정을 만들지 않는다 (CLAUDE.md 원칙).

export interface DisposalExplanationPart {
  part: string
  category: string
}

export interface DisposalExplanation {
  steps: string[]
  parts: DisposalExplanationPart[]
  commonMistakes: string[]
  reason: string
}

// 토글 클릭 시 재요청 없이 즉시 전환할 수 있도록 한/영을 한 번에 생성한다.
export interface BilingualDisposalExplanation {
  ko: DisposalExplanation
  en: DisposalExplanation
}

export interface ExplanationClient {
  generateExplanation(govItemName: string, method: string): Promise<BilingualDisposalExplanation>
}
