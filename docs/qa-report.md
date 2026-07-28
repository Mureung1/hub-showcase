# SWIM MVP Integration QA

## 실행 정보

- 실행일: 2026-07-28
- 브랜치: `codex/task-2-user-search`
- 환경: Windows, Node.js, Vite, Express
- 대상: 공개 프로필·좋아요 사용자 목록·Monthly Recap 화면을 포함한 작업 1~6 통합 상태

## 자동 검증

| 명령 | 결과 | 상세 |
|---|---|---|
| `npm.cmd run typecheck` | PASS | TypeScript 오류 없음 |
| `npm.cmd test` | PASS | 프런트엔드 114개, Node 80개 테스트 |
| `npm.cmd run build` | PASS | Vite 프로덕션 번들 생성 |
| `git diff --check` | PASS | 공백 오류 없음 |
| `GET http://127.0.0.1:3000/health` | PASS | 로컬 Express 응답 `{"status":"ok"}` |

자동 테스트에서 확인한 항목:

- 비로그인 사용자 API 요청 401
- 빈 음악 기록 입력과 잘못된 검색어 차단
- 닉네임 부분 검색과 대소문자 비구분
- 중복 팔로우·좋아요 방지
- 자기 팔로우와 존재하지 않는 대상 차단
- 팔로잉 기록만 피드에 포함
- 사용자별 좋아요 상태 분리
- 열람 가능한 기록의 전체 좋아요 수 집계와 집계 실패 처리
- 좋아요 사용자 목록의 지연 조회·공개 필드·20명 커서 페이지
- 직접 RPC 제한값의 `null`·0·음수·과대값·생략 처리
- 목록 응답을 읽지 못할 때 목록 조회 전용 오류 문구 표시
- 공개 프로필의 오늘 기록·지난 기록 분리와 20건 cursor 페이지
- 공개 다이어리의 빈 상태·실패·재시도·더 보기
- 공개 다이어리 401·404·잘못된 cursor·DB 실패 응답
- 중간 삽입에도 기록을 건너뛰지 않는 keyset cursor
- 사용자별 하루 한 기록 제약과 중복 생성 409 응답
- 공개 프로필 URL 직접 접근·새로고침 복원·popstate 전환
- 피드 작성자에서 공개 프로필 진입과 이전 프로필 요청 취소
- 공개 프로필 팔로우·좋아요 성공 및 좋아요 실패 상태 유지
- 월간 Recap 인증·입력 검증·본인 기록 집계·빈 달·12월 경계·DB 실패
- Monthly Recap 월 선택·대표 요약·타임라인·빈 달·실패·재시도
- 잘못된 Monthly Recap 응답을 화면 예외 없이 오류 상태로 처리
- API 실패 시 기존 UI 상태 유지
- Auth UUID의 사용자 검색·피드 응답 비노출

## 실제 브라우저·Supabase 검증 상태

저장소에 Supabase와 Spotify 환경변수는 설정돼 있지만 QA 전용 계정 정보는 저장돼 있지 않습니다. 비밀정보를 저장소나 QA 문서에 추가하지 않았습니다. 현재 QA 실행 환경에는 제어 가능한 브라우저가 연결돼 있지 않아 일반 창·시크릿 창 흐름과 Console·Network 확인을 수행하지 못했습니다.

2026-07-27에 설정된 공개 anon key로 원격 Supabase REST와 두 RPC를 읽기 전용으로 확인했습니다.

| 확인 항목 | 결과 | 해석 |
|---|---|---|
| Supabase REST 도달 | PASS | 원격 프로젝트 응답 확인 |
| `get_music_record_like_counts` 존재 | PASS | RPC가 원격 스키마에 존재 |
| `get_music_record_like_users` 존재 | PASS | RPC가 원격 스키마에 존재 |
| anon RPC 실행 차단 | FAIL | 두 RPC가 anon 요청에 HTTP 200을 반환 |

익명 요청에서는 함수 내부의 `auth.uid()` 기반 열람 조건 때문에 집계나 사용자 데이터가 반환되지 않았습니다. 그래도 함수 실행 권한 자체는 인증 사용자로 제한해야 하므로 `likes.sql`에서 `PUBLIC`뿐 아니라 `anon` 권한도 명시적으로 회수하도록 수정했습니다. 이 SQL을 원격 DB에 다시 적용하기 전에는 실제 권한 수정이 완료된 것으로 판단하지 않습니다.

다음 항목은 실제 계정과 원격 Supabase 상태가 필요하므로 자동 테스트 결과를 PASS로 대체하지 않습니다.

