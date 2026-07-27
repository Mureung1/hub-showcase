# 실제 채용 공고 크롤링 계획 (이슈 #23)

> 월요일(4주차)에 조사·결정한 내용을 정리한 문서. 화요일에 이 문서 그대로 `backend/scripts/crawlPostings.mjs`를 구현한다.

## 목표

`backend/data/postings.json`의 목업 10건(채용4·인턴2·공모전2·대외활동2)을 실제 크롤링 데이터로 교체한다. 스키마(`id, category, org, title, deadline, field, target, applyMethod, conditions, keywords, gpaMin, essayQuestions[{question, maxLength}]`)는 그대로 유지 — `backend/src/routes/profiles.js`(매칭)와 `backend/src/routes/drafts.js`(자소서 초안)가 이 shape만 지키면 코드 수정이 필요 없다.

## 대상 사이트 — 링커리어(linkareer.com) 단독으로 확정

**조사 과정**:
- 잡코리아: robots.txt에 Claude 계열 봇(`ClaudeBot`/`Claude-Web`/`anthropic-ai`)을 이름으로 명시 차단 → 배제
- 사람인: robots.txt 요청 자체가 봇 차단 페이지로 리다이렉트 → 배제
- 캐치(catch.co.kr): robots.txt 문제없고 SSR 확인, 자소서 1번 문항+글자수 제한이 로그인 없이 공개돼 있었음 — 하지만 채용+인턴만 다루고 공모전/대외활동 카테고리가 없음
- **링커리어**: robots.txt 전면 허용(`Allow: /`, 관련 없는 `/stem/learn/*` 이러닝 경로만 차단), Next.js SSR 확인(curl로 그대로 실제 콘텐츠 받아짐), **채용/인턴/공모전/대외활동 4개 카테고리를 전부 커버**, 그리고 결정적으로 **"합격 자소서" 아카이브(`/cover-letter/search`)에서 실제 자소서 문항 전문+글자수 제한을 회사명으로 검색해 로그인 없이 가져올 수 있음** — 캐치보다 우위라 링커리어 하나로 확정

로그인해서 더 많은 데이터를 가져오는 방식은 검토했으나 **하지 않기로 결정**(사이트가 의도적으로 만든 접근 통제를 자동화로 우회하는 것이라 판단, 실익 대비 리스크가 큼). 지금 방식(공개 페이지만)으로 이미 충분한 실제 데이터를 확보했다.

## 확인된 URL 패턴

### 1. 카테고리별 목록 (필터 적용, 전부 curl로 SSR 확인됨)

| 카테고리 | URL | 비고 |
|---|---|---|
| 채용 | `/list/recruit?filterBy_jobTypes=NEW&filterBy_orgTypeIDs=1&filterBy_status=OPEN&orderBy_direction=DESC&orderBy_field=RECENT&page=1` | 신입 + 대기업 필터 (검색결과 92건 확인) |
| 인턴 | `/list/intern?filterBy_orgTypeIDs=1&filterBy_status=OPEN&orderBy_direction=DESC&orderBy_field=RECENT&page=1` | 대기업 필터 |
| 공모전 | `/list/contest?filterBy_status=OPEN&orderBy_direction=DESC&orderBy_field=RECENT&page=1` | 기업 규모 개념 없음, OPEN만 |
| 대외활동 | `/list/activity?filterBy_status=OPEN&orderBy_direction=DESC&orderBy_field=RECENT&page=1` | 기업 규모 개념 없음, OPEN만 |

각 목록 페이지의 raw HTML에서 `href="/activity/{id}"` 패턴으로 개별 공고 ID를 추출한다(채용/인턴/공모전/대외활동 전부 이 하나의 URL 패턴으로 통일돼 있음 — 실제 채용 공고도 `/activity/{id}`로 열림, 사이트 내부적으로 "activity"라는 통합 개념을 쓰는 것으로 보임).

### 2. 공고 상세 페이지

`/activity/{id}` — 이미 실제 데이터로 확인된 필드:
- 기업형태(대기업/중견기업/외국계기업 등) → 참고용, 이미 목록 필터에서 대기업으로 걸렀으니 검증용
- 접수기간(시작일/마감일) → `deadline`
- 채용형태(신입/경력직/계약직 등) → `target`
- 모집직무(예: 기획/경영, IT/개발 등) → `field`, 그리고 `keywords`로도 재사용
- 근무지역 → `conditions`에 포함
- 홈페이지 링크 → `applyMethod`
- 전형방법(서류→면접→...) → `conditions`에 포함
- 회사명, 공고 제목 → `org`, `title`

**주의**: 이 상세 페이지 자체에는 자소서 문항이 없다("지원서 다운로드 — 지원서 파일 없음"). 문항은 아래 3번에서 별도로 가져온다.

