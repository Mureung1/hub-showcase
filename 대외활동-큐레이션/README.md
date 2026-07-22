# 대외활동 큐레이션

기획은 [docs/기획.md](docs/기획.md), 데이터 전략은 [docs/데이터-수집.md](docs/데이터-수집.md), 설계는 [docs/schema.md](docs/schema.md),
개발 백로그는 [docs/checklist.md](docs/checklist.md), 이번 주 계획은 [docs/주간계획.md](docs/주간계획.md)에.

대학생 대외활동, 공모전, 장학, 봉사 정보는 링커리어, 콘테스트코리아, 온통청년, 장학재단, 1365 등
여러 곳에 흩어져 있다. 각 사이트는 모든 공고를 다 보여줄 뿐이라, 내가 실제로 지원할 수 있는 건
직접 골라내야 한다. 이 프로젝트는 거기서 출발한다.

## 무엇을 만드나

- **흩어진 공고를 최대한 다 모은다(총망라). 이게 1순위다.** 소스를 계속 늘리고, 각 소스에서 빠짐없이 긁는다.
- 다 모은 것 중 내 조건(학년·전공·지역·소득 등)에 맞는 걸 정확히 골라 위로 올린다. 안 되는 건 이유까지
  보여준다. 이 개인 자격 매칭이 차별점이다.
- 커버하는 소스는 분명히 밝힌다. 인터넷 전체를 다 훑겠다는 약속은 안 하지만, 커버 범위 안에서는 안 놓친다.

## 로드맵

- 1주차: 기획·설계·디자인·개발 환경 (완료)
- 2주차: React 화면 -> Supabase 직접 조회로 실데이터 한 사이클 (완료)
- 3주차: 총망라 (콘테스트코리아·링커리어·위비티·부산청년플랫폼·온통청년 다섯 소스 크롤러, 중복·노이즈 제거,
  놓침 방지 자동정지, 상세화면 즉시 재매칭 완료. LLM 파싱은 코드 작성 완료, 실제 호출은 키 발급 후 검증 예정)
- 4주차: 정확도 측정·상세 근거·배포 (진행 예정)

세부 진행 상황은 [docs/checklist.md](docs/checklist.md)에 항목별로 정리돼 있다.

## 구조

Express 서버는 없다. React가 Supabase를 직접 조회(supabase-js)하고, 매칭도 화면 쪽 자바스크립트(match.js)에서
계산한다. 조건 입력 -> 결과(가능/확인 필요/거의 가능/불가)까지 화면 흐름은 이렇다.

```mermaid
flowchart TD
  A[접속] --> B[기본 조건 입력]
  B --> C{결과 화면}
  C --> D[지원 가능 탭]
  C --> E[지원 불가 탭 + 사유]
  C --> X[확인 필요 탭]
  C --> Fv[즐겨찾기]
  D --> F[공고 상세 · 원본 근거 보기]
  F --> H[원문으로 지원]
  E --> G[프로필 바로 수정]
  X --> G
  G --> C
  C -->|장학 탭| I[소득분위·학점 추가 입력 · 잘 모름 가능]
  I --> C
```

## 아키텍처 (화면·수집기·DB, 데이터가 흐르는 방향)

이 서비스엔 흔한 "화면 -> 서버 -> DB" 구조가 아니라, **화면과 완전히 분리된 두 갈래 길**이 있다. 화면(React)은
Supabase에서 읽기만 하고, 쓰기(수집)는 화면과 무관하게 별도 Node 스크립트가 온디맨드로 돈다. 그래서 서버 박스가
없다 - 사용자 액션이 DB에 쓰는 경로 자체가 아예 없다는 게 이 구조를 그려보고 나서 알게 된 점이다.

```mermaid
flowchart LR
  subgraph React["React (화면)"]
    Pages["HomePage · DetailPage · FavoritesPage"]
    Match["match.js (자격 판정)"]
    Pages --> Match
  end

  subgraph Collector["Node 스크립트 (화면과 분리, 온디맨드)"]
    Sources["sources/*.js (5개 소스)"]
    Collect["batch/collect.js"]
    Sources --> Collect
  end

  subgraph DB["Supabase (DB)"]
    Postings[("postings 테이블")]
  end

  Pages -- "select (supabase-js, anon key)" --> Postings
  Collect -- "upsert (service key)" --> Postings
```

지금은 `node batch/collect.js`를 손으로 실행하고 있고, GitHub Actions로 하루 2회 자동 실행하는 워크플로
(`.github/workflows/collect.yml`)는 설계·작성까지 끝났지만 시크릿 미등록으로 아직 활성화 전이다(#23).

## 실행

```bash
npm install
npm run dev
```
