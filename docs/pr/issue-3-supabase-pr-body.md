# [N100_실명] Supabase subsidies 테이블 스키마·연결 기반 구성 (#3)

## 주요 작업 리스트

- **Supabase 프로젝트 연동 기반 구성** — 지원금 데이터를 저장/조회할 DB 인프라 셋업 (이슈 #3)
- **테이블 스키마** (`supabase/schema.sql`)
  - `subsidies` 테이블 정의, `shared`의 `Subsidy` 타입과 1:1 매핑
  - SQL 예약어 회피: `match` → `match_score`, `where` → `apply_where`
  - 배열 필드는 `text[]` (`qualifications`, `documents`), RLS enable
- **서버 전용 Supabase 클라이언트** (`server/src/db/supabase.ts`)
  - `service_role` 키 기반 `createClient`
  - npm workspace(cwd=`server/`)에서도 루트 `.env`를 파일 기준 경로로 로드
  - `SUPABASE_URL`에 실수로 붙은 `/rest/v1/`·끝 슬래시 자동 제거
- **타입 매퍼** (`server/src/db/mappers.ts`) — DB row ↔ `Subsidy` 양방향 변환 (이슈 #4 재사용)
- **시드/검증 스크립트**
  - `db:seed` (`seed.ts`): `sample-subsidies.ts`를 단일 소스로 재사용해 upsert
  - `db:check` (`check.ts`): 연결 후 count + 첫 row 조회로 검증
- **환경·문서** — `.env.example` Supabase 변수 노출, `docs/week2/day3-supabase-setup.md` 셋업 가이드 추가
- **브랜치 정리** — #3 커밋만 main 위에 단독으로 올려 PR #20 생성 (`Closes #3`)

### 동작 확인 (터미널 로그)

```
$ npm run db:seed -w @hub/server
[db:seed] 2건 upsert 완료

$ npm run db:check -w @hub/server
[db:check] 연결 성공 — 총 2건
[db:check] 첫 row: { id: '1', name: '청년 창업 임대료 지원', ... }
```

## 내가 설명할 수 있는 부분

`Subsidy.where` / `Subsidy.match` 필드를 DB에서 `apply_where` / `match_score` 컬럼으로 바꾸고, `mappers.ts`에서 앱 타입과 DB 스키마를 분리했습니다.

- `where`와 `match`는 SQL 예약어라 컬럼명으로 그대로 쓰면 쿼리가 깨질 위험이 있습니다.
- 그렇다고 프론트/공유 타입까지 바꾸면 이미 구현된 화면 코드에 영향이 갑니다.
- 그래서 "DB 컬럼명"과 "앱 타입 필드명"을 분리하고, 경계에서 `rowToSubsidy` / `subsidyToRow` 매퍼로 변환하도록 했습니다. 이렇게 하면 이슈 #4에서 API를 DB 조회로 바꿀 때도 이 매퍼만 재사용하면 됩니다.

## 아직 이해 못 한 부분

- **RLS 정책 설계**: 지금은 서버가 `service_role` 키로 RLS를 우회하는 구조라 별도 정책을 두지 않았습니다. 추후 프론트에서 anon 키로 직접 조회하는 경우가 생기면 어떤 select 정책을 열어야 하는지는 아직 명확히 정리하지 못했습니다.
- **서버 데이터 ↔ 프론트 mock 개수 불일치**: 현재 시드는 샘플 2건뿐인데 프론트 mock은 8건입니다. Supabase에 실제 데이터를 얼마나/어떻게 채울지(크롤러 연동 시점)는 다음 이슈 범위라 이번엔 미해결로 남겨뒀습니다.

## 새로 알게 된 것

- **`SUPABASE_URL`은 프로젝트 기본 URL**이어야 합니다. Settings > API에 보이는 REST URL(`.../rest/v1/`)을 그대로 넣으면 `supabase-js`가 오작동합니다.
- **`dotenv`는 이미 존재하는 환경변수를 덮어쓰지 않습니다** (`override` 옵션 필요). 또 npm workspace 스크립트는 cwd가 해당 패키지 폴더라, 루트 `.env`를 자동으로 못 찾습니다 → 파일 기준 경로로 명시 로드해야 합니다.
- **`git rebase --onto`**로 특정 커밋만 다른 브랜치 위로 떼어 옮길 수 있습니다. 덕분에 FE 커밋과 섞이지 않은 #3 단독 PR을 만들 수 있었습니다.

## 라벨

`week-2`, `area:db`, `area:server`, `priority:P0`, `agent-work`
