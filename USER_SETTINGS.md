# 개인 설정

## 프로필과 설정의 구분

- **프로필**: 학교, 학년, 전공, 학점, 활동 가능 지역처럼 사용자의 사실 정보를 저장한다. `profiles` 테이블과 `/api/profile` API가 담당한다.
- **개인 설정**: UniRadar가 추천과 목록을 어떻게 표시할지 결정한다. `user_settings` 테이블과 `/api/settings` API가 담당한다.

프로필 값은 개인 설정에 중복 저장하지 않는다.

## 기본값

```js
{
  recommendationCategories: ["scholarship", "contest", "activity", "internship", "research"],
  preferredRegions: [],
  includeOnline: true,
  minimumMatchScore: 50,
  includeUnknownDeadline: true,
  autoSaveAnalyzedOpportunities: false,
  recommendationLimit: 10
}
```

기본값은 `src/constants/userSettings.js`가 단일 기준이다. 설정 레코드가 없는 신규 로그인 사용자는 이 기본값을 받는다.

## DB와 RLS

`supabase/20260721_user_settings.sql`을 `20260720_auth_profiles.sql` 다음에 Supabase SQL Editor에서 실행한다.

`user_settings`는 `user_id`를 primary key로 사용한다. RLS 정책은 `auth.uid() = user_id`일 때만 SELECT, INSERT, UPDATE, DELETE를 허용한다. Express도 `requireAuth`가 검증한 토큰의 사용자 ID만 저장소에 전달하므로 클라이언트 body의 `userId`는 사용하지 않는다.

## API

모든 요청은 `Authorization: Bearer <access token>`이 필요하다.

- `GET /api/settings`: 내 설정 또는 기본값을 `{ settings, isDefault }` 형태로 반환한다.
- `PUT /api/settings`: 검증된 전체 설정을 내 `user_settings` 레코드에 upsert한다.
- `POST /api/settings/reset`: 내 설정 레코드를 삭제하고 기본값을 반환한다.

카테고리는 허용 목록만 받고 중복을 제거한다. 지역은 최대 20개, 점수는 0~100 정수, 추천 개수는 1~50 정수다. 추가 `userId` 같은 알 수 없는 필드는 API 입력에서 제거한다.

## 프론트엔드 상태

`UserSettingsProvider`가 인증 세션을 감시한다. 로그인 사용자 또는 access token이 바뀌면 이전 설정을 즉시 `null`로 비우고 새 `/api/settings` 결과를 불러온다. 로그아웃 시에도 설정 state가 초기화된다.

`UserSettingsForm`은 Provider의 저장된 설정을 draft로 표시하고, 변경 사항이 있을 때만 저장 요청을 보낸다. 초기화에는 확인 창이 있다.

## 추천과 공고 목록 반영

사이트 추천의 우선순위는 다음과 같다.

```text
이번 추천 화면에서 직접 고른 정보 종류
→ 개인 설정의 관심 정보 종류
→ 프로필의 관심 분야와 전공
→ 서비스 기본 추론
```

개인 설정의 선호 지역, 온라인 포함 여부, 추천 결과 개수도 추천 서비스에 전달된다. 저장된 공고 목록은 관심 카테고리, 최소 추천 점수, 마감일 미확인 포함 여부로 기본 필터링한다. 온라인 여부는 원문에 근거가 없는 저장 공고에 임의 적용하지 않고 사이트 추천에서만 판정한다.

## 자동 저장 준비

`autoSaveAnalyzedOpportunities`는 분석 성공 지점에서 읽을 수 있다. 현재 저장 공고 API는 사용자별 인증 저장으로 완전히 분리되지 않았으므로 자동 저장은 아직 실행하지 않으며, 설정이 켜진 경우 이 상태를 명확히 안내한다. 사용자별 저장 공고 API가 연결되는 다음 작업에서 이 위치에 실제 저장 호출을 붙인다.

## localStorage 이전

현재 프로젝트에는 개인 설정을 저장한 기존 localStorage key가 없다. 이전할 데이터가 생기면 로그인 후 DB 설정 레코드가 없는 경우에만 사용자 동의를 받아 `PUT /api/settings`로 이전한다. 다른 계정에 자동 적용하거나 기존 데이터를 동의 없이 삭제하지 않는다.

## 새 설정 추가

1. `src/constants/userSettings.js`에 기본값과 허용 값을 추가한다.
2. `server/schemas/userSettingsSchemas.js`에 입력 검증을 추가한다.
3. 새 migration과 `userSettingsRepository`의 row 변환을 함께 업데이트한다.
4. Provider, 설정 폼, 실제 추천·필터 사용처를 같은 변경에 포함한다.
5. API·추천·필터 테스트를 추가한다.