# Learning Knowledge Data

## 목적

`data` 폴더의 공식 문서 자료는 커리큘럼 자체가 아니라 학습 설명과 추천의 근거 데이터로 사용합니다. ICU에서는 학습 순서와 레벨 구조를 `shared/curriculum/*.json`이 담당하고, 공식 문서 chunk는 Curriculum Planner Agent, Review Agent, 이후 RAG Answer Agent가 참고하는 knowledge source로 분리합니다.

## 현재 데이터

| 파일 | 상태 | 사용 방식 |
| --- | --- | --- |
| `data/docker-docs-chunks.jsonl` | 사용 가능 | Docker 공식 문서 chunk 검색, DevOps/Docker 커리큘럼 추천 근거, 이후 RAG source |
| `data/React_레거시_공식문서_한글판_전체.pdf` | 원본 보관 | 텍스트 추출과 chunking 이후 React 보조 지식 source로 사용 |

## JSONL 스키마

원본 JSONL 한 줄은 하나의 knowledge chunk입니다.

```ts
type KnowledgeChunk = {
  docTitle: string
  sectionHeading: string
  chunkText: string
  url: string
  sourcePath: string
}
```

Loader는 다음 값을 보강합니다.

```ts
type LoadedKnowledgeChunk = KnowledgeChunk & {
  id: string
  sourceType: 'official-doc'
  topic: string
}
```

필수 규칙:

- `docTitle`: 사용자가 출처를 이해할 수 있는 문서 이름입니다.
- `sectionHeading`: chunk가 나온 섹션 제목입니다.
- `chunkText`: agent가 참고할 본문입니다. 너무 긴 원문 전체가 아니라 검색 가능한 단위로 나눕니다.
- `url`: 가능하면 공식 문서의 실제 URL을 넣습니다.
- `sourcePath`: 원본 파일이나 수집 경로를 추적하기 위한 값입니다.
- 파일명은 `{topic}-docs-chunks.jsonl` 형식을 우선 사용합니다. 예: `docker-docs-chunks.jsonl`.

## 사용 흐름

```txt
User goal
  -> Curriculum Agent
  -> shared/curriculum/*.json에서 track/module 후보 선택
  -> data/*chunks.jsonl에서 관련 공식 문서 chunk 검색
  -> Gemini prompt의 knowledgeContext에 최대 5개 chunk 삽입
  -> GeneratedCurriculumPlan 생성
```

중요한 기준:

- 커리큘럼 순서는 `shared/curriculum/*.json`이 결정합니다.
- `data/*chunks.jsonl`은 추천 이유, 오늘 미션 설명, 학습 근거를 보강하는 용도입니다.
- agent는 knowledge chunk 원문을 길게 복사하지 않고, 요약된 근거로만 사용합니다.
- 브라우저 화면은 chunk 전문을 직접 노출하지 않습니다.

## 데이터 추가 기준

새로운 학습 데이터가 들어오면 다음 순서로 확인합니다.

1. 공식 문서 또는 신뢰 가능한 학습 자료인지 확인합니다.
2. 학습 순서 데이터인지, 근거 지식 데이터인지 구분합니다.
3. 학습 순서라면 `shared/curriculum/*.json` 후보입니다.
4. 문서 본문이라면 `data/*chunks.jsonl` 후보입니다.
5. JSONL은 필수 필드 5개를 갖춰야 합니다.
6. chunk는 하나의 섹션이나 개념 단위로 나누고, 너무 긴 원문 전체를 한 줄에 넣지 않습니다.
7. topic이 명확해야 agent 검색 품질이 유지됩니다.

## React PDF 처리 방침

React PDF는 바로 agent 입력으로 사용하지 않습니다. 다음 전처리가 필요합니다.

1. PDF 텍스트 추출
2. 제목과 섹션 기준 chunk 분리
3. `docTitle`, `sectionHeading`, `chunkText`, `url`, `sourcePath` 형식으로 JSONL 저장
4. 최신 React 공식 문서와 레거시 문서 구분 metadata 추가
5. 오래된 API 설명은 `legacy`로 표시하고 초보자 기본 커리큘럼의 주 근거로 사용하지 않기

## 구현 상태

- Docker JSONL loader를 backend knowledge adapter로 추가했습니다.
- loader는 깨진 JSONL 행과 필수 필드가 없는 chunk를 제외합니다.
- 현재 검색은 단순 keyword scoring입니다.
- Curriculum Agent CLI와 API는 검색된 knowledge context를 Gemini prompt에 전달합니다.
- 이후 RAG 단계에서는 같은 adapter 뒤에 embedding/vector search adapter를 추가합니다.

## 제외 범위

- PDF 원문 추출 구현
- embedding 생성
- vector DB 연동
- React 화면에서 chunk 전문 표시
- Docker/React 문서를 커리큘럼 JSON으로 직접 변환