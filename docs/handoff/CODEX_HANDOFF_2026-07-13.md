# Codex 인수인계 — 2026-07-13 작업 커밋·PR 가이드

이 문서는 이전 작업 세션이 `work` 브랜치 **작업트리에 만들어 둔(아직 미커밋)** 변경을 Codex가 정리·커밋·PR 제출할 수 있도록 안내한다.

## 0. 한 줄 요약

P0 신뢰성 수정(점수 결정론화 `rules-v3`, 결과 스냅샷 수명), 근거 기반 **메타인지 보정 루프**, **크림/블루 에디토리얼 디자인 개편**, 그리고 논문 28편+웹 5건을 정리한 **근거 문서(reference·evidence-catalog)** 를 추가했다. 커밋은 아직 하지 않았다.

## 1. 시작 전 확인

```bash
cd /Users/bricepark/Documents/hub
git status --short --branch   # 브랜치: work
git diff --check              # 공백 오류 없음(clean) 확인
npm run lint && npm run build # 둘 다 통과해야 함
```

## 2. 변경 목록 (작업트리 현재 상태)

**수정(추적):**
- `src/lib/scoring.js` — 점수 순서 의존성 제거, `confidence→signalStrength`
- `src/lib/recommendations.js` — 동점 tie-breaker, `ALGORITHM_VERSION rules-v2→rules-v3`, 루틴 시간 단일화
- `src/lib/storage.js` — 메타인지 보정 저장(`saveCalibration`/`loadCalibration`, 별도 키), 전체 삭제에 반영
- `src/ProjectIntro.jsx` — (a) 결과 ID·스냅샷 수명, (b) baseline 명칭 정직화, (c) 메타인지 보정 카드, (d) 크림/블루 디자인 토큰·폰트·프레임 **← 한 파일에 4개 논리 변경이 섞여 있음(중요)**
- `CLAUDE.md` — 근거 문서·불변 원칙 포인터 1줄
- `docs/design.md` — 상단에 비주얼 방향 업데이트 노트

**삭제:**
- `src/ProjectIntro_2.jsx`, `src/MaterialsOrchestratorIntro.jsx` (미사용 dead code, 렌더 경로 main→App→ProjectIntro만 사용)

**신규:**
- `docs/reference.md` — 참고 문헌 출처(§A~F)
- `docs/evidence-catalog.md` — 학습법 근거·경계조건·설계 원칙·MBTI×전략 가설
- `docs/week2-issue-plan.md` — 2주차 이슈 계획(P0 완료·신규 이슈 반영)
- `scripts/audit-scoring-order.mjs` — 점수 순서 독립성 전수 감사(dev 콘솔 실행)
- `.claude/launch.json` — dev preview 편의 설정 **(커밋 선택 — 제외 가능)**
- `docs/handoff/CODEX_HANDOFF_2026-07-13.md`, `docs/handoff/STUDY_NOTES_2026-07-13.md` — 이 인수인계/학습 문서 **(과정 문서 — 커밋 제외 권장)**

## 3. 이미 끝난 검증 (다시 안 해도 되지만 재확인 권장)

- `npm run lint`·`npm run build` 통과.
- 순서 독립성: dev 서버 + `scripts/audit-scoring-order.mjs` 전수 감사 결과 `scoreChanged=0, orderedTop3Changed=0`(rules-v2는 729/53).
- 공식결과 있음/없음 두 경로 브라우저 완주, 콘솔 오류 0.
- 메타인지 루프: 예측→회상→보정오차 저장, 같은 resultId 재기록 시 갱신, 전체삭제 시 보정 키까지 제거 확인.
- 디자인: 라이트/다크 모드 렌더 확인.

## 4. 권장 커밋 순서

```
1. fix: 점수 계산을 응답 순서와 무관하게 결정론화 (rules-v2→v3)
   파일: src/lib/scoring.js, src/lib/recommendations.js, scripts/audit-scoring-order.mjs

2. feat: 결과 수명·메타인지 보정 루프·디자인 개편
   파일: src/ProjectIntro.jsx, src/lib/storage.js
   포함: 결과 ID·스냅샷 수명 안정화 + baseline 명칭 정직화 + 메타인지 보정 루프(예측→회상→대조) + 크림·블루 세리프/스크립트 디자인 개편

3. docs: 논문 근거 카탈로그·reference 신설 및 설계 원칙 명시
   파일: docs/reference.md, docs/evidence-catalog.md, CLAUDE.md, docs/design.md

4. docs: 2주차 이슈 계획 갱신
   파일: docs/week2-issue-plan.md

5. (선택) chore: 미사용 컴포넌트 제거
   파일: src/ProjectIntro_2.jsx, src/MaterialsOrchestratorIntro.jsx 삭제
```

**주의 — `src/ProjectIntro.jsx`는 수명·메타인지·디자인 변경이 얽혀 있으므로 쪼개지 말고 커밋 2 하나로 합친다.**
- `git add -p`로 hunk를 나누지 않는다(중간 커밋 빌드가 깨질 수 있고 최종 결과는 동일하므로 합치는 편이 안전).
- 커밋 2는 `git add src/ProjectIntro.jsx src/lib/storage.js` 로 파일 통째 담아 한 번에 커밋한다.

## 5. PR 제출 가이드

- **현재 `work` 브랜치에 커밋한 뒤, `work` 기준으로 새 PR을 생성한다.** (매 작업 새 PR이 원칙 — 기존 Draft PR 갱신·재사용 안 함, 별도 브랜치 분리 없음.)
  - head `bricepark94:work` → base `connect-AIAgentChallenge-26-1/hub`의 `N077_박병관`.
  - 동일 head/base로 열린 PR이 이미 있어 GitHub가 새 PR을 막는 경우에만 사용자에게 처리 방법을 물어본다.
- PR 본문 초안:
  > **무엇을**: P0 신뢰성(점수 결정론화 rules-v3, 결과 스냅샷 수명), 근거 기반 메타인지 보정 루프, 크림/블루 에디토리얼 디자인, 논문·웹 근거 카탈로그화.
  > **검증**: lint/build 통과, 순서 독립성 0/19,683, 두 경로 브라우저 완주, 메타인지 저장·갱신·삭제 확인.
  > **범위 밖(유지)**: 로그인·서버·AI API 미도입(게이트 이후). 사용자 응답 원문 미커밋.
- **커밋 메시지·PR 본문에 Claude/AI 생성 크레딧(Co-Authored-By, "Generated with ..." 등)을 넣지 않는다.**

## 6. 하지 말아야 할 것 (Hard rules)

- **force push 금지**(사용자 명시 허가 전). `git commit --amend`/rebase도 기존 커밋에 하지 말 것.
- 로그인·서버·DB·AI API·커뮤니티·캘린더 기능을 새로 추가하지 말 것(게이트 G4/G6 이후).
- 사용자 설문 응답 원문·자유의견·개인정보를 저장소/Issue에 넣지 말 것.
- `package.json`·의존성 변경(테스트 러너 등)은 사용자 승인 후에만.
- `docs/handoff/*`와 `.claude/launch.json`은 제품 산출물이 아니므로 커밋에서 빼도 된다(사용자 선택).
- 커밋 전 `npm run lint`·`npm run build` 재확인.
