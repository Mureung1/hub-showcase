# 매칭 리스트 페이지네이션 계획 (이슈 #48)

> 작성일: 2026-07-23 · 대상 이슈: [#48 매칭 리스트 화면 페이지네이션 없음](https://github.com/syd348/hub/issues/48)

## 목표 (한 줄)

**`POST /api/match`/`GET /api/subsidies`가 페이지 단위로 결과를 반환하고, `HomeScreen`이 "더보기"
버튼으로 다음 페이지를 이어붙이도록 만든다.**

## 현재 상태

- `server/src/db/subsidies-repo.ts`의 `findAll()`/`match()`가 정렬된 전체 배열을 그대로 반환
- `server/src/routes/subsidies.ts`/`match.ts`도 그 결과를 그대로 `res.json()` — `page`/`limit`
  파라미터 없음
- `src/pages/HomeScreen.tsx`가 `data.items`(현재 실데이터 기준 1500건)를 전부 `.map()`으로 렌더링
- `src/api/client.ts`의 mock fallback(`submitProfile` 실패 시)도 전체 8건을 그대로 반환 — 이건
  건수가 적어 문제 없음
- 와이어프레임(`prototype/gov_subsidy_home_wireframe.html`)엔 페이지네이션 패턴이 아예 없음
  (8건 샘플용으로 설계됨) — `.home-cards`는 단순 스크롤 컨테이너라 번호식 페이지네이션보다
  "더보기" 버튼이 기존 디자인 톤에 더 잘 맞음

## 범위

### 포함
- `POST /api/match`, `GET /api/subsidies`에 `page`(1-based)/`limit` 쿼리·바디 파라미터 추가
  — 정렬은 전체 데이터 기준으로 먼저 하고 그 다음 슬라이싱 (정렬 깨짐 방지)
- 응답에 `hasMore`(또는 `total` 대비 계산) 포함해 클라이언트가 "더보기" 노출 여부 판단
- `HomeScreen`에 "더보기" 버튼 — 클릭 시 다음 페이지 요청 후 기존 리스트에 이어붙임
- 정렬 기준(`sort`) 변경 시 페이지 상태 1로 리셋

### 제외 (다음으로)
- 무한 스크롤(자동 로드) — 이번엔 명시적 "더보기" 버튼으로 시작, 필요하면 후속 개선
- 가상 스크롤(virtualization) 라이브러리 도입 — 페이지네이션으로 렌더링 건수 자체를 줄이면
  당장은 불필요
- `src/api/client.ts`의 mock fallback 페이지네이션 — 8건뿐이라 현재 범위 밖

## 실행 순서

### 묶음 1 — 서버 페이지네이션 — **완료 (2026-07-23)**
- [x] `shared/src/types/subsidy.ts`/`match.ts`에 `page`/`limit` 요청 필드, `hasMore` 응답 필드 추가
- [x] `server/src/db/subsidies-repo.ts`의 `findAll()`/`match()`에 슬라이싱 로직 추가 (정렬 후 slice)
      — `applySort`에 id 기준 2차 정렬 추가해 동점 항목이 많은 region 가중치 특성상 페이지 간
      순서가 안 흔들리도록 함
- [x] `server/src/routes/subsidies.ts`/`match.ts`에 zod로 `page`/`limit` 검증(기본값 1/20, limit 상한 100)
- [x] 테스트 12건 추가 — 기본값 동작, 마지막 페이지 `hasMore: false`, limit 상한 초과/숫자 아닌
      값 기본값 대체, page/limit 그대로 repo 전달 확인. 전체 69/69 통과
- [x] 실제 서버(`localhost:3001`)로 수동 curl 검증 — `page=2`가 `page=1`과 다른 항목 반환,
      `page=abc&limit=9999` 같은 잘못된 값이 기본값(1/20)으로 정상 대체됨

### 묶음 2 — 클라이언트 "더보기" 연동 — **완료 (2026-07-23)**
- [x] `src/hooks/useSubsidies.ts` — `useQuery` → `useInfiniteQuery`로 전환 (`getNextPageParam`이
      `hasMore` 기준으로 다음 페이지 결정)
- [x] `src/pages/HomeScreen.tsx` — "더보기" 버튼 추가(`design-tokens.md` outline 버튼 스타일),
      `hasNextPage`일 때만 노출, 로딩 중엔 disabled + "불러오는 중..." 표시
- [x] 리스트 상단 건수 표시를 `subsidies.length`(로드된 개수) 대신 `total`(전체 매칭 건수)로 변경
- [x] 정렬 칩 변경 — `queryKey`에 `sort` 포함돼 있어 react-query가 자동으로 새 쿼리로 취급,
      별도 리셋 코드 없이 1페이지부터 다시 조회됨
- [x] `src/api/client.ts`의 mock fallback도 새 응답 형태(`page`/`limit`/`hasMore`)에 맞춤
- [x] `POST /api/match`로 page=1→2 실제 호출해 서로 다른 항목 반환, `hasMore` 정상 확인
      (브라우저 클릭 인터랙션은 playwright 미설치로 미검증 — build+lint+API 레벨까지만 확인)

## 완료 기준 — **전체 완료 (2026-07-23)**

- [x] 페이지네이션(또는 무한 스크롤) 방식이 결정되고 구현된다 — "더보기" 버튼으로 결정
- [x] `HomeScreen`이 한 번에 렌더링하는 카드 수가 제한된다 (기본 20건씩)
- [x] 정렬 기준 변경 시에도 페이지 상태가 자연스럽게 리셋된다 (`queryKey` 기반 자동 리셋)
- [ ] 1500건 규모 데이터로 실제 화면에서 스크롤 동작을 확인한다 — **미검증**: 이 환경에
      playwright/chromium-cli가 없어 브라우저 클릭 인터랙션은 못 봄. API 레벨(curl로 page 1→2
      호출) + 빌드/테스트까지만 확인함

## 리스크 / 결정 필요

| 항목 | 내용 | 제안 방침 |
|------|------|-----------|
| 페이지 크기 | 한 번에 몇 건씩 보여줄지 | 20건 기본값 — 모바일 한 화면에 카드 3~4개 보이는 비율 감안, 필요시 조정 |
| 정렬-슬라이싱 순서 | region 가중치(`scoreForProfile`)가 매 요청마다 재계산되는데, 페이지네이션과 순서가 꼬이면 같은 항목이 여러 페이지에 중복/누락될 수 있음 | 정렬 기준이 매 요청 동일(같은 profile/sort)하면 결정적(deterministic) 정렬이라 안전 — `match` 동점 시 `id` 기준 2차 정렬 추가해 안정성 보장 |
| API 하위 호환 | `page`/`limit` 없이 호출하면 어떻게 동작할지 | 기본값(`page=1`, `limit=20`)으로 동작 — 기존 호출부(있다면)도 안 깨짐 |

## 다음 이슈 (참고)

없음 — 독립 이슈.
