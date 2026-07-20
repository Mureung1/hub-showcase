# Learning Knowledge Data

## 목적

`data` 폴더의 공식 문서 자료는 커리큘럼 자체가 아니라 학습 설명과 추천의 근거 데이터로 사용합니다. ICU에서는 학습 순서와 레벨 구조를 `shared/curriculum/*.json`이 담당하고, 공식 문서 chunk는 Curriculum Planner Agent, Review Agent, 이후 RAG Answer Agent가 참고하는 knowledge source로 분리합니다.

## 현재 데이터

| 파일 | 상태 | 사용 방식 |
| --- | --- | --- |
| `data/docker-docs-chunks.jsonl` | 사용 가능 | Docker 공식 문서 chunk 검색, DevOps/Docker 커리큘럼 추천 근거, 이후 RAG source |
| `data/react_docs.jsonl` | 사용 가능 | React 공식 문서 chunk 검색, React/frontend 커리큘럼 추천 근거, 이후 RAG source |
| `data/React_레거시_공식문서_한국어_전체.pdf` | 원본 보관 | JSONL 재생성 또는 품질 확인용 원본 자료 |

## JSONL 스키마

표준 JSONL 한 줄은 하나의 knowledge chunk입니다.

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

현재 loader는 기존 React JSONL 호환을 위해 다음 alias도 지원합니다.

```ts
type ReactKnowledgeChunkAlias = {
  title: string
  content: string
  url: string
}
```

Alias 정규화 규칙:

- `docTitle = title`
- `sectionHeading = title`
- `chunkText = content`
- `sourcePath = url`
- `topic`은 파일명에 `react`가 포함되면 `react`로 추론합니다.

## 데이터 추가 기준

새로운 학습 데이터가 들어오면 다음 순서로 확인합니다.

1. 공식 문서 또는 신뢰 가능한 학습 자료인지 확인합니다.
2. 학습 순서 데이터인지, 근거 지식 데이터인지 구분합니다.
3. 학습 순서라면 `shared/curriculum/*.json` 후보입니다.
4. 문서 본문이라면 `data/*chunks.jsonl` 또는 기존 수집명 JSONL 후보입니다.
5. JSONL은 표준 필드 또는 지원 alias를 갖춰야 합니다.
6. chunk는 하나의 섹션이나 개념 단위로 나누고, 너무 긴 원문 전체를 한 줄에 넣지 않습니다.
7. topic이 명확해야 agent 검색 품질이 유지됩니다.

## 사용 흐름

```txt
User goal
  -> Curriculum Agent
  -> shared/curriculum/*.json에서 track/module 후보 선택
  -> data/*.jsonl에서 관련 공식 문서 chunk 검색
  -> Gemini prompt의 knowledgeContext에 최대 5개 chunk 삽입
  -> GeneratedCurriculumPlan 생성
```

중요한 기준:

- 커리큘럼 순서는 `shared/curriculum/*.json`이 결정합니다.
- knowledge JSONL은 추천 이유, 오늘 미션 설명, 학습 근거를 보강하는 용도입니다.
- agent는 knowledge chunk 원문을 길게 복사하지 않고, 요약된 근거로만 사용합니다.
- 브라우저 화면은 chunk 전문을 직접 노출하지 않습니다.

## React PDF 처리 방침

React PDF는 바로 agent 입력으로 사용하지 않습니다. 현재는 `react_docs.jsonl`을 우선 사용합니다.

PDF를 다시 처리해야 할 때는 다음 전처리가 필요합니다.

1. PDF 텍스트 추출
2. 제목과 섹션 기준 chunk 분리
3. `docTitle`, `sectionHeading`, `chunkText`, `url`, `sourcePath` 형식으로 JSONL 저장
4. 최신 React 공식 문서와 레거시 문서 구분 metadata 추가
5. 오래된 API 설명은 `legacy`로 표시하고 초보자 기본 커리큘럼의 주 근거로 사용하지 않기

## 구현 상태

- Docker와 React JSONL을 backend knowledge adapter에서 optional source로 읽습니다.
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
