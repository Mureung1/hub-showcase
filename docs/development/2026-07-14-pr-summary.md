# [N187_정현우] - 실제 서비스 구조 분리 및 Phase 2 구현 계획 정리

## 주요 작업 리스트

- 실제 서비스 source를 `product/`로 이동하고 문서 배포와 물리적으로 분리했습니다.
  - React: `product/apps/web`
  - FastAPI: `product/apps/api`
  - 데이터·Scene 파일: `product/data`
  - 제품용 script: `product/scripts`
- 제품과 문서가 서로 포함되지 않는 독립 배포 artifact를 구성했습니다.
  - 제품: `product/apps/web/dist`
  - 문서: `dist/docs-site`
  - 관련 이슈: [#9 ARCH-002 / W2-D2](https://github.com/HyunKN/hub/issues/9)
- 기존 실행 명령, 문서 경로, Task Packet과 보안 점검 경로를 새 `product/` 구조에 맞게 갱신했습니다.
- 전체 검증된 canonical 데이터를 Supabase PostgreSQL로 옮기기 위한 범위를 구체화했습니다.
  - 현재 UI의 4개 Category만 옮기지 않고 canonical 7개 table과 원본 업종 코드를 보존합니다.
  - 운영 API 요청 시점·갱신 주기·raw 보존 정책은 별도 Task로 분리했습니다.
  - 관련 이슈: [#11 DB-001 / W2-D4](https://github.com/HyunKN/hub/issues/11), [#30 DATA-007](https://github.com/HyunKN/hub/issues/30)
- 핵심 점포만 아기자기한 stylized 3D storefront로 표현하는 지도 확장 계획을 작성했습니다.
  - 일반 건물은 기존 2.5D 표현을 유지합니다.
  - 핵심 점포는 GLB prefab, material, UV/decal과 업종별 대표 장식을 조합합니다.
  - 관련 이슈: [#31 MAP-004](https://github.com/HyunKN/hub/issues/31)
- 점수 공식 보완을 즉시 안전성 수정과 장기 업종별 calibration으로 분리했습니다.
  - 관련 이슈: [#32 SCORE-002](https://github.com/HyunKN/hub/issues/32), [#33 SCORE-003](https://github.com/HyunKN/hub/issues/33)
- 다음 구현 순서는 DB 이관 후 제한된 상권·점포 검색 연결입니다.
  - 관련 이슈: [#12 SEARCH-001 / W2-D5](https://github.com/HyunKN/hub/issues/12)

> 이번 변경에서 코드로 완료한 범위는 `ARCH-002`입니다. `DB-001`, `DATA-007`,
> `MAP-004`, `SCORE-002`, `SCORE-003`은 다음 작업자가 문서만 읽고 구현할 수 있도록
> 작성한 계획이며 아직 기능 구현 완료를 의미하지 않습니다.

## 내가 설명할 수 있는 부분

- Supabase는 PostgreSQL을 원격에서 운영해 주는 서비스이고, SQLAlchemy와 Alembic은 DB가 아니라 각각 DB 접근과 schema migration을 담당하는 도구라는 점
- SQLite는 현재 검증된 canonical 데이터의 이관 기준이며, 실제 제품 runtime DB는 Supabase PostgreSQL 하나로 정한 이유
- 로컬 DB와 원격 DB를 무조건 둘 다 운영하는 것이 아니라, 이번 주에는 Supabase를 runtime으로 사용하고 Docker PostgreSQL은 필수 범위에서 제외한 이유
- 현재 화면의 카페·음식점·베이커리·편의점 4개 Category가 전체 수집 업종이 아니라 UI/API가 우선 지원하는 분류라는 점
- 공공데이터·서울 열린데이터 요청이 현재 자동 주기 실행이 아니라 명시적인 CLI 실행으로만 작동하며, 운영 주기는 `DATA-007`에서 나중에 결정한다는 점
- 기존 문서 배포와 실제 서비스 배포를 별도 폴더와 별도 artifact로 나눠야 서로의 내부 파일이 공개 배포물에 섞이지 않는다는 점
- 일반 건물의 2.5D 표현은 유지하면서 검색 결과의 핵심 점포만 별도의 3D storefront로 표현하는 이유

## 아직 이해 못 한 부분

- SQLAlchemy model과 Alembic migration을 실제 Supabase 프로젝트에 적용하고 rollback하는 구체적인 구현 과정
- Supabase의 connection pool, Row Level Security와 server-only credential을 실제 배포 환경에서 함께 구성하는 방법
- 업종 수가 늘어날 때 GLB prefab, material, UV/decal asset을 자동 선택하고 성능 예산 안에서 관리하는 구현 방식
- 점수 공식의 업종별 weight를 어떤 과거 기간과 결과 지표로 검증해야 과적합 없이 채택할 수 있는지

## 새로 알게 된 것

- `product/`라는 source 경계와 Vercel의 배포 artifact 경계는 별개이며 둘 다 분리·검사해야 실제 배포 파일이 안전하게 나뉜다는 점
- 파일을 폴더로 이동한 뒤에는 실행 명령뿐 아니라 test, Task Packet, 보안 점검 문서와 데이터 경로도 함께 바꿔야 한다는 점
- DB 전체 데이터 보존 범위와 화면에서 당장 지원하는 Category 범위는 서로 다르게 설계할 수 있다는 점
- stylized 3D storefront는 단순히 건물 높이를 올리는 것이 아니라 prefab mesh에 material, UV/decal과 업종별 장식을 조합하는 asset system이라는 점
- 점수 공식의 명백한 안전성 문제 수정과 업종별 weight calibration은 근거와 검증 비용이 달라 별도 Task로 나누는 것이 안전하다는 점

## 검증 결과

- `pnpm --dir product check`: 통과
- React test: 2 files, 7 tests 통과
- FastAPI test: 34 tests 통과
- TypeScript typecheck, lint, format check, production build: 통과
- Task Packet, 문서 index, HTML/local link, Document Viewer URL 검사: 통과
- 제품·문서 artifact 상호 포함 및 secret-like 파일 검사: 통과
- `git diff --check`: 통과
- 기존 Vite 대형 chunk 경고는 남아 있으며 이번 구조 변경의 실패로 판단하지 않았습니다.

