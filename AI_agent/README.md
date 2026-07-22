# Career Mission AI

AI가 사용자의 스펙과 목표 직무를 바탕으로 역량을 분석하고, 실무형 미션과 피드백, 포트폴리오 정리까지 이어주는 커리어 매니저 웹앱입니다.

## Project Structure

```txt
frontend/  React + Vite client
backend/   Express + Prisma API server
docs/      Planning, checklist, and design documents
```

## Current MVP

- 회원가입, 로그인, 이메일 인증, 보호 라우트
- 내 정보 조회 및 기본 정보 수정
- 스펙 등록과 목표 직무 입력
- AI 분석 결과 표시 및 미션 추천
- 미션 상세, 결과물 업로드, AI 피드백
- 포트폴리오 자동 정리, 사용 도구와 배운 점 표시
- 공통 버튼, 입력폼, 빈 상태, 반응형 레이아웃 스타일 정리

## Frontend

```bash
cd frontend
npm install
npm run dev
```

검증:

```bash
npm run lint
npm run build
```

## Backend

```bash
cd backend
npm install
cp .env.example .env
npm run db:generate
npm run dev
```

백엔드는 Express, Prisma, PostgreSQL, JWT 인증, OpenAI API 연동 구조를 포함합니다. 실제 실행 전 `.env`의 데이터베이스와 API 키 설정이 필요합니다.

## Main Routes

```txt
/              홈
/signup        회원가입
/login         로그인
/verify-email  이메일 인증
/me            내 정보
/specs         스펙 등록
/analysis      AI 분석
/mission       미션 추천
/mission/:id   미션 상세 / 수행
/upload        결과물 업로드
/feedback      AI 피드백
/portfolio     포트폴리오
```
