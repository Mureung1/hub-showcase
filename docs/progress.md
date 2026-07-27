# 하루 체크아웃 개발 진행 보고서

> 작성일: 2026-07-27
> 작업 브랜치: `N114_유승혁`
> 기준 커밋: `50d6d35 feat: 데모 모드 + Render 단일 서비스 배포 지원 추가`
> 현재 상태: 7월 27일 작업 구현·검증 완료, GitHub 제출 준비

---

## 1. 오늘 작업 한눈에 보기

오늘은 새로운 기능을 많이 늘리는 것보다, 기존 하루 체크아웃을 **실제 사용자가 선택해서 사용할 수 있는 데모**에 가깝게 만드는 데 집중했다.

핵심 변화는 다음 세 가지다.

1. 로그인하지 않은 사용자는 감정 기록과 사진을 서버가 아니라 **현재 브라우저에만 저장**할 수 있게 했다.
2. AI 정리를 원하지 않는 사용자는 내용을 외부로 전송하지 않고 **AI 없이 바로 저장**할 수 있게 했다.
3. 여러 기기 동기화를 원하는 사용자만 Supabase 로그인을 사용하고, 로컬 기록도 사용자 확인 후에만 클라우드로 복사하도록 구조를 나눴다.

현재 제품 방향을 한 문장으로 정리하면 다음과 같다.

> 민감한 감정 기록은 게스트에게 로컬 저장을 기본으로 제공하고, AI 분석과 Supabase 동기화는 사용자가 명시적으로 선택할 때만 사용한다.

---

## 2. 왜 구조를 바꿨는가

기존 구조는 React에서 기록을 작성하면 Express를 거쳐 Supabase에 저장하는 흐름이었다. 그러나 로그인 기능과 사용자 구분이 없었기 때문에 실제 서비스처럼 공개하면 다음 문제가 있었다.

- 모든 기록의 `user_id`가 `null`이거나 요청자가 임의로 보낸 값이 될 수 있었다.
- 서버가 Supabase `service_role` 키를 사용하므로 RLS를 우회할 수 있었다.
- 로그인하지 않은 여러 사용자가 같은 기록을 보게 될 가능성이 있었다.
- 감정 기록과 사진처럼 민감한 데이터를 사용자의 선택 없이 클라우드에 저장하는 경험이 어색했다.
- AI 정리에 동의하지 않으면 기록 자체를 저장할 수 없었다.

멘토링에서 나온 “사용자가 감정 데이터를 클라우드에 보내는 것을 꺼릴 수 있다”는 관점을 반영해, 저장과 AI 분석을 하나의 강제 흐름으로 묶지 않고 분리했다.

---

## 3. 변경 후 전체 구조

### 3.1 게스트가 AI 없이 저장하는 경우

```text
React 입력 화면
  └─ 원문·기분·사진
      └─ IndexedDB
          └─ 현재 브라우저에만 저장
```

- Express 호출 없음
- LiteLLM·Vertex 호출 없음
- Supabase 호출 없음
- 새로고침이나 브라우저 재실행 후에도 같은 주소와 브라우저라면 기록 유지
- 브라우저 데이터 삭제, 다른 브라우저, 다른 기기, 다른 도메인에서는 별도 데이터로 취급

### 3.2 게스트가 AI 정리를 사용하는 경우

```text
React
  └─ 서버 전송 동의 후 정리 요청
      └─ Express :3001
          └─ LiteLLM :4000
              └─ Vertex Gemini
                  └─ 감정·원인·작은 행동 결과 반환
                      └─ 사용자가 수정
                          └─ IndexedDB에 저장
```

- AI 분석을 선택했을 때만 작성한 문장을 서버로 전송
- AI 결과가 돌아와도 자동으로 Supabase에 저장하지 않음
- 최종 저장 위치는 게스트 모드의 IndexedDB
- LiteLLM 또는 Vertex 요청 실패 시 기존 mock fallback 유지

### 3.3 로그인 사용자가 저장하는 경우

```text
React
  ├─ Supabase Auth: 회원가입·로그인·세션
  └─ Supabase Database: 로그인 사용자의 기록
        └─ user_id와 auth.uid()를 RLS로 비교
```

