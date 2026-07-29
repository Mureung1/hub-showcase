import { SchemaType } from '@google/generative-ai';

export function buildCurateRAGSystemInstruction(major: string, keywords: string[], query: string, lang: 'KO' | 'EN' = 'KO'): string {
  const keywordsStr = Array.isArray(keywords) && keywords.length > 0 ? keywords.join(', ') : (lang === 'EN' ? 'None' : '없음');
  const targetLanguage = lang === 'EN' ? 'English' : 'Korean';

  return `
너는 최고 수준의 인공지능(AI/ML) 연구 큐레이션 에이전트이다.

[사용자의 맥락 및 연구 질의 (Context Retention)]
- 전공 분야 (Major): "${major}"
- 연구 세부 키워드 (Keywords): [${keywordsStr}]
- 최우선 연구 질문 (Original Query): "${query}"
- 응답 언어 지침 (Language Requirement): MUST generate all output fields (reasoning and insights background, coreMethod, quantitativeResult) strictly in ${targetLanguage}.

[큐레이션 및 데이터 클렌징 원칙]
1. 최우선 연관성 필터링 (Relevance Filtering): OVG 기준을 평가하기에 앞서, 수집된 50편의 논문 중 사용자의 전공("${major}") 및 최우선 연구 질문("${query}")을 해결하는 데 직접적으로 연관된(Relevant) 논문인지 최우선으로 필터링하라.
2. OVG 3대 학술 평가 (Originality, Validity, Generalizability): 연관성이 확보된 후보군 중 OVG 점수가 가장 뛰어난 논문(최대 5편)을 최종 선별하라.
3. 저자명 정제 (Authors Cleansing): 저자명(authors) 배열의 각 문자열에서 'Prof.', 'Dr.', 'Ph.D.', 'MD' 등의 모든 직함/학위/소속 표식을 완전히 제거하라. 동일 저자명이 중복 결합된 경우('John Doe John Doe') 단일 영문 성명('John Doe')으로 압축하라.
4. 채널명(Channel) 3단계 정제 및 압축 프로토콜:
   - 1순위 (공식 이니셜 약어 우선): CVPR, JMIR, SIGCSE, ACL, NeurIPS, IEEE TPAMI 등 통용되는 공식 약어 단독 출력.
   - 2순위 (기계적 마침표 축약 금지): 'Journal -> J.' 같은 마침표(.) 슬라이싱 축약 절대 금지.
   - 3순위 (핵심 키워드 추출): 약어 미존재 시 불용어 제거 후 핵심 고유 명사 키워드만 남겨 50자 이내로 압축.
5. 원문 링크 포함 (URL Preservation): 각 논문의 원문 접근 링크(url)를 반드시 포함하여 반환하라.
6. XAI 근거 및 3줄 인사이트 작성: 선별된 논문들에 대하여 사용자 연구 질문("${query}")과 전공("${major}")에 어떻게 부합하는지 reasoning과 insights(background, coreMethod, quantitativeResult)를 반드시 ${targetLanguage}로 명확히 기술하라.
   - insights.background: 연구 배경 및 풀어내고자 하는 핵심 문제
   - insights.coreMethod: 논문에서 제시한 독자적인 핵심 알고리즘/방법론
   - insights.quantitativeResult: 수치적 정량 성과 및 연구 개선 결과
7. 예외 수량 반환 지침: 직접 연관된 논문이 5편 미만인 경우 억지로 Fill-up하지 말고 연관된 논문만 반환하라. 연관 논문이 없을 시 빈 배열([])을 반환하라.
`;
}

export const curateRAGResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    papers: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          paperId: { type: SchemaType.STRING },
          title: { type: SchemaType.STRING },
          authors: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING }
          },
          channel: { type: SchemaType.STRING },
          year: { type: SchemaType.INTEGER },
          matchScore: { type: SchemaType.INTEGER },
          url: { type: SchemaType.STRING },
          ovgBreakdown: {
            type: SchemaType.OBJECT,
            properties: {
              originality: { type: SchemaType.INTEGER },
              validity: { type: SchemaType.INTEGER },
              generalizability: { type: SchemaType.INTEGER }
            },
            required: ['originality', 'validity', 'generalizability']
          },
          reasoning: { type: SchemaType.STRING },
          insights: {
            type: SchemaType.OBJECT,
            properties: {
              background: { type: SchemaType.STRING },
              coreMethod: { type: SchemaType.STRING },
              quantitativeResult: { type: SchemaType.STRING }
            },
            required: ['background', 'coreMethod', 'quantitativeResult']
          }
        },
        required: ['paperId', 'title', 'authors', 'channel', 'year', 'matchScore', 'ovgBreakdown', 'reasoning', 'insights']
      }
    }
  },
  required: ['papers']
};
