## 프로젝트 컨텍스트 & 결정 사항

- 레포 구조: 프론트엔드/백엔드 분리(현재 `frontend/`, `backend/` 폴더 존재). 모노레포 형태 유지.
- 패키지 매니저: `npm` 사용 (요청)
- 프론트엔드: React (Vite 기반) — 현재 `frontend/package.json`에 `react`, `react-dom`, `vite` 설정 존재
- 백엔드: Express 유지 (`backend`에 `express`, `cors`, `nodemon` 설정 존재)
- 테스트: `vitest` 사용 (요청)
- API 경로 규칙: 모든 서버 API는 `/api`로 시작
  - 예: `/api/stores`, `/api/reviews`

---

## 제안된 디렉토리 구조

project-root/
- frontend/            # React app (Vite)
  - package.json
  - src/
  - public/
- backend/             # Express API
  - package.json
  - server.js (또는 src/server.js)
- design-skill/        # 디자인 토큰/스킬 데모 (현재 존재)
- CLAUDE.md            # 이 문서

권장: backend/src/ 형식으로 소스 폴더를 둘 경우 `main` 필드를 `server.js` 또는 `dist/index.js`로 맞춰주세요.

---

## 필수/권장 라이브러리

- 프론트엔드 (기본)
  - react, react-dom
  - vite, @vitejs/plugin-react
  - (권장) axios 또는 fetch wrapper for API 호출
  - (권장) vitest + @testing-library/react
  - (선택) Tailwind / CSS Modules / styled-components (프로젝트 스타일 전략에 따름)

- 백엔드 (기본)
  - express
  - cors
  - (개발) nodemon
  - (권장) joi 또는 zod (입력 밸리데이션)
  - (권장) helmet, morgan (보안/로깅)

- 공통(권장)
  - eslint + prettier (코드 일관성)
  - husky + lint-staged (커밋 전 검사)
  - vitest (테스트 러너)

---

## 개발 스크립트 예시

- frontend/package.json
  - `npm run dev` → vite 개발 서버
  - `npm run build` → 빌드

- backend/package.json
  - `npm run dev` → nodemon server.js (개발)
  - `npm start` → node server.js (프로덕션)

루트에서 두 서비스를 동시에 띄우고 싶으면 `concurrently` 또는 `npm-run-all`을 추가해 `npm run dev` 스크립트를 만들 수 있습니다.

---

## 컨벤션: 코드·브랜치·커밋 로그

- 브랜치 전략
  - `main`(또는 `master`) : 배포 가능한 상태 유지
  - 기능 개발: `feature/<짧은-설명>`
  - 버그픽스: `fix/<짧은-설명>` 또는 PR 기준으로 브랜치 생성
  - 긴급 hotfix: `hotfix/<버전>-desc`

- 커밋 메시지 규칙 (Conventional Commits 기반 예시)
  - `feat: 기능 추가` — 새로운 기능
  - `fix: 오류 수정` — 버그 수정
  - `style: UI/CSS 수정` — 포맷/스타일 변경 (기능 변경 없음)
  - `docs: 문서 수정` — 문서 변경
  - `refactor: 코드 정리` — 리팩토링
  - `chore: 환경설정` — 빌드 프로세스 또는 보조 도구 변경

예시
```
feat: 리뷰 목록 API 추가 (/api/reviews)
fix: 리뷰 저장 로직의 null 처리 누락 수정
```

권장: `husky`+`lint-staged`로 커밋 전에 lint 검사를 실행하면 규칙 준수가 쉬워집니다.

---

## 테스트 정책
- 단위/컴포넌트 테스트: `vitest` + `@testing-library/react`
- 백엔드 단위/통합: `vitest` + supertest 권장

---

## CI/CD 권장
- GitHub Actions 권장: PR 빌드, lint, test 실행 후 merge
- 배포 대상 예시: 프론트엔드 → Vercel/Netlify, 백엔드 → Heroku / DigitalOcean App / AWS (간단 배포용)

---

## 기타 메타
- Node 버전: 명시적으로 고정하지 않음(사용자 요청: 버전 ‘맘대로’). 필요 시 `.nvmrc` 또는 `engines` 필드 추가 권장.
- 메인 연락처: 미정(사용자 응답 없음)

---

이 문서를 기반으로 제가 다음 작업을 수행할 수 있습니다:
1. `CLAUDE.md`에 기술된 권장사항을 기반으로 `eslint`/`prettier`/`husky` 설정 추가
2. 루트 `package.json` 생성하여 `concurrently`로 프론트/백 동시 실행 스크립트 추가
3. `backend/package.json`의 `main` 필드(현재 `index.js`)를 실제 파일(`server.js`)로 정리

원하시는 다음 작업 번호(예: 1, 2, 3 또는 모두)를 알려주세요.
