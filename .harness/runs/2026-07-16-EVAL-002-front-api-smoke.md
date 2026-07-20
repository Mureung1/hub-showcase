# Run Report: EVAL-002 Front-API 통합 smoke

## 결과

- 상태: Passed
- GitHub Issue: #27
- Jira: LT-10
- 환경: local React/FastAPI + development Supabase PostgreSQL
- secret 값은 log, 문서와 screenshot에 기록하지 않았다.

## 자동 검증

```text
API pytest: 104 passed
API Ruff: passed
Web Vitest: 52 passed, 전체 suite 2회 연속 통과
Web TypeScript typecheck: passed
Web lint: passed
Web production build: passed
Task packet, docs index, docs HTML/local links: passed
```

추가 회귀 범위:

- selected storefront style-loading test가 대형 3D module import 시간에 의존하지 않도록
  layer factory를 격리했고 전체 52개 test를 2회 연속 통과했다.
- nearby 빈 결과와 지원 영역 밖 422를 서로 구분
- DB schema가 없는 session의 503이 generic message만 반환
- 마지막 확정 request retry 후 ready 상태 복구
- 이전 request가 늦게 완료되어도 최신 중심 결과 유지
- 검색 503 후 같은 query retry와 empty 상태 복구
- 실제 중복 점포명은 안정 store ID를 React key로 사용

## 실제 development Supabase smoke

| 시나리오 | 결과 |
| --- | --- |
| `GET /health` | `ok` |
| `GET /api/v1/search?query=연남` | HTTP 200, 10 results |
| 연남 검색 결과 선택 | URL 중심·지도 marker·목록·우측 점포명이 함께 갱신 |
| `GET /api/v1/markets/3110562?category=카페` | HTTP 200, runtime PostgreSQL 분석·순위 2개 group |
| 연남 300m 카페 nearby | HTTP 200, 전체 1,151개, 카페 111개 |
| 검색 점포 선택 후 반경 변경 | 100m 10개, 500m 247개, URL·목록 동기화 |
| 제거된 1km 요청 | HTTP 422, 허용 반경 100m·300m·500m 안내 |
| 지원 영역 밖 중심 | HTTP 422 |
| 503 failure fixture | generic detail, DB 경로·SQL·stack trace 없음 |

## 지도 회귀

- OpenFreeMap style과 tile: HTTP 200
- `yeonnam.geojson`: HTTP 200
- `hongdae.geojson`: HTTP 200
- `hapjeong.geojson`: HTTP 200
- 지원 영역 밖에서는 기본 지도를 유지하고 분석 확정을 차단한다.

## Console·보안 확인

- `DATABASE_URL`, PostgreSQL, SQLAlchemy, traceback, password 패턴 노출: 0건
- Vercel CLI가 생성한 ignored `product/.env.local` OIDC 임시 파일을 삭제하고 Git 미추적을 확인했다.
- 실제 점포명의 React duplicate key 오류는 안정 store ID key로 수정했다.
- favicon 404는 inline SVG favicon을 추가해 제거했다.
- 남은 MapLibre nullable numeric·OpenFreeMap sprite 경고는 외부 style의 비차단 경고다.

## 후속 경계

- 공개 production 배포와 production Supabase 분리는 DEPLOY-001/002에서 수행한다.
- 인증·인가·privacy gate 전체는 SEC Epic에서 수행한다.
- 500m 이상 광역 분석과 PostGIS 최적화는 실제 부하 기준이 생기면 별도 성능 Task로 분리한다.
