# Opportunity Agent MVP

대학생 맞춤형 장학금, 공모전, 대외활동, 지원사업 추천 에이전트 MVP입니다. React + Vite 프론트엔드와 Express API 서버로 구성되어 있으며, 기본값은 **mock AI 모드**입니다. 서버 설정을 바꾸면 OpenAI 또는 Gemini 실제 분석 모드로 전환할 수 있습니다.

## 구성

- React + Vite 프론트엔드
- Express API 서버
- zod 기반 입력/출력 검증
- OpenAI Responses API 연결 준비
- Gemini API 실제 분석 연결
- 기본 mock 분석 모드와 실패 시 mock fallback

## 실행

```bash
npm install
npm run dev
```

`npm run dev`는 Express 서버와 Vite 클라이언트를 동시에 실행합니다.

- API 서버: `http://localhost:3001`
- Vite 클라이언트: Vite가 표시하는 localhost 주소
- Health check: `http://localhost:3001/api/health`

## 빌드

```bash
npm run build
```

API 키나 AI API 크레딧이 없어도 빌드는 통과해야 합니다.

## 요구사항 검증 에이전트

```bash
npm run verify:requirements
```

요구사항별 자동 테스트와 프로덕션 빌드를 차례로 실행하고, `RQ-01`부터 `RQ-11`까지 통과/실패 결과를 출력합니다. 실제 Gemini/OpenAI API는 호출하지 않아 비용 없이 PR 전에 반복 실행할 수 있습니다.

빌드를 생략한 빠른 확인은 아래 명령을 사용합니다.

```bash
npm run verify:requirements:fast
```

## Supabase 저장 공고

분석 결과를 Supabase 한 테이블에 저장하고 다시 조회하려면 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)의 SQL과 환경변수 설정을 적용합니다. 저장·조회는 Express 서버에서만 service role key로 실행되며, 프론트엔드에는 키가 전달되지 않습니다.

현재는 로그인 기능이 없으므로 Supabase 저장 API는 로컬 개발 또는 접근이 제한된 환경에서만 활성화하세요.

## 환경변수