- 로그인 사용자는 Supabase에 기록 저장
- 각 행에 로그인된 사용자 UID 저장
- RLS 정책상 본인의 기록만 조회·생성·수정·삭제 가능하도록 SQL 작성
- 브라우저에는 관리자용 `service_role` 키를 넣지 않고 Publishable key만 사용하도록 구성

### 3.4 게스트 기록을 클라우드로 복사하는 경우

```text
IndexedDB의 게스트 기록
  └─ 로그인 후 사용자 확인
      └─ “클라우드에 복사”
          └─ 원문·기분·AI 정리 결과를 Supabase에 복사
```

- 로그인했다고 자동 업로드하지 않음
- 현재 간단 버전은 개별 선택이 아니라, 사용자 확인 후 이 기기의 기록 전체를 복사
- 로컬 원본은 삭제하지 않고 그대로 유지
- 사진은 이번 단계에서 클라우드로 복사하지 않음
- `client_record_id`를 저장해 같은 기록을 다시 복사해도 중복되지 않도록 설계

---

## 4. 오늘 구현한 내용

### 4.1 첫 진입 화면과 저장 방식 선택

처음 접속하면 두 가지 선택지를 보여준다.

- `게스트로 시작`
  - 가입 없이 사용
  - 기록과 사진을 현재 브라우저에 저장
- `로그인해서 동기화`
  - 실제 Supabase Auth 회원가입·로그인 화면 제공
  - 로그인 기록을 Supabase에 저장

기존에는 로그인 화면이 모양만 있고 “준비 중” 메시지만 표시했지만, 오늘은 `signUp()`과 `signInWithPassword()`를 호출하도록 실제 인증 코드를 연결했다.

다만 로컬 환경에 Supabase Publishable key가 아직 들어 있지 않고 RLS SQL도 실제 프로젝트에 적용하지 않았으므로, **인증 코드는 구현됐지만 실제 계정으로 끝까지 로그인하는 통합 검증은 남아 있다.**

### 4.2 게스트 기록용 IndexedDB 저장소

게스트 기록은 `haru-checkout`이라는 브라우저 IndexedDB에 저장한다.

저장하는 값은 다음과 같다.

- 기록 ID
- 사용자가 작성한 원문
- 기분 이모지
- 첨부 사진의 Data URL
- AI가 정리한 감정·원인·작은 행동
- 생성 시각
- 저장 방식 `guest`

다음 기능을 별도 저장소 모듈로 분리했다.

- 전체 기록 조회
- 기록 생성
- 개별 삭제
- 전체 삭제
- 사진을 Data URL로 변환

브라우저가 지원하면 `navigator.storage.persist()`도 요청해 저장 공간이 쉽게 정리되지 않도록 시도한다. 영구 저장을 브라우저가 반드시 보장하는 것은 아니다.

### 4.3 AI 전송 동의

작성한 문장이 AI 분석을 위해 서버와 Vertex로 전달된다는 점을 체크박스로 안내한다.

- 동의하지 않으면 AI 정리 버튼 비활성화
- 동의하면 `POST /api/checkins/preview` 호출
- AI 결과를 화면에서 확인하고 수정한 후 저장
- 저장 후 동의 상태 초기화

중요한 구분은 다음과 같다.

> AI 분석을 위한 서버 전송과 Supabase 데이터베이스 저장은 서로 다른 동작이다.

게스트가 AI 정리를 사용해도 앱 코드상 결과를 Supabase에 저장하지 않고 IndexedDB에 저장한다.

### 4.4 AI 없이 저장

기존에는 AI 정리가 끝나야 저장 화면으로 넘어갈 수 있었다. 오늘 다음 버튼을 추가했다.

- 게스트: `AI 없이 기기에 저장`
- 로그인 사용자: `AI 없이 클라우드에 저장`
- AI 사용: `동의하고 AI로 정리`

AI 없이 저장한 기록은 `emotion`, `cause`, `action`이 비어 있을 수 있다. 이에 맞춰 기록 목록과 상세 화면도 수정했다.

- 목록: `AI 정리 전 기록` 표시
- 상세: 빈 요약 카드 대신 `AI 정리 없이 저장한 기록이에요.` 표시
- 원문과 기분은 정상적으로 확인 가능

### 4.5 Supabase 클라이언트와 환경변수

