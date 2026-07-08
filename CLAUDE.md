# Briefy 프로젝트 규칙

말하듯 한 줄 적으면 정리되는 자연어 라이프 매니저. 모바일 뷰포트 기준 웹 MVP.

## 문서
- 기획: `docs/plan.md`
- 작업 순서: `docs/checklist.md`
- 기술 설계: `docs/ARCHITECTURE.md`
- 작업 전 해당 checklist 항목을 확인하고, **그 항목의 범위만** 구현한다. 다음 항목을 미리 만들지 않는다.

## 스택
- Next.js (App Router) + TypeScript + Tailwind CSS
- 데이터 저장: localStorage (MVP 범위 — 서버 DB 없음)
- AI: Anthropic Claude API (파서·조회 응답 생성)

## 코드 규칙
- 모든 페이지·컴포넌트는 `"use client"`. 서버 컴포넌트를 사용하지 않는다 (예외: `app/api/**` Route Handler)
- 상태는 React 내장 훅(useState 등)만 사용. 상태 관리 라이브러리 금지
- localStorage 접근은 `lib/storage.ts` 유틸을 통해서만. 컴포넌트에서 직접 호출 금지
- Claude API 호출은 `app/api/parse/route.ts`에서만. API 키는 `.env.local`의 `ANTHROPIC_API_KEY`, 클라이언트 노출 금지
- 항목 타입은 `types.ts`의 인터페이스만 사용. 새 필드·타입을 임의로 추가하지 않는다 (필요하면 ARCHITECTURE.md를 먼저 수정)
- 파서 요청/응답은 `docs/ARCHITECTURE.md`의 파서 계약을 따른다. 스키마 변경 시 계약 문서 먼저 갱신

## 스타일
- 모바일 우선: 본문은 `max-w-[430px] mx-auto`, 데스크톱에서도 폰 폭으로 표시
- UI 텍스트는 한국어
- Tailwind 유틸리티 클래스만 사용. CSS 파일 추가·외부 UI 라이브러리 설치 금지
- 아이콘은 이모지 또는 인라인 SVG

## 금지 (범위 밖 — plan.md 확장 계획 참조)
- 푸시 알림, 캘린더 연동, 주간 리포트, TTS 음성 응답, 로그인/계정
- checklist에 없는 기능의 선제 구현