# 상세 페이지 매칭도 불일치 수정 (이슈 #61)

> 작성일: 2026-07-25 (토) · 대상 이슈: [#61 상세 페이지 매칭도가 리스트와 다르게 표시됨](https://github.com/syd348/hub/issues/61)

## 목표 (한 줄)

**상세 페이지의 매칭도가 리스트에서 본 값과 항상 같게 만든다 — 평소엔 리스트 캐시를 재사용하고, 캐시가 없을 때만(직접 URL·새로고침) 서버가 프로필 기준으로 재계산한다.**

## 현재 상태 (전환 전, 조사 완료)

- `POST /api/match`(`server/src/routes/match.ts` → `subsidies-repo.ts:177-187`)는 프로필을 받아
  `scoreForProfile()`로 계산한 점수를 반환
- `GET /api/subsidies/:id`(`subsidies-repo.ts:119-131`)는 프로필 파라미터가 없고, DB의
  `match_score` 컬럼(크롤러가 넣은 고정 중립값 50 등)을 그대로 반환 (`mappers.ts:32`)
- `src/api/client.ts`의 `getSubsidy(id)`도 프로필을 넘기지 않음, `useSubsidy` 훅도 마찬가지
- 두 값이 서로 다른 계산 경로를 타기 때문에 사용자에게 다른 숫자로 보임

## 범위

### 포함 (이번 이슈)
- `GET /api/subsidies/:id`가 `region`/`industry` query parameter를 받아 `scoreForProfile()`로
  일관되게 계산 (fallback 경로)
- client: 리스트 조회(`useSubsidies`) 캐시에 같은 id가 있으면 그 값을 상세에 그대로 사용,
  없으면 프로필을 포함해 상세 API 호출
- 직접 URL 접속/새로고침 시에도 정확한 매칭도가 뜨는지 수동 검증

### 제외 (다음으로)
- 매칭 점수 계산식 자체의 변경 — #62(region 필터링)에서 별도로 다룬다

## 실행 순서

### 묶음 1 — 서버: 단건 조회에 프로필 기반 스코어링 추가 (완료, 2026-07-25)
- [x] `findById(id, profile?)`가 profile이 있으면 `scoreForProfile()` 적용하도록 수정
- [x] `GET /api/subsidies/:id` 라우트가 query parameter(`region`, `industry`)를 zod로 검증해 전달
- [x] 기존 라우트 테스트(`subsidies.test.ts`) profile 없는 경우 회귀 확인 + profile 있는 경우 케이스 추가
- [x] repo 레벨 테스트(`subsidies-repo.test.ts`) `findById` profile 유무 케이스 추가

### 묶음 2 — client: 리스트 캐시 재사용 + fallback 연결 (완료, 2026-07-25)
- [x] `useSubsidy(id, profile)`가 TanStack Query 캐시(`['subsidies', profile]` 접두사)에서 같은
      id 항목을 찾아 `initialData`로 사용
- [x] 캐시에 없으면 `getSubsidy(id, profile)`로 네트워크 요청 (프로필 쿼리 파라미터 포함)
- [x] 실제 실행 중인 dev 서버로 end-to-end 검증: `POST /api/match`와 `GET /api/subsidies/:id?region=...&industry=...`가 같은 프로필에 대해 동일한 값(80) 반환 확인, profile 없이 호출하면 저장된 원본값(50) 유지 확인
- [ ] ~~브라우저로 리스트→클릭→상세 직접 확인~~ — 이 환경에서 Chrome 확장이 연결 안 돼 있어
      브라우저 클릭 테스트는 못 함(아래 리스크 표). API 레벨 end-to-end 검증으로 대체

## 완료 기준

- [x] 리스트에서 클릭해 들어간 상세 페이지는 리스트와 매칭도가 항상 같다 (API 레벨로 검증,
      브라우저 클릭 테스트는 미실행 — 아래 리스크 표)
- [x] 직접 URL 접속·새로고침 시에도 프로필 기준으로 정확히 계산된 매칭도가 뜬다
- [x] `npm test`(88 passed)/`npm run lint` 통과

**이슈 #61 완료 (2026-07-25)**

## 리스크 / 결정 필요

| 항목 | 내용 | 결정 |
|------|------|-----------|
| 캐시 재사용 vs 항상 서버 재계산 | 항상 재계산은 로직상 안전하지만 리스트→상세 이동마다 불필요한 네트워크 요청 발생 | **하이브리드로 결정** (2026-07-25, 사용자 확인) — 캐시 우선, 없을 때만 서버 재계산 |
| profile 없는 상태(온보딩 미완료)로 상세 접근 | region/industry가 빈 값일 수 있음 | `scoreForProfile`은 이미 빈 값에 안전(보너스/페널티 미적용) — 별도 처리 불필요 |
| 브라우저 클릭 테스트 미실행 | 이 작업 환경에 Chrome 확장이 연결 안 돼 있어 리스트→클릭→상세 실제 클릭 흐름을 직접 확인 못 함 | `npm run dev`로 서버 띄운 뒤 `POST /api/match`와 `GET /api/subsidies/:id?region=&industry=`를 동일 프로필로 호출해 값이 일치함을 확인(80=80), profile 없이 호출하면 원본값(50) 유지 확인 — API 레벨로 대체 검증. 실제 화면 클릭 확인은 다음 수동 QA(#57 체크리스트) 때 병행 권장 |