React에서 Supabase Auth와 RLS를 사용하기 위해 공식 `@supabase/supabase-js` 패키지를 추가했다.

브라우저에서 사용하는 환경변수는 다음 두 개로 제한했다.

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

관리자 권한을 가진 `SUPABASE_SERVICE_ROLE_KEY`는 서버에만 남기고 브라우저에 노출하지 않는다.

현재 저장소에는 실제 값이 아닌 `client/.env.example` 템플릿만 추가했다. 실제 `client/.env`는 Git에 포함하면 안 된다.

### 4.6 로그인 사용자용 Supabase 저장소

로그인 사용자의 기록은 Express의 관리자 클라이언트를 거치지 않고, 로그인 세션이 있는 Supabase 클라이언트로 처리하도록 새 저장소 모듈을 만들었다.

구현된 동작은 다음과 같다.

- 현재 로그인 사용자 확인
- 해당 사용자 UID로 기록 조회
- `user_id`를 포함해 기록 생성
- 기록 ID와 사용자 UID를 모두 확인해 삭제
- 게스트 기록을 `upsert`로 복사
- 사용자의 전체 기록 일괄 삭제는 제공하지 않음

코드에서 `.eq('user_id', userId)`로 범위를 좁히고, 데이터베이스에서는 RLS로 다시 제한하는 이중 방어 구조를 의도했다.

### 4.7 게스트 기록의 선택적 클라우드 복사

로그인 후 현재 기기에 게스트 기록이 있으면 배너를 표시한다.

```text
이 기기에 게스트 기록 N개가 있어요.
[클라우드에 복사]
```

버튼을 누르면 다시 확인창을 보여준다.

- 자동 업로드하지 않음
- 사진은 제외된다는 점 안내
- 원문·기분·AI 정리 결과 복사
- 복사 후 로컬 원본 유지
- 같은 로컬 ID는 중복 생성하지 않음

개인정보 관점에서 “로그인 성공 = 모든 로컬 데이터 자동 업로드”가 되지 않도록 한 것이 핵심이다.

### 4.8 RLS와 서버의 `service_role` 우회 방지

`server/supabase/schema.sql`에 다음 내용을 추가했다.

- `client_record_id` 컬럼
- `(user_id, client_record_id)` 고유 인덱스
- 본인 기록 조회 정책
- 본인 기록 생성 정책
- 본인 기록 수정 정책
- 본인 기록 삭제 정책
- `user_id → auth.users(id)` 외래키

RLS 정책의 기준은 다음과 같다.

```sql
auth.uid() = user_id
```

기존 Express CRUD는 `service_role` 키를 사용하므로 RLS를 우회한다. 로그인 사용자가 React에서 직접 Supabase를 사용하도록 바꾼 뒤에도 기존 공개 API가 남아 있으면 다른 사용자의 데이터를 가져올 위험이 있다.

따라서 Supabase 실제 저장 모드에서는 다음 Express 엔드포인트를 `410`으로 차단하도록 변경했다.

- `GET /api/checkins`
- `POST /api/checkins`
- `POST /api/checkins/photo`
- `DELETE /api/checkins/:id`

AI 정리에 사용하는 `POST /api/checkins/preview`는 계속 유지한다. 비밀키 없는 메모리 데모 모드에서는 기존 CRUD를 계속 사용할 수 있다.

### 4.9 첫 페이지 레이아웃 수정

첫 진입 화면에서 상단 이미지와 `나를 위한 하루 정리` 배지가 모두 인라인 요소라 같은 줄에 붙는 문제가 있었다.

다음처럼 각 요소를 독립된 줄로 배치했다.

```text
상단 이미지
나를 위한 하루 정리
하루 체크아웃
```

- 이미지에 `display: block`
- 이미지 좌우 중앙 정렬
- 배지 중앙 정렬
- 이미지·배지·제목 사이 여백 조정

브라우저에서 수정 전후 화면을 직접 확인했다.

### 4.10 LiteLLM과 Vertex 실행 확인

로컬 실행 구조는 다음과 같다.

```text
React :5173
  → Express :3001
    → LiteLLM :4000
      → Vertex Gemini
```

오늘 확인한 내용:

- React 5173 실행
- Express 3001 실행
- LiteLLM 4000 실행
- `vertex_ai/gemini-2.5-flash`를 `vertex-gemini-flash` 별칭으로 연결
- Express 미리보기 요청 결과의 `source`가 `ai`인 실제 응답 확인

LiteLLM이 꺼지거나 Vertex 요청이 실패하면 기존 mock 결과로 전환된다.

---

## 5. 파일별 변경 설명

| 파일 | 역할과 오늘 변경 |
|---|---|
| `client/package.json` | Supabase 공식 클라이언트 의존성 추가 |
| `client/package-lock.json` | 설치된 패키지 버전 잠금 |
| `client/.env.example` | 브라우저용 Supabase URL·Publishable key 예시 |
| `client/src/lib/supabase.js` | 환경변수가 있을 때만 Supabase 클라이언트 생성 |
| `client/src/App.jsx` | 게스트/클라우드 모드, 인증 세션, 저장, AI, 동기화 흐름을 연결하는 중심 컴포넌트 |
| `client/src/App.css` | 첫 진입, 로그인, 저장 안내, 동기화 배너, AI 없는 기록 상태 스타일 |
| `client/src/components/EntryScreen.jsx` | 게스트 선택, 회원가입, 로그인 화면과 Supabase Auth 호출 |
| `client/src/components/EntryScreen.test.jsx` | 게스트 진입, 로그인, 회원가입 안내 테스트 |
| `client/src/components/CheckinForm.jsx` | 저장 위치 안내, AI 없는 저장, AI 동의 후 정리 버튼 |
| `client/src/components/RecordCard.jsx` | AI 없는 기록의 목록 표시 대응 |
| `client/src/pages/RecordDetail.jsx` | AI 없는 기록의 상세 표시 대응 |
| `client/src/services/guestCheckinRepository.js` | IndexedDB 기반 게스트 CRUD와 사진 변환 |
| `client/src/services/guestCheckinRepository.test.js` | 새 저장소 인스턴스 복원, 정렬, 삭제, 전체 삭제, 사진 테스트 |
| `client/src/services/supabaseCheckinRepository.js` | 로그인 사용자별 Supabase CRUD와 게스트 기록 복사 |
| `client/src/services/supabaseCheckinRepository.test.js` | 사용자 범위 조회와 중복 방지 복사 테스트 |
| `server/routes/checkins.js` | 실제 Supabase 모드에서 관리자 키 기반 공개 CRUD 차단 |
| `server/supabase/schema.sql` | UID, RLS, 외래키, 복사 중복 방지 SQL |

### 커밋에서 제외한 사용하지 않는 파일

`client/src/services/cloudCheckinRepository.js`는 이전 Express 기반 클라우드 저장 모듈이다. 현재 `App.jsx`에서는 새 `supabaseCheckinRepository.js`를 사용하므로 이 파일은 사용되지 않는다.

커밋 전 다음 중 하나를 선택해야 한다.

1. 사용하지 않는 파일을 삭제한다.
2. 데모 모드 전용이라는 명확한 용도를 주고 이름과 설명을 바꾼다.

현재 상태로 함께 커밋하면 두 클라우드 저장 방식이 남아 구조를 이해하기 어렵게 만들 수 있다.

---

## 6. 테스트와 실제 검증

### 자동 테스트

- 클라이언트 Vitest: **19개 통과**
  - 기존 캘린더 테스트
  - IndexedDB 게스트 저장·복원·삭제·사진
  - 게스트 진입
  - Supabase 로그인·회원가입 화면
  - 사용자별 Supabase 조회
  - 게스트 기록 중복 방지 복사
- 서버 Node test runner: **12개 통과**
  - AI 응답 파싱
  - 이유 필드 처리
  - 실패 시 mock fallback
  - 삭제와 404
  - 데모 모드 CRUD
- `oxlint`: 통과
- Vite 프로덕션 빌드: 통과

### 브라우저 수동 검증

- 첫 진입 화면 표시
- 게스트 모드 진입
- AI 없이 기록 저장
- 기록 목록에서 `AI 정리 전 기록` 표시
- 상세 화면에서 AI 없는 기록 안내 표시
- 확인용 테스트 기록 삭제
- 첫 페이지 이미지·배지·제목 중앙 정렬 확인
- 새로고침 후 IndexedDB 기록 복원은 이전 검증에서 확인

### 아직 하지 못한 통합 검증