### 3. 자소서 문항 — `/cover-letter/search`

- `GET /cover-letter/search?keyword={회사명 URL인코딩}` → 검색 결과 페이지에서 `/cover-letter/{id}` 목록 추출 (예: `keyword=테슬라` → "테슬라 합격자소서 58건", ID 다수 확인)
- 첫 번째(또는 임의) 결과 하나를 골라 `/cover-letter/{id}` 상세 페이지를 가져오면, 실제 문항 전문과 글자수 제한이 번호가 매겨진 형태로 그대로 나온다. 예:
  ```
  1. 올리브영 지원 직무로 입사하게 된다면 어떤 역할을 수행할 것이라고 기대하는지 말씀해주세요. (600자 이내)
  2. 지원 직무를 잘 수행할 수 있다고 생각하는 이유를... (800자 이내)
  3. 올리브영이 일하는 방식 중... (600자 이내)
  ```
  이 텍스트에서 `숫자. 문항내용 (N자 이내)` 패턴을 정규식으로 파싱해 `essayQuestions[{question, maxLength}]`로 변환한다.
- **검색 결과가 없는 회사**(중소 규모거나 인지도가 낮은 경우)는 자소서 문항을 못 찾을 수 있음 — 이 경우 대응은 화요일 구현 중 실제로 몇 건이나 걸리는지 보고 결정(빈 배열로 둘지, 비슷한 직무의 다른 회사 문항을 빌려올지 등).

## 필드 매핑 요약

| 스키마 필드 | 출처 |
|---|---|
| `id` | 크롤링 순번으로 새로 부여 |
| `category` | 크롤링한 목록 종류(채용/인턴/공모전/대외활동) 그대로 |
| `org`, `title` | `/activity/{id}` 실제 값 |
| `deadline` | `/activity/{id}`의 마감일 실제 값 |
| `field` | `/activity/{id}`의 모집직무 실제 값 |
| `target` | `/activity/{id}`의 채용형태 실제 값 |
| `applyMethod` | `/activity/{id}`의 홈페이지 링크 |
| `conditions` | 근무지역 + 전형방법 등 실제 값 조합 |
| `keywords` | `field`(모집직무 태그)를 그대로 재사용 — 실제 페이지 값, Claude 생성 아님 |
| `gpaMin` | 실제 페이지에 없음 — 목업과 동일하게 0 또는 조건 없음으로 둠 |
| `essayQuestions` | `/cover-letter/search`로 찾은 실제 문항(회사별 1건). 못 찾으면 화요일에 대응 결정 |

## 아키텍처 — 캐시 스냅샷 (수동 실행)

- 실시간 크롤링이 아니라, **스크립트를 수동으로 실행해서 결과를 `backend/data/postings.json` 파일로 저장**하는 방식. Render 무료 티어에서 매 요청마다 크롤링 지연이 추가되는 걸 피하기 위함.
- 자동 갱신(cron/스케줄러)은 만들지 않음 — 캠프가 이번 주로 끝나는 일회성 프로젝트라 과한 인프라. 필요하면 데모 직전(수요일)에 한 번 더 수동 실행.
- (향후 아이디어, 지금은 범위 밖) 로그인 시 그날 크롤링 안 했으면 자동 실행하는 lazy-refresh 방식도 있을 수 있음 — 나중에 트래픽이 실제로 생기면 고려.

## 화요일 구현 순서

1. `backend/scripts/crawlPostings.mjs` 스캐폴딩 — 카테고리별 목록 URL 접속 → ID 추출
2. 상세 페이지(`/activity/{id}`) fetch → cheerio로 파싱 → 필드 매핑
3. 회사명으로 `/cover-letter/search` → 문항 파싱 → `essayQuestions` 채우기
4. 필요한 개수(채용4·인턴2·공모전2·대외활동2)만큼 확보되면 중단
5. 순수 파싱/검증 로직은 `backend/scripts/lib/`로 분리해 vitest 단위테스트 (test-writer 스킬 컨벤션)
6. 기존 목업을 `backend/data/postings.mock.json`으로 백업 후 `postings.json` 교체
7. curl로 `POST /api/profiles`/`POST /api/postings/:id/draft` 회귀 확인 + verification-agent로 브라우저 전체 흐름 재검증
8. Render 재배포, 체크리스트 갱신

## 수요일

- 화요일 결과가 깨끗하면 그대로 데모/영상에 사용
- 문제가 남아있으면 즉시 손 떼고 기존 목업 데이터로 데모 진행(이미 배포·검증된 상태라 리스크 없음) — 영상 제작(이슈 #27)에 집중
