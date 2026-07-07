# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 서비스 목적
"식비구조대" — 자취생·1인 가구가 재료 최저가를 찾느라 시간을 쓰지 않도록, 공공데이터포털(KAMIS) 시세를 기반으로 가성비 좋은 요리를 추천하고 네이버/쿠팡 구매 링크를 바로 제공한다. 상세 기획은 `plan.md`, 작업 순서는 `checklist.md` 참고.

## 자주 쓰는 명령어
- `npm install` — 의존성 설치
- `npm run dev` — 개발 서버 실행 (Vite, 저장 시 자동 반영)
- `npm run build` — 프로덕션 빌드
- `npm run preview` — 빌드 결과 로컬 미리보기
- `npm run lint` — oxlint로 코드 검사
- 테스트 명령어는 아직 없음 (테스트 도구 미도입, 추후 필요해지면 추가)

## 코드 구조
- 진입점: `src/main.jsx` → `src/App.jsx`. `App.jsx`는 현재 빈 화면(placeholder)이며, `plan.md`의 화면 흐름(홈/요리 상세/가계부)을 이 안에 구현해나갈 예정.
- 전역 스타일은 `src/index.css` 하나만 사용 중. `src/App.css`는 Vite 초기 템플릿에서 남은 파일로 어디에서도 import되지 않음 (필요 없어지면 삭제 대상).
- 코드 검사는 `.oxlintrc.json` 설정의 oxlint만 사용, Prettier 등 별도 포맷터는 아직 없음.

## 커밋 규칙
- 커밋은 작은 단위로 자주 나눠서 한다 (예: "KAMIS 시세 조회 함수 추가", "Top10 카드 UI 추가" 처럼 기능 하나씩).
- 커밋 메시지는 한글로 간단하고 명확하게 작성한다. 접두사(feat/fix 등)는 붙이지 않는다.
- 하나의 커밋에 관련 없는 변경을 섞지 않는다.

## 개발 원칙
- API 키(KAMIS 등)는 절대 프론트엔드 코드나 커밋에 노출하지 않고 서버(Vercel 서버리스 함수) 환경변수로만 관리한다.
- 가계부 저장 로직은 나중에 로그인+DB로 교체할 수 있도록 별도 모듈로 분리해서 작성한다.
- 코드 작성 전 `checklist.md`에서 해당 작업 항목을 확인하고, 완료되면 체크 표시한다.