- 실제 Supabase 계정 회원가입
- 실제 이메일 확인
- 실제 로그인과 세션 복원
- 로그인 사용자 기록 생성·조회·삭제
- 서로 다른 두 계정의 RLS 격리
- 게스트 기록의 실제 Supabase 복사

이 항목들은 코드 실패가 아니라 Supabase 대시보드 로그인과 환경 설정이 아직 완료되지 않아 남아 있는 작업이다.

---

## 7. 현재 완료 상태

| 항목 | 상태 | 설명 |
|---|---|---|
| 게스트 로컬 저장 | 완료·검증 | IndexedDB 사용 |
| 게스트 사진 로컬 저장 | 완료·검증 | Data URL 사용 |
| AI 전송 동의 | 완료·검증 | 동의 시에만 미리보기 요청 |
| AI 없이 저장 | 완료·검증 | 원문·기분·사진 저장 |
| LiteLLM → Vertex | 로컬 검증 완료 | 실제 `source: ai` 확인 |
| 회원가입·로그인 코드 | 구현 완료 | 실제 키 연결 전 |
| 로그인 세션 UI | 구현 완료 | 실제 세션 통합 검증 전 |
| 사용자별 Supabase 저장소 | 구현·단위 테스트 완료 | 실제 DB 검증 전 |
| RLS SQL | 파일 작성 완료 | Supabase 프로젝트 적용 전 |
| 게스트 기록 클라우드 복사 | 구현·단위 테스트 완료 | 실제 DB 검증 전 |
| 클라우드 사진 동기화 | 미구현 | 현재 사진은 게스트 로컬만 |
| 영구 배포 URL | 미완료 | 로컬 실행 상태 |

---

## 8. 다음 작업

### 반드시 해야 하는 작업

1. Supabase 대시보드 로그인
2. Project Settings에서 Publishable key 확인
3. `client/.env` 작성

   ```env
   VITE_SUPABASE_URL=<프로젝트 URL>
   VITE_SUPABASE_PUBLISHABLE_KEY=<공개용 키>
   ```

4. `server/supabase/schema.sql`을 Supabase SQL Editor에서 실행
5. Vite 재시작
6. 발표용 계정 미리 회원가입·이메일 인증
7. 계정 A와 계정 B를 만들어 서로 기록이 보이지 않는지 RLS 검증
8. 게스트 기록 복사 후 새로고침·다른 기기 조회 확인

### 이후 개선 가능한 작업

- 전체 복사가 아니라 사용자가 고른 기록만 복사하는 선택 UI
- 이미 저장한 로컬 기록을 나중에 AI로 정리
- 로그인 사용자의 사진을 개인 경로로 Supabase Storage에 저장
- 동기화 완료 표시와 로컬 원본 삭제 선택
- 비밀번호 재설정
- 로그인 요청 오류의 한국어 메시지 정리
- 실제 배포 환경의 Supabase Redirect URL 설정
- AI 호출 횟수 제한과 비용 보호

---

## 9. 개인정보와 제품 판단

오늘 구현은 기술을 추가한 것보다 “어떤 데이터를 언제 외부로 보낼 것인가”를 명시적으로 나눈 것이 핵심이다.

### 기본 원칙

- 게스트 기록은 기본적으로 기기에 저장
- AI 분석은 별도 동의
- 로그인은 클라우드 동기화가 필요한 사용자만 선택
- 로그인했다고 기존 로컬 기록을 자동 업로드하지 않음
- 클라우드 복사 전에 다시 사용자 확인
- 관리자 키는 브라우저에 노출하지 않음

### 현재 화면에서 더 정확하게 설명해야 하는 문장

> 게스트 기록과 사진은 이 브라우저에 저장됩니다. AI 정리를 선택하면 작성한 내용이 분석을 위해 서버와 Vertex AI로 전송됩니다. 로그인한 기록은 Supabase에 저장되며 여러 기기에서 확인할 수 있습니다.

---

## 10. 커밋 전 체크리스트

### 기능 확인

- [ ] Supabase Publishable key 연결
- [ ] `schema.sql` 실제 적용
- [ ] 회원가입·로그인·로그아웃 직접 확인
- [ ] 새로고침 후 로그인 세션 유지 확인
- [ ] 로그인 기록 저장·조회·삭제 확인
- [ ] 두 계정 간 데이터 격리 확인
- [ ] 게스트 기록 클라우드 복사 확인
- [ ] AI 없는 저장 재확인
- [ ] AI 정리 저장 재확인

