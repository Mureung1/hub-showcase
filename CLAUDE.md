# CLAUDE.md

이 파일은 AI 에이전트가 WeatherPilot 프로젝트에서 작업할 때 참고하는 지침이다.
사람용 사용법은 `README.md`를 따른다.

## 프로젝트

날씨 데이터로 소상공인의 매출을 지키는 자율 마케팅 에이전트. 에이전트가 날씨·매출을 분석해 마케팅 문구·쿠폰을 미리 만들어 두고, 사장님은 검토·승인만 한다. 발송 후 쿠폰 사용을 추적해 캠페인 효과를 실측한다.

## 기술 스택

- **모노레포**: npm workspaces (`apps/*`, `packages/*`)
- **FE**: React + TypeScript (Vite) — `apps/web`
- **BE**: Node + Express + TypeScript — `apps/server`
- **공용 타입**: `packages/shared`
- **DB**: Supabase (PostgreSQL)
- **개발 실행**: 루트에서 `npm run dev` (concurrently로 web+server 동시 기동)

## 폴더 구조

```
apps/web        FE (인라인 스타일만, App.tsx 진입)
apps/server     BE (src/index.ts 진입, /health 확인용)
packages/shared FE·BE 공용 타입 (Scenario, Proposal 등)
```

## 스타일링 규칙 (최우선)

- **외부 스타일링 라이브러리 절대 금지** — Tailwind, styled-components, MUI, emotion 등 전부 금지.
- 스타일은 **인라인 스타일 객체 또는 순수 CSS 객체**로만 작성한다.
- 색·폰트 등 반복 값은 상수 객체로 분리해 재사용한다.

## 컨벤션

- 컴포넌트: PascalCase / 함수·변수: camelCase / 타입·인터페이스: PascalCase
- 커밋 메시지: `feat` / `fix` / `refactor` / `docs` / `chore` 중 하나를 접두로 + 한국어로 바뀐 것 요약 (예: `feat: 프로토타입 화면에 디자인 토큰 적용`)
- 브랜치·PR 제출: fork(`shyang0319/hub`)의 `N111_양서형` 브랜치 → 운영진 저장소 동일 브랜치로 PR
- FE·BE가 주고받는 데이터 타입은 `packages/shared`에 정의하고 양쪽이 import (양쪽에 중복 정의 금지)

### "커밋해줘" 요청 처리 (자동 실행)

사용자가 **"커밋해줘"**(또는 같은 뜻의 요청)라고 하면, 되묻지 말고 아래 단계를 순서대로 실행한다. 이 지침 자체가 add·commit·push에 대한 사전 승인이다.

1. `git add .`
2. **시크릿 체크** — `git diff --cached --name-only`로 스테이징된 파일 목록을 확인하고, `.env`류 파일이나 API 키·토큰으로 보이는 내용이 포함되어 있으면 커밋을 진행하지 말고 사용자에게 알린다. (풀 `/security-review`는 돌리지 않는다 — PR 낼 때만 별도 요청 시 수행)
3. `git commit -m "<타입>: <바뀐 것 요약>"` — 타입은 위 커밋 규칙을 따르고, 메시지는 실제 변경(diff)을 보고 직접 작성한다. 플레이스홀더 금지.
4. `git push origin N111_양서형`

- 대상 브랜치는 항상 `N111_양서형` 고정. 현재 다른 브랜치에 있으면 실행 전에 먼저 알린다.
- `git add .`는 `.gitignore`를 따르므로 `.env` 등 시크릿은 대부분 자동으로 제외되지만, 2단계로 한 번 더 확인한다.
- 커밋 메시지에 `Co-Authored-By: Claude ...` 트레일러를 붙이지 않는다. (사용자 요청)

## 하지 말 것

- `any` 타입 금지 (불가피하면 이유를 주석으로)
- 외부 스타일링 라이브러리 금지
- **API 키·비밀값을 프론트(apps/web)에 두지 말 것** — 모든 시크릿은 서버 전용, `.env`로만 (커밋 금지)
- **법적 필터를 UI에만 두지 말 것** — 정보통신망법 요건(수신동의·(광고)표기·야간 차단)은 반드시 `apps/server`에서 강제. UI 체크는 안내일 뿐.
- 미사용 import·변수 방치 금지 (`noUnusedLocals`로 빌드가 막힘)
- 스코프에서 "모의"로 합의한 것을 임의로 실연동으로 바꾸지 말 것 (아래 참고)

## 구현 스코프 (챌린지 기간 기준)

- **실연동**: 날씨(기상청+OpenWeatherMap), LLM(**Groq** — 무료·OpenAI 호환, 원안 Claude API. provider 교체 가능), 문자(Solapi·본인 번호 테스트), DB·스케줄러
- **대체 구현**: POS 연동 → 수동 일매출 입력 + CSV 업로드
- **모의 유지**: 080 수신거부 실회선, 카카오 알림톡, 타인 계정 SNS 게시
- 데모의 "쿠폰 실시간 추적"은 연출이며, 실제로는 쿠폰 코드 기반 누적 집계다. 실시간이라 단정하지 말 것.

## 참고 문서

- 기획서: @WeatherPilot_기획안.md
- 기술 로드맵·아키텍처·검증: @WeatherPilot_기술로드맵.md
- 개발 백로그(Task): @WeatherPilot_백로그.md