실제 `.env` 파일은 직접 만들되, 절대 커밋하지 않습니다. 예시는 `.env.example`에 있습니다.

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3-flash-preview
AI_PROVIDER=gemini
ALLOW_LIVE_OPENAI=false
ALLOW_LIVE_GEMINI=false
PORT=3001
```

공개 예시의 기본값은 Gemini 공급자를 선택하지만 실제 호출은 비활성화한 상태입니다. `ALLOW_LIVE_GEMINI=false`이거나 API 키가 없으면 실제 API를 호출하지 않고 mock 결과를 반환합니다.

### Gemini 실제 분석 사용

Gemini API를 사용하려면 로컬 `.env`에서 아래처럼 설정합니다.

```bash
AI_PROVIDER=gemini
ALLOW_LIVE_GEMINI=true
GEMINI_API_KEY=발급받은_키
GEMINI_MODEL=gemini-3-flash-preview
```

`AI_PROVIDER=gemini`, `ALLOW_LIVE_GEMINI=true`, `GEMINI_API_KEY` 존재의 세 조건이 모두 맞을 때만 서버에서 Gemini API를 호출합니다. 기본 모델은 `gemini-3-flash-preview`이며, 모델명이 지원되지 않는 경우 서버는 `gemini-2.5-flash`로 한 번 재시도합니다.

### OpenAI 실제 분석 사용

OpenAI API를 사용하려면 로컬 `.env`에서 아래처럼 명시적으로 바꿔야 합니다.

```bash
AI_PROVIDER=openai
ALLOW_LIVE_OPENAI=true
OPENAI_API_KEY=발급받은_키
```

OpenAI는 `ALLOW_LIVE_OPENAI=true`일 때만 실제 호출을 시도합니다.

## API

### GET `/api/health`

```json
{
  "ok": true,
  "provider": "gemini",
  "aiProvider": "gemini",
  "geminiConfigured": true,
  "liveAIEnabled": true,
  "liveGeminiEnabled": true,
  "liveOpenAIEnabled": false
}
```

### GET `/api/sources`와 GET `/api/discover`

현재 지원 출처는 **경북대학교 공지사항**입니다. 대시보드의 **지원 공지 탐색**에서 출처와 선택 검색어를 고른 뒤 **공지 찾기**를 누르세요.

공지 목록 수집과 Gemini/OpenAI 분석은 별도 단계입니다. “분석 화면으로”는 후보 링크를 입력란에 채울 뿐 자동 분석하지 않으며, 현재 출처는 자동 본문 추출을 지원하지 않으므로 원문을 붙여넣은 뒤 직접 분석을 실행하세요. 자세한 출처 정책은 [NOTICE_SOURCES.md](./NOTICE_SOURCES.md)에 정리했습니다.

### POST `/api/analyze`

붙여넣은 `rawText`를 우선 분석합니다. 기존 URL 분석 흐름도 유지하며, URL만 입력한 경우 서버가 가져온 본문을 같은 분석 인터페이스로 전달합니다.

```json
{
  "profile": {
    "school": "경북대학교",
    "grade": 2,
    "majors": ["컴퓨터학부", "수학"],
    "interests": ["AI", "소프트웨어", "공모전"],
    "regions": ["대구", "온라인"],
    "canJoinTeam": true
  },
  "sourceUrl": "https://example.com/notice/123",
  "rawText": "공고 본문 텍스트"
}
```

응답의 `mode`는 `mock`, `openai`, `gemini` 중 하나입니다. 실제 provider 호출이 비활성화되었거나 실패하면 서버는 앱을 중단하지 않고 mock 결과를 반환하며, `fallbackUsed`와 `fallbackReason`으로 대체 여부를 공개합니다.


### 분석 결과 표준 구조

mock과 Gemini 분석 결과는 모두 [`DATA_SCHEMA.md`](./DATA_SCHEMA.md)에 정의한 표준 구조로 정규화한 뒤 UI에 전달합니다.

### 사용자 프로필과 재판정

현재 사용자 프로필은 브라우저의 localStorage에 저장되며 실제 회원가입·로그인은 구현하지 않았습니다. 브라우저나 기기를 바꾸면 프로필이 자동으로 공유되지 않습니다. 프로필을 수정하면 Gemini를 다시 호출하지 않고 기존 공고의 매칭 결과만 현재 프로필 기준으로 재계산합니다. 구조와 판정 기준은 [`PROFILE_SCHEMA.md`](./PROFILE_SCHEMA.md)를 참고하세요.

프로필을 저장하지 않아도 공고 핵심 정보 구조화는 실행됩니다. 이 경우 지원 가능성은 판정하지 않으며, 맞춤 판정이 필요할 때 프로필을 저장하면 됩니다.

## 테스트용 rawText

```text
2026 AI 소프트웨어 공모전 참가자 모집

대상: 전국 대학교 2학년 이상 재학생. 컴퓨터공학, 인공지능, 소프트웨어 관련 전공자 우대.
접수 마감: 2026년 8월 31일
제출 서류: 참가신청서, 프로젝트 계획서, 재학증명서
활동 지역: 온라인
혜택: 대상 300만원, 우수상 100만원
팀 참가 가능, 개인 참가 가능
```

## 보안 메모

- API 키는 프론트엔드 코드에 넣지 않습니다.
- API 키는 코드에 하드코딩하지 않습니다.
- `.env` 파일은 절대 커밋하지 않습니다.
- `.env.example`만 커밋합니다.
- 로그에 API 키나 환경변수 전체를 출력하지 않습니다.
- Gemini/OpenAI 호출은 Express 서버에서만 수행합니다.

## 계획서

https://github.com/clradtr/hub/wiki/%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8-%EA%B8%B0%ED%9A%8D%EC%84%9C

## 개발 Task

기획서와 현재 구현 상태를 기준으로 정리한 우선순위별 개발 백로그는 [TASKS.md](./TASKS.md)에서 확인할 수 있습니다.


## 배포 기반 구조

기본 실행은 계속 로컬 전용입니다. 향후 도메인과 호스팅을 연결할 수 있는 production 단일 서버, CORS, 보안 헤더, 요청 제한과 Docker 구조는 [DEPLOYMENT.md](./DEPLOYMENT.md)에 정리했습니다. 로그인과 사용자별 사용량 제한이 준비되기 전에는 외부에 공개하지 않습니다.
