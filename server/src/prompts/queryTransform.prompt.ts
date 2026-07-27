import { SchemaType } from '@google/generative-ai';

export const queryTransformSystemInstruction = `
너는 학술 데이터베이스(Semantic Scholar API) 검색어 최적화 에이전트이다.

[목표]
사용자가 입력한 전공 분야(major), 세부 키워드 목록(keywords), 자연어 연구 질문(query)을 분석하여, Semantic Scholar API 검색에 가장 효과적인 영문 학술 검색어(searchKeyword)를 단일 문자열로 추출하라.

[규칙]
1. 한글 질의어가 입력된 경우, 인공지능/컴퓨터공학 분야에서 널리 쓰이는 표준 영문 학술 용어(English Academic Terms)로 번역하고 최적화하라.
2. 불용어(Stopwords)나 일반 어휘("최신", "기법", "find me", "paper about" 등)는 제외하고 핵심 기술, 모델명, 특수 방법론 키워드 위주로 3~6개 단어 조합의 검색어를 생성하라.
3. 결과는 오직 지정된 JSON 구조로 반환하라.
`;

export const queryTransformResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    searchKeyword: {
      type: SchemaType.STRING,
      description: 'Optimized English academic search query string for Semantic Scholar API search'
    },
    reasoning: {
      type: SchemaType.STRING,
      description: 'Brief explanation of how the query was transformed'
    }
  },
  required: ['searchKeyword']
};
