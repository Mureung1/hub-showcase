---
name: code-convention
description: 이 프로젝트에서 코드를 작성·수정·리뷰할 때 사용. 프론트엔드(React 19 + Vite)와 백엔드(Node.js + Express + Mongoose)의 파일 구조·네이밍·컴포넌트/레이어 패턴·에러 처리·스타일 규칙을 docs/conventions.md를 단일 진실 소스로 적용한다. 새 파일·컴포넌트·라우트·서비스·모델을 만들거나 기존 코드를 정리할 때 항상 먼저 실행.
---

# 코드 컨벤션 스킬

`docs/conventions.md`를 **단일 진실 소스**로 삼아 이 프로젝트의 코드 규칙을 적용하는 스킬.

## 실행 순서

1. **`docs/conventions.md`를 먼저 읽는다.** 규칙이 갱신됐을 수 있으므로 항상 최신 문서를 기준으로 한다. 이 스킬 요약과 문서가 다르면 `docs/conventions.md`가 우선.
2. 작업 대상이 프론트엔드(`frontend/`)인지 백엔드(`backend/`)인지 판단하고 해당 영역 규칙을 적용한다.
3. 규칙에 명시되지 않은 부분은 **주변 기존 코드 스타일**을 따른다 (임의로 새 스타일 도입 금지).
4. 코드 작성/수정 후 필요하면 `npm run lint`로 확인한다.

## 핵심 요약 (상세는 conventions.md)

### 공통
- ES Modules, 한 파일 한 책임, 역할이 드러나는 이름.
- 포맷: 프론트=세미콜론 없음·2-space, 백엔드=세미콜론 사용·4-space. **각 영역 기존 스타일을 따른다.**

### Frontend (React 19 + Vite)
- 컴포넌트 파일 `PascalCase.jsx`, 컬렉션 모듈은 소문자(`icons.jsx`), 위치는 `frontend/src/components/`.
- **함수 선언형** 컴포넌트, `export default`는 하단.
- 네이밍: 컴포넌트 PascalCase / 상수 데이터 `UPPER_SNAKE` / 변수·함수 camelCase / CSS 클래스 kebab-case.
- import는 외부→내부 순, 내부 import에 `.jsx` 확장자 명시.
- 스타일: CSS + `className`, 동적 값만 인라인. 색·여백은 `docs/design.md` 변수 사용(→ `firstpr-ui` 스킬).
- `.map()`에 안정적 key(index 지양).

### Backend (Node.js + Express + Mongoose, 미착수)
- **레이어드 아키텍처**: `routes → controllers → services → models` (+ `config/middlewares/utils/cron`). 레퍼런스: 사용자의 `KNU_Capstone_Backend`.
- 레이어 책임 분리: Route(경로+미들웨어) / Controller(req·res·검증·HTTP응답) / Service(비즈니스 로직·DB·throw) / Model(Mongoose 스키마). `req`/`res`는 컨트롤러에서만.
- 네이밍: `xxxRoutes.js`·`xxxController.js`·`xxxService.js`, 모델 PascalCase, 라우트 `/api/<resource>` 복수형, 함수는 동사 camelCase.
- 에러 처리: 컨트롤러 `try/catch → res.status().json({ success:false, error:'한글' })`; 서비스는 winston 로거로 컨텍스트와 함께 기록 후 re-throw. 상태코드 관례(200/400/401·403/429/500) 준수.
- DB: `.lean()`·`.select()`, 다중 쓰기는 트랜잭션 `session`, 인덱스·`timestamps: true`.
- 설정은 `.env`+`dotenv`, 시크릿 커밋 금지.

## 하지 말 것
- 규칙에 없는 새 포맷/패턴을 임의 도입 (→ 주변 코드 따르기).
- 컨트롤러에 비즈니스 로직·DB 접근 넣기 / 서비스에서 `req`·`res` 만지기 (레이어 혼합).
- `.env`·시크릿 커밋.
