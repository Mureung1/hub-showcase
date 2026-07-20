# Learning Knowledge Data

## 목적

`data` 폴더의 공식 문서 자료는 커리큘럼 자체가 아니라 학습 설명과 추천의 근거 데이터로 사용합니다. ICU에서는 학습 순서와 레벨 구조를 `shared/curriculum/*.json`이 담당하고, 공식 문서 chunk는 Curriculum Planner Agent, Review Agent, RAG Answer Agent가 참고하는 knowledge source로 분리합니다.

## 현재 데이터

| 파일 | 상태 | 활용 방식 |
| --- | --- | --- |
| `data/docker-docs-chunks.jsonl` | 사용 가능 | Docker 공식 문서 chunk 검색, DevOps/Docker 커리큘럼 추천 근거, 향후 RAG source |
| `data/React_레거시_공식문서_한국어_전체.pdf` | 원본 보관 | 텍스트 추출과 chunking 이후 React 보조 지식 source로 사용 |

Docker JSONL chunk 스키마:

```ts
type KnowledgeChunk = {
  id: string
  docTitle: string
  sectionHeading: string
  chunkText: string
  url: string
  sourcePath: string
  sourceType: 'official-doc'
  topic: string
}
```

`id`, `sourceType`, `topic`은 loader가 보강합니다. 원본 JSONL에는 `docTitle`, `sectionHeading`, `chunkText`, `url`, `sourcePath`가 들어 있습니다.

## 활용 흐름

```txt
User goal
  -> Curriculum Agent
  -> shared/curriculum/*.json에서 track/module 후보 선택
  -> data/*chunks.jsonl에서 관련 공식 문서 chunk 검색
  -> GeneratedCurriculumPlan에 추천 이유와 resource 근거 반영
```

v1에서는 검색 결과를 바로 화면에 노출하기보다 agent prompt/context에 넣는 근거 데이터로 사용합니다. 화면에는 기존 `resources.url`과 생성된 설명만 보여주고, 원문 chunk 전문을 길게 노출하지 않습니다.

## React PDF 처리 방침

React PDF는 바로 agent 입력으로 사용하지 않습니다. 다음 전처리가 먼저 필요합니다.

1. PDF 텍스트 추출
2. 제목/섹션 기준 chunk 분리
3. `docTitle`, `sectionHeading`, `chunkText`, `url`, `sourcePath` 형식으로 JSONL 저장
4. 최신 React 공식 문서와 레거시 문서 구분 metadata 추가
5. 오래된 API 설명은 `legacy` 표시 후 초보자 기본 커리큘럼의 주 근거로 쓰지 않기

## 구현 단계

1. Docker JSONL loader를 backend knowledge adapter로 추가합니다.
2. loader는 깨진 JSONL 행을 건너뛰고, 필요한 필드가 없는 chunk도 제외합니다.
3. 간단한 keyword search를 제공해 RAG 이전 단계에서도 agent가 관련 chunk를 찾을 수 있게 합니다.
4. Curriculum Agent API 단계에서는 `shared/curriculum` 결과를 먼저 고르고, knowledge search 결과는 추천 이유와 resource 보강에만 사용합니다.
5. RAG 단계에서는 같은 adapter 뒤에 embedding/vector search adapter를 추가합니다.

## 제외 범위

- PDF 원문 추출 구현
- embedding 생성
- vector DB 연동
- React 화면에서 chunk 전문 표시
- Docker/React 문서를 커리큘럼 JSON으로 직접 변환