| 항목 | 상태 | 차단 사유 |
|---|---|---|
| 일반 창·시크릿 창 두 계정 전체 흐름 | 미검증 | QA 계정 A·B 및 제어 가능한 브라우저 없음 |
| 새로고침 후 세션·관계·좋아요 유지 | 미검증 | 실제 계정 흐름 필요 |
| 원격 DB에 SQL 적용 여부 | 부분 확인 | 두 RPC 존재 확인, 최신 anon 권한 회수 SQL은 미적용 |
| 실제 RLS 직접 접근 차단 | 미검증 | 두 사용자 access token 필요 |
| anon RPC 실행 차단 | 실패 | 최신 `likes.sql` 재적용 필요 |
| DB 중복 행 확인 | 미검증 | Supabase Table Editor 또는 SQL Editor 필요 |
| 브라우저 Console·Network | 미검증 | 현재 실행 환경에 브라우저 연결 없음 |

## 두 계정 수동 검증 절차

### 준비

1. Supabase SQL Editor에서 아래 순서로 적용한다.
   - `server/supabase/profiles.sql`
   - `server/supabase/migrations/20260724_nickname_identity.sql`
   - `server/supabase/follows.sql`
   - `server/supabase/music_records.sql`
   - `server/supabase/likes.sql`
   - 기존에 `likes.sql`을 적용했더라도 anon RPC 실행 권한 회수를 위해 최신 파일을 다시 실행한다.
2. `npm run server`와 `npm run dev`를 각각 실행한다.
3. 일반 창을 계정 A, 시크릿 창을 계정 B에 사용한다.
4. 개발자 도구의 Console과 Network 탭을 연다.

### 정상 흐름

| 단계 | 계정 | 동작 | 기대 결과 |
|---|---|---|---|
| 1 | A·B | 서로 다른 이메일과 닉네임으로 회원가입 | 두 프로필 생성 |
| 2 | A·B | 로그인 후 새로고침 | 세션과 프로필 유지 |
| 3 | B | Spotify 검색, 음악 선택, 감정 작성, 저장 | 내 음악 카드 표시 |
| 4 | A | B의 닉네임 일부를 대소문자를 바꿔 검색 | B 한 명 검색 |
| 5 | A | B 팔로우 | 버튼이 언팔로우로 변경 |
| 6 | A | 새로고침 | 팔로우 상태와 B의 기록이 피드에 유지 |
| 7 | A | B의 기록 좋아요 | 하트 선택 상태 |
| 8 | A | 새로고침 | 좋아요 선택 상태 유지 |
| 9 | B | 같은 기록 확인 | A의 좋아요가 B 상태로 표시되지 않음 |
| 10 | A | 좋아요 취소 후 새로고침 | 하트 해제와 DB 행 삭제 |
| 11 | A | B 언팔로우 후 새로고침 | B 기록이 피드에서 제거 |
| 12 | A·B | 로그아웃 | 로그인 화면으로 이동 |

### 실패·보안 흐름

1. 비로그인 상태로 `/api/feed`, `/api/follows`, 좋아요 API를 요청해 401을 확인한다.
2. anon key만 사용해 `get_music_record_like_counts`, `get_music_record_like_users` RPC를 직접 호출하고 권한 오류가 반환되는지 확인한다.
3. 빈 감정과 한 글자 사용자 검색이 화면·서버에서 차단되는지 확인한다.
4. 팔로우와 좋아요 버튼을 빠르게 반복 클릭해 버튼이 요청 중 비활성화되는지 확인한다.
5. 계정 B token으로 계정 A의 `follower_id` 또는 `likes.user_id`를 직접 삽입·삭제해 RLS 오류를 확인한다.
6. 존재하지 않는 음악 기록 ID로 좋아요 API를 요청해 404를 확인한다.
7. Console과 Network에서 다음 API별 공개 범위를 확인한다.
   - 사용자 검색과 팔로잉 피드 응답에는 다른 사용자의 Auth UUID와 이메일이 없어야 한다.
   - 내 음악 기록 응답의 `userId`와 `author.id`는 현재 계약상 로그인 사용자의 Auth UUID를 포함한다.
   - 모든 응답에는 access token, 비밀번호, Spotify Secret, Supabase Service Role Key가 없어야 한다.
   - 처리되지 않은 브라우저 오류나 예상하지 않은 4xx·5xx 응답이 없어야 한다.

### DB 확인 SQL

아래 SQL은 조회 전용이다.

```sql
select follower_id, following_id, count(*)
from public.follows
group by follower_id, following_id
having count(*) > 1;

select user_id, record_id, count(*)
from public.likes
group by user_id, record_id
having count(*) > 1;

select user_id, record_date, count(*)
from public.music_records
where user_id is not null
group by user_id, record_date
having count(*) > 1;
```

세 결과 모두 0행이어야 한다.

## 남은 결함과 주의사항

- 여러 작업이 한 working tree에 누적돼 기능별 Git 추적성이 낮다.
- 최신 `likes.sql`을 원격 DB에 다시 적용해 anon RPC 실행 권한을 회수해야 한다.
- 실제 Supabase SQL 재적용과 두 계정 E2E가 끝나기 전에는 작업 3을 최종 PASS로 판정하지 않는다.
- 테스트 계정 이메일, 비밀번호, access token은 문서나 Git에 기록하지 않는다.
