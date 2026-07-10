# AGENTS.md

대학생 소액 투자자를 위한 **근거 검증 Agent**의 범용 에이전트 지침. 어떤 코딩 에이전트(Claude Code, Codex, Cursor 등)로 작업하든 이 파일을 기준으로 삼는다. Claude Code 전용 안내와 상세 아키텍처는 [CLAUDE.md](CLAUDE.md)에, 기획은 [docs/plan.md](docs/plan.md)에, **Agent 스킬 계약은 [docs/skills.md](docs/skills.md)** 에 있다.

## 이 프로젝트가 하는 일

종목을 추천하지 않는다. 사용자가 보는 현재가와 예상 적정가를 비교한 뒤, 매수 판단이 실제 공시·재무 데이터로 뒷받침되는지 **검증**한다. Agent는 세 기능(A 종목 공부 / B 현재가·적정가 / C 근거 검증)으로 구성되며, 각 기능은 [docs/skills.md](docs/skills.md)의 스킬(S1~S11)을 조합한 파이프라인이다.

## 절대 원칙 (코드·문구·출력 전반)

1. **추천 금지** — 목표가·"사세요/파세요" 문구를 출력하지 않는다. 판정·근거 제시까지만.
2. **환각 금지** — 원문 공시에 없는 수치·사실을 만들지 않는다. 데이터가 없으면 빈 값을 채우지 말고 `데이터 부족`을 명시한다.
3. **기준일 필수** — 데이터를 담은 모든 화면·출력에 `기준일(YYYY-MM-DD)`을 표시한다.
4. **출처 동반** — 재무 수치·근거는 출처 공시와 함께 표시한다.

이 4개는 [docs/skills.md](docs/skills.md)의 스킬 공통 계약과 동일하다. 스킬을 구현·수정할 때 이 계약을 게이트로 재검증한다.

## 작업 규칙

- **스킬 우선 참조** — Agent 기능을 건드리기 전에 [docs/skills.md](docs/skills.md)에서 해당 스킬의 입력/출력/제약을 확인한다. 새 스킬 추가나 계약 변경 시 `docs/skills.md`를 **먼저** 갱신하고 코드를 맞춘다.
- **문서 동기화** — 기능·아키텍처를 바꾸면 `docs/skills.md`, `CLAUDE.md`, 관련 `docs/*.md`를 함께 갱신한다.
- **언어·톤** — 사용자 대면 문구는 한국어, 초보 투자자 눈높이, 추천이 아닌 **검증** 톤.
- **LLM** — LLM 작업은 Claude API를 기본(최신 모델 우선)으로 한다. 스택은 [docs/docs_1.md](docs/docs_1.md) §3을 따른다.

## 기술 스택 / 아키텍처

React · FastAPI · LangGraph · Claude API · PostgreSQL · Chroma · OpenDART. LangGraph 노드 = 스킬 실행 순서이며 대응 관계는 [docs/skills.md](docs/skills.md)의 "파이프라인 대응" 절 참고. Redis·Next.js·Docker+EC2는 의도적으로 제외.

## 현재 상태

`src/`는 소개(랜딩) 페이지 한 장. Agent 스킬은 전부 미구현이며 [docs/checklist.md](docs/checklist.md)의 5주 계획을 따라 노드 단위로 만든다.

## 명령어

```bash
npm install
npm run dev      # Vite 개발 서버
npm run build    # dist/ 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
```
