# 크로스체크 — 가설 검증 인터뷰 분석 도구

PM이 인터뷰 전사문을 AI로 분석해 가설별 근거를 태깅하고 검증결과 초안을 만들되, 판단 근거가 원문까지 되짚어지는 "사슬"로 남는 리서치 도구입니다. 프로젝트 배경과 화면 흐름은 [기획서](../README.md)를 먼저 읽어보세요.

## 문서 지도

| 문서 | 내용 |
|---|---|
| [기획서](../README.md) | 문제정의, 핵심가치("판단 근거가 사슬로 남는다"), 사용자 시나리오, 화면 흐름 |
| [AI_Pipeline_Design.md](AI_Pipeline_Design.md) | Gemini 2단계 파이프라인 계약 문서 — 입출력 스키마, 온도, 폴백 |
| [plan/Week2_Implementation_Plan.md](plan/Week2_Implementation_Plan.md) | 2주차: 가설 입력 화면 수직 연동 |
| [plan/Week3_Implementation_Plan.md](plan/Week3_Implementation_Plan.md) | 3주차: AI 분석 엔진 · 대시보드 · 결과 공유 |
| [plan/Week4_Implementation_Plan.md](plan/Week4_Implementation_Plan.md) | 4주차: 분석 품질 고도화 · 테스트 검증 · 산출물 정리 (진행 중 WBS) |
| [plan/future_plan.md](plan/future_plan.md) | 4주차에서 이관된 v2 후보 항목(모델 고도화, 이월 UI, Notion 연동 등) |
| [Workflow.md](Workflow.md) | 기획→설계→구현→검증→배포 단계별 Skill/Agent 실사용 워크플로우 |
| [../showcase/video_script.md](../showcase/video_script.md) | 데모 영상 스크립트 |
| [../.claude/skills/](../.claude/skills/), [../.claude/agents/](../.claude/agents/) | 실제 사용 중인 Skill/Agent 원본 파일 |

## 실행 방법

### 요구 사항
- Node.js 20 이상 (CI는 24 사용)
- Supabase 프로젝트(PostgreSQL) — `backend/.env.example` 참고
- Google Gemini API 키

### 최초 설치
```bash
npm run install-all
```
루트 의존성 + `backend`/`frontend` 의존성을 한 번에 설치합니다.

### 환경 변수
- `backend/.env` — `backend/.env.example`을 복사해 `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`GEMINI_API_KEY` 등을 채웁니다. `GEMINI_DAILY_QUOTA`는 공개 배포 시 하루 총 분석 호출 상한입니다(기본 50).
- `frontend` — `VITE_API_BASE_URL`. 로컬 dev 서버는 Vite 프록시로 백엔드를 중계하므로 비워둬도 동작합니다(`frontend/vite.config.ts` 참고).

### 개발 서버 실행
```bash
npm run dev
```
루트에서 실행하면 `backend`(포트 3000)와 `frontend`가 `concurrently`로 동시에 뜹니다.

### 테스트
```bash
npm test --prefix backend
npm test --prefix frontend
```

### AI 분석 품질 평가 (선택 — 실제 Gemini API 호출 발생)
```bash
npm run eval --prefix backend
npm run eval --prefix backend -- --only 03_sparse   # 쿼터 절약: 단일 fixture만
```
`npm test`에는 포함되지 않습니다 — 실 API 호출로 쿼터를 소모하고 결과가 결정적이지 않기 때문입니다. 절차는 [analysis-quality-eval Skill](../.claude/skills/analysis-quality-eval/SKILL.md)에 고정되어 있습니다.

## 배포

- **Frontend:** Vercel — `frontend/vercel.json`이 `/api/*` 요청을 백엔드로 프록시합니다.
- **Backend:** Render — 무료 티어 특성상 유휴 상태에서 슬립되며, 첫 요청 응답에 약 20초가 걸립니다.
- 실제 배포 주소는 [`showcase/showcase.json`](../showcase/showcase.json)의 `demoUrl`을 참고하세요.

## Skill / Agent

이 레포는 개발 워크플로를 Claude Code Skill 4종(`pm-interview-analysis`, `analysis-quality-eval`, `tdd-feature-loop`, `branch-commit-push`) + Agent 1종(`requirement-verifier`)으로 고정해 사용합니다. 각 아티팩트가 어느 단계에서 무엇을 고정하는지, 그리고 실제 커밋 트레일러로 확인되는 사용 이력은 [Workflow.md](Workflow.md)에 정리했습니다.
