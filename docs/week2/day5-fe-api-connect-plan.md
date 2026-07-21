# 오늘 할 일 — 프론트엔드와 Express API 실제 연결 (이슈 #6)

> 작성일: 2026-07-21 (화) · 대상 이슈: [#6 프론트엔드와 Express API 실제 연결](https://github.com/syd348/hub/issues/6)

## 오늘의 목표 (한 줄)

**Vite proxy `/api/*`를 통해 실제 Express+Supabase 응답이 홈/상세 화면에 반영되는 것을 코드로 명시하고 검증한다.**

## 현재 상태 (전환 전)

- `#4`(매칭 API → Supabase, PR #21)가 이미 머지돼서 **경로 자체는 이미 연결돼 있음**:
  - `HomeScreen` → `useSubsidies` → `submitProfile()` → `POST /api/match` (성공하면 실제 DB 데이터 사용)
  - `SubsidyDetailScreen` → `useSubsidy` → `getSubsidy()` → `GET /api/subsidies/:id`
- 문제는 **주석·문서가 #4 이전 상태를 그대로 서술**하고 있음:

```54:56:src/api/client.ts
/**
 * POST /api/match — 서버에 아직 구현되지 않은 엔드포인트(수요일 이슈 #4 예정).
 ...
```

  - `getSubsidy`의 404→mock fallback 주석도 "서버 2건 vs mock 8건 불일치"를 근거로 드는데, #4에서 이미 8건으로 맞춰서 **더 이상 사실이 아님**.
- `getSubsidies()`(프로필 없는 단순 목록 조회)는 **어떤 화면에서도 호출되지 않는 죽은 코드** (`day2-verification-checklist.md` 5번 항목에 기록됨).
- 실제로 fallback이 언제 발생하는지 화면/콘솔에서 구분할 수 없음 — 검증 시 "진짜 API 응답인지 mock인지" 확인이 어려움.

## 범위

### 포함 (오늘)
- `src/api/client.ts` 주석·로직을 #4 이후 상태에 맞게 갱신
- fallback 발생 시 콘솔 경고로 남겨 네트워크 탭 없이도 API/mock 여부를 구분 가능하게 함
- `getSubsidies()` 미사용 함수 처리 (제거 또는 실사용 지점 연결) 결정
- 서버+클라이언트 동시 구동 후 실제 네트워크 요청으로 목록/상세/에러 상태 수동 검증
- `docs/week2_plan.md`, `docs/checklist.md`, `day2-verification-checklist.md`의 관련 항목 갱신

### 제외 (오늘 아님)
- DB 쓰기/저장 사이클 (사용자 조건 로그 저장) → 이슈 #7
- 매칭 조건 필터(업종/지역) 강화 → 3주차, #4 계획 문서에 이미 기록된 리스크
- `useSubmitProfile` mutation을 온보딩 완료 화면에 실제로 연결 → 필요 시 별도 판단 (issue #6 범위 밖, "골격만" 명시됨)

## 실행 순서

### 묶음 1 — `src/api/client.ts` 정리 (15분)
- [ ] `submitProfile` 주석에서 "#4 예정" 표현 제거, 현재는 실제 엔드포인트로 정의
- [ ] `getSubsidy` 주석에서 "서버 2건 vs mock 8건" 근거 제거 (데이터는 이제 8건으로 일치)
- [ ] 각 함수 `catch` 블록에 `console.warn('[api] ... → mock fallback', err)` 추가 — 실패 시에만 로그, 정상 응답 시 조용함
- [ ] `getSubsidies()` 처리: 실사용처가 없으므로 **제거** (미사용 export는 혼란을 줄 뿐이고, 필요해지면 언제든 `fetchJson` 패턴으로 다시 추가 가능)

### 묶음 2 — 수동 네트워크 검증 (20분)
- [ ] `npm run dev` (client :5173 + server :3001 동시 실행)
- [ ] 브라우저에서 Welcome → 온보딩 → 완료 → 홈 진입, Network 탭에서 `POST /api/match` 200 확인
- [ ] 카드 클릭 → 상세 진입, `GET /api/subsidies/:id` 200 확인
- [ ] 서버를 내린 상태로 홈 재진입 → 콘솔에 `mock fallback` 경고 뜨는지, 화면은 그대로 mock 8건으로 동작하는지 확인
- [ ] 정렬 칩 4종 클릭 시 매번 새 요청이 나가는지 확인 (`queryKey`에 sort 포함되어 있어 이미 보장됨)

### 묶음 3 — 문서 갱신 (10분)
- [ ] `docs/week2_plan.md` 진행 현황 표: `#6` 상태를 CLOSED로, 비고에 PR 번호 기록
- [ ] `docs/checklist.md` 2주차 체크박스 갱신 (조건 매칭 API 항목 등)
- [ ] `day2-verification-checklist.md`의 "남은 리스크" 1·2번(서버·mock 불일치, `getSubsidies()` 미사용)을 해결됨으로 갱신

## 완료 기준

- [ ] 목록/상세 요청이 네트워크 탭에서 실제 서버 응답으로 확인된다 (#6 이슈 검증 항목).
- [ ] 로딩/에러/빈결과 상태가 UI에 반영된다 (`StatusBox` — 이미 구현되어 있어 회귀만 확인).
- [ ] 서버가 죽어도 화면은 mock으로 자연스럽게 전환되고, 콘솔 경고로 그 사실을 알 수 있다.
- [ ] `npm test` / `npm run lint` 통과.

## 리스크 / 결정 필요

| 항목 | 내용 | 기본 방침 |
|------|------|-----------|
| `getSubsidies()` 제거 여부 | 미사용 함수, 제거하면 향후 "프로필 없는 목록" 필요시 재작성 필요 | 제거 (죽은 코드보다 필요 시 재작성이 낫다고 판단) |
| fallback 로그 레벨 | `console.warn` vs `console.error` | `console.warn` (서버 미기동은 개발 중 정상 상황) |
| `VITE_USE_MOCK` 플래그 도입 여부 | day2 계획서 초안에 있었으나 결국 fetch-실패-시-fallback 방식(B)으로 구현됨 | 그대로 유지, 플래그 도입 안 함 (오늘 범위 밖) |

## 오늘 끝나면 다음 (참고)

- **#7 (목)**: 사용자 조건 제출을 Supabase에 기록하는 쓰기 사이클
- **#5**: #11·#12로 대부분 선행 완료 — 이슈 닫기 검토만 남음
