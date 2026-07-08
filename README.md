# Opportunity Agent MVP

대학생 맞춤형 장학금, 공모전, 대외활동, 지원사업 추천 에이전트 MVP입니다. React + Vite 프론트엔드와 Express API 서버로 구성되어 있으며, 현재 기본값은 **mock AI 모드**입니다.

## 구성

- React + Vite 프론트엔드
- Express API 서버
- zod 기반 입력/출력 검증
- OpenAI Responses API 연결 준비
- 기본 mock 분석 모드

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

API 키나 OpenAI 크레딧이 없어도 빌드는 통과해야 합니다.

## 환경변수

실제 `.env` 파일은 직접 만들되, 절대 커밋하지 않습니다. 예시는 `.env.example`에 있습니다.

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
AI_PROVIDER=mock
ALLOW_LIVE_OPENAI=false
PORT=3001
```

현재 기본값은 mock AI 모드입니다. 실제 OpenAI API를 사용하려면 `.env`에서 아래처럼 명시적으로 바꿔야 합니다.

```bash
AI_PROVIDER=openai
ALLOW_LIVE_OPENAI=true
OPENAI_API_KEY=
```

`AI_PROVIDER=mock`이면 API 키가 있어도 실제 OpenAI API를 호출하지 않습니다. API 크레딧이 없으면 실제 분석은 실패할 수 있으므로 개발과 발표 데모는 mock 모드로 진행합니다.

## API

### GET `/api/health`

```json
{
  "ok": true,
  "aiProvider": "mock",
  "liveOpenAIEnabled": false
}
```

### POST `/api/analyze`

rawText 분석을 우선 지원합니다. URL만 있고 rawText가 없으면 “본문을 직접 붙여넣어 주세요.”라는 400 응답을 반환합니다.

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
  "url": "https://example.com/notice/123",
  "rawText": "공고 본문 텍스트"
}
```

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

- OpenAI API 키는 프론트엔드 코드에 넣지 않습니다.
- OpenAI API 키는 코드에 하드코딩하지 않습니다.
- `.env` 파일은 절대 커밋하지 않습니다.
- `.env.example`만 커밋합니다.
- 로그에 API 키나 환경변수 전체를 출력하지 않습니다.

## 계획서

https://github.com/clradtr/hub/wiki/%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8-%EA%B8%B0%ED%9A%8D%EC%84%9C

