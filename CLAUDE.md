# CLAUDE.md — 자취방 청결관리사

이 파일은 개발 Agent가 매 작업 전에 읽는 프로젝트 맥락이다. 여기 적힌 결정을 따르고, 어겨야 할 이유가 생기면 먼저 사용자에게 확인한다.

## 이 프로젝트가 뭔가

자취생의 부엌·화장실 위생 문제(악취·벌레·곰팡이·습도)를, AI agent가 사용자와 대화하며 원인을 진단하고 해결책을 제안하는 서비스. 네이버 AI Agent Challenge 부트캠프 프로젝트(3주·1인).

**핵심 기능은 딱 하나 — 턴제 진단 세션.**
사용자가 문제를 자연어로 입력 → agent가 판단에 필요한 데이터가 없으면 **그 자리에서 되물어 채운다**(① 질문 ② 사진 요청 ③ 흔한 경우는 가정하고 진행) → 유력한 원인부터 턴제로 솔루션 제시 → 사용자가 만족하면 종료 → 세션이 이력으로 남아 다음 판단의 근거가 됨.

상세는 `docs/기획서.md` 참조. 이 핵심 기능 외의 것(재고 관리 등)은 **스코프 밖**이니 요청받지 않는 한 만들지 않는다.

## 절대 규칙 (어기지 말 것)

1. **AI(Claude) 호출은 백엔드(apps/api)에서만.** API 키를 프론트에 절대 노출하지 않는다.
2. **디자인은 토큰만 쓴다.** raw hex 금지. `apps/web/src/design/tokens.css`(또는 tokens.js)의 변수만 사용. UI를 만들 땐 `.claude/skills/cleanliness-design/SKILL.md`를 먼저 읽고 그 체크리스트로 자가 검증한다.
3. **스코프를 넓히지 않는다.** 핵심 기능 하나를 탄탄히. 서브 기능을 임의로 추가하지 않는다.
4. **confidence는 숫자가 아니라 질적 라벨**("유력"/"보통")로 표기. 통계적으로 검증된 값이 아니므로 틀린 확신을 주지 않는다.
5. 파괴적 작업(파일 대량 삭제, DB 초기화 등)은 실행 전 확인받는다.

## 기술 스택 (확정)

- **구조:** monorepo, npm workspaces + concurrently (Turborepo 안 씀 — 규모 대비 과함)
- **프론트:** React + Vite, **순수 CSS + 디자인 토큰** (Tailwind·UI라이브러리 안 씀)
- **백엔드:** Express + cors + dotenv + @anthropic-ai/sdk
- **언어:** JavaScript (TS 아님). 공유 스키마만 JSDoc로 타입 힌트
- **데이터:** 1차는 DB 없이 React state. 영속 저장은 시간 남으면.
- **상태관리:** React 기본 state/context (Redux 안 씀)

## 디렉토리

```
apps/web/src/features/{probe,diagnosis,session}/   # 화면 3개, 서로 독립
apps/web/src/design/                               # 토큰
apps/api/src/{routes,services}/                    # 엔드포인트 / AI 로직
packages/shared/schema.js                          # 프론트·백 공유 타입 (기획서 부록 A)
```

기능은 `features/` 아래 기능 단위로 묶는다. 화면 3개는 독립적이어야 한다(한 폴더 지워도 나머지가 안 무너지게).

## 컨벤션

- 컴포넌트 `PascalCase.jsx`, 그 외 `camelCase.js`
- 함수·변수 camelCase, 의미 드러나는 이름
- 커밋: `type: 한글 요약` (type = feat/fix/docs/style/refactor/chore)
- 한 커밋 = 한 가지 일. 브랜치 `type/기능명`. PR은 기능 단위.

## 개발 순서 (로드맵)

1. monorepo 뼈대 + web/api 초기화
2. 디자인 토큰 이관
3. **공유 스키마 작성 (Layer 0)** ← 여기부터 실제 기능
4. features/probe → diagnosis → session 순서로

## 열린 질문 (개발 중 결정, 임의로 정하지 말고 확인)

- 미완료 세션(사용자가 중간에 이탈) 처리 방식
- AI 재검증 강도 (몇 번까지 이의제기가 자연스러운가)
- confidence 노출 방식 (라벨 vs 게이지)

## 톤

사용자를 향한 문구는 존댓말 + 다정하지만 담백하게. 시스템 용어 금지. AI의 이의제기는 비난이 아니라 조력("~하면 재발이 줄어요").
