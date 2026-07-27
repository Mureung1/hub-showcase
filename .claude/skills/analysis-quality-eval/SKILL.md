---
name: analysis-quality-eval
description: 골든셋 fixture 대비 AI 분석 품질을 측정하는 절차를 따른다. "eval 돌려줘", "baseline 측정해줘", "지표 확인해줘", "프롬프트 바꾸기 전에 측정해줘" 같은 요청에 사용한다.
---

# 분석 품질 회귀 평가(eval) 실행 및 해석 절차

4주차 계획서(`README/plan/Week4_Implementation_Plan.md`)의 핵심 원칙: **개선 전에 측정한다.** 이 스킬은 그 측정을 실행하고 해석하는 절차를 고정한다.

## 1. 실행 전 확인

- `backend/fixtures/hypotheses.json`과 `backend/fixtures/interviews/*.md`가 존재하는지 먼저 확인한다. 없으면 Task 21이 아직이므로 eval을 돌릴 수 없다.
- 각 fixture md의 frontmatter에 사람이 적은 `expected_status`가 있는지 확인한다. **AI가 채운 라벨은 정답으로 인정하지 않는다** — 자기참조 평가가 되어 지표가 항상 100%로 나온다.
- `.env`에 `GEMINI_API_KEY`가 설정돼 있는지 확인한다(실제 API 호출이다).

## 2. 실행

```bash
npm run eval --prefix backend
# 쿼터 절약: 단일 fixture만
npm run eval --prefix backend -- --only 03_sparse
```

- **`npm test`에는 절대 포함하지 않는다.** 결정적이지 않고 쿼터를 소모한다.
- 결과는 `backend/eval/results/YYYY-MM-DD_HHmm.json`에 저장된다. 실행할 때마다 새 파일이 남아야 하며 덮어쓰지 않는다.

## 3. 지표 해석 — 관측 단위에 따라 다르게 읽는다 (2026-07-27 확정)

fixture는 5~6건, 가설은 파일당 1~3개라 총 판정 단위가 12건 안팎이다. 이 규모에서 소수점 있는 백분율은 없는 정밀도를 만든다.

- **백분율로 비교 가능** (관측 단위가 인용문·마커 수십 건): `quote_match_rate`, `citation_integrity_rate`
- **fixture별 pass/fail 단언표로만 비교** (관측 단위 12건 안팎, 백분율 금지): `hypothesis_id_valid_rate`, `status_accuracy`
  - 예: "`03_sparse`에서 `근거 부족`이 나왔는가? O/X" 형태로 표를 채운다. "83.3%"처럼 쓰지 않는다.

## 4. 비교 판정 규칙

- LLM 출력은 비결정적이다. **동일 프롬프트로 최소 2회 측정**하고, 그 두 결과의 변동폭보다 큰 차이만 "개선"으로 인정한다.
- 프롬프트를 고칠 때마다 `SKILL.md`(pm-interview-analysis) · `AI_Pipeline_Design.md` · `lib/prompts/*`를 **같은 커밋에서** 갱신했는지 확인한다.
- 개선되지 않았으면 개선되지 않았다고 계획서(Task 37)에 그대로 적는다. 수치를 골라서 보고하지 않는다.

## 5. 완료 후 기록

측정 결과를 `README/plan/Week4_Implementation_Plan.md` 하단 "고도화 결과 기록" 표에 옮긴다. 모델명·온도·fixture 세트·측정 횟수를 함께 적지 않으면 이후 비교가 성립하지 않는다.