### 보안 확인

- [x] `client/.env`가 Git에 포함되지 않는지 확인
- [x] `service_role` 키가 클라이언트 코드와 빌드 결과에 없는지 확인
- [ ] Supabase의 기존 허용 정책이 남아 있지 않은지 확인
- [ ] 공개 Express CRUD가 실제 모드에서 차단되는지 확인

### Git 정리

- [x] 사용하지 않는 `cloudCheckinRepository.js`는 커밋에서 제외
- [x] `docs/learning/retrospectives.md` 변경을 문서 커밋에 포함
- [x] 7월 20일에 만든 `.claude/skills/retro/`는 오늘 PR에서 제외
- [x] `PPT_CONTEXT.md`와 `WEEK4_ISSUE_DRAFTS.md`를 문서 커밋에 포함
- [x] 코드와 문서를 한 커밋에 섞지 않고 단계별로 스테이징
- [x] 최종 `git diff --check`
- [x] 클라이언트 테스트·서버 테스트·린트·빌드 재실행

현재 아래 파일은 오늘 기능 구현과 직접 관계가 없거나 별도 목적의 변경이므로 자동으로 함께 커밋하면 안 된다.

- `docs/learning/retrospectives.md`
- `.claude/skills/retro/`
- `PPT_CONTEXT.md`
- `WEEK4_ISSUE_DRAFTS.md`

---

## 11. 권장 커밋 분리

실제 검증까지 끝난 뒤 다음처럼 나누는 것이 이해하기 쉽다.

### 커밋 1

```text
feat: add guest-first local checkin storage
```

- EntryScreen의 게스트 진입
- IndexedDB 저장소
- AI 전송 동의
- AI 없이 저장
- AI 없는 기록 표시
- 관련 스타일과 테스트

### 커밋 2

```text
feat: add optional Supabase auth and cloud sync
```

- Supabase 클라이언트
- 회원가입·로그인·로그아웃
- 로그인 사용자 저장소
- 게스트 기록 복사
- RLS SQL
- Express 관리자 CRUD 차단
- 관련 테스트

### 커밋 3

```text
docs: update implementation progress and verification report
```

- 이 진행 보고서
- 필요한 경우 회고 또는 발표 컨텍스트 갱신

---

## 12. 발표나 회고에서 설명할 수 있는 핵심

오늘 작업을 “로그인과 로컬 저장을 추가했다”로만 설명할 필요는 없다.

다음처럼 문제와 판단을 중심으로 설명할 수 있다.

> 처음에는 모든 감정 기록을 Supabase에 저장하는 구조였지만, 로그인과 사용자 분리가 없는 상태에서 민감한 데이터를 클라우드에 저장하는 것은 실제 서비스로 공개하기 어렵다고 판단했습니다. 그래서 게스트에게는 IndexedDB 기반 로컬 저장을 기본으로 제공하고, AI 분석과 Supabase 동기화를 각각 사용자가 선택하도록 흐름을 분리했습니다. 또한 `service_role`을 사용하는 기존 공개 API가 RLS를 우회할 수 있다는 점을 확인해 실제 로그인 기록은 사용자 세션과 RLS로 접근하도록 구조를 변경했습니다. 구현 후에는 IndexedDB 복원, 로그인 UI, 사용자별 조회, 중복 없는 동기화 단위 테스트와 실제 브라우저 동작을 검증했습니다.

이 경험에서 강조할 수 있는 것은 웹 기능의 수가 아니라 다음 과정이다.

1. 멘토 피드백에서 개인정보 문제를 발견했다.
2. 저장·AI·로그인을 분리해 요구사항을 다시 정의했다.
3. Agent가 만든 구조를 코드와 실제 데이터 흐름으로 확인했다.
4. RLS와 `service_role`의 차이를 확인하고 보안 구조를 수정했다.
5. 자동 테스트와 브라우저 검증으로 결과를 확인했다.
6. 아직 검증하지 않은 실제 Supabase 연결은 완료로 과장하지 않고 남은 작업으로 기록했다.
