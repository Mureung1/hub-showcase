# 핸드오프: Manager AI (SPEC-AI-002) — 개발 재개용

> **목적**: 조사·발표를 마치고 **다시 개발을 시작**하기 위한 실행 문서. 새 Chat(또는 Claude Code)이 이 문서 하나로 "지금 코드가 어디까지 됐고 / 무엇을 정했고 / 다음에 무엇을 어떤 순서로 구현하면 되는지"를 파악하도록 구성했다.
> **이 문서의 위치**:
> - `docs/growth/09-ai-decision-logic.md` = **왜 이렇게 설계하는가**(레벨 10 조사·논거). 근거가 필요하면 그쪽.
> - `HANDOFF-AI-002-MANAGER.md` = 열린 논점을 **논의**하려고 만든 스냅샷(조사 전 버전).
> - **이 문서(`HANDOFF-AI-002-DEV.md`)** = 조사가 끝난 뒤 **무엇을 만들지**(실행). 발표 자료는 제외.
> - ⚠️ 항상 진실의 원천은 저장소 `docs/`. 이 문서와 다르면 저장소가 맞다.

---

## 1. 지금 개발 상태 (한눈에)

| 영역 | 상태 | 비고 |
|---|---|---|
| 회원가입·로그인 (Supabase Auth) | ✅ 완료 | SPEC-AUTH-001/002/003 |
| DB·소유권·RLS | ✅ 완료 | SPEC-DB-001 (T-015) |
| 공통 Zod 계약 | ✅ 완료 | SPEC-SCHEMA-001 (T-011) |
| **실제 3사 SourceAnswer 파이프라인** | ✅ 완료·배포됨 | SPEC-AI-001 (T-016). 서버가 실제 Claude·OpenAI·Gemini 호출 → 정규화 → 저장 → SSE 스트리밍 |
| 배포 (Render + Netlify + Supabase) | ✅ 라이브 | 데모 링크 동작. `docs/demodeploy.md` |
| **Manager (3사 답변 → 쟁점 분류·비교)** | 🔴 **아직 Mock** | 브라우저가 고정 템플릿으로 가짜 Agenda 생성. **← 다음 작업 = SPEC-AI-002** |
| FinalAnswer·DecisionNote 생성 | 🔴 아직 Mock | SPEC-AI-003 몫 (그다음) |

**다음 개발 = SPEC-AI-002 (Manager AI).** 파일명 `docs/specs/SPEC-AI-002-manager.md` (아직 미작성).

---

## 2. 다음 작업의 정체 — Manager가 어디에 끼나

```text
Question 입력
→ 3사 SourceAnswer 생성 (실제 호출·SSE — 이미 구현됨)
→ ★ Manager AI: 성공한 답변들을 쟁점(Agenda)으로 분류 + 합의/충돌 판정 ★   ← 이번에 만든다
→ Consensus는 자동 통과 / Conflict는 사용자 판단(채택·직접입력·재검토1회·제외)
→ 모든 Agenda 확정 → FinalAnswer → DecisionNote → completed
```

**이번 SPEC-AI-002의 범위(이미 확정):**
- Manager를 **브라우저 Mock → 서버**로 이동.
- 결과 Agenda를 **DB에 저장**(새로고침해도 복원 — 현재 Mock의 한계 해소).
- 기존 3사 SSE 스트림에 **이어붙여** Agenda까지 실시간 스트리밍.
- 모델 = **Qwen(최저가) via OpenRouter**. `/prompts`에 버전 관리, 설정으로 DeepSeek·Kimi A/B 교체 여지.
- 쟁점 개수 = **Manager 재량 + 상한**(예: 최대 5~6개).
- 포트 = ADR-005의 **`AgendaClassifier`(묶기)** + **`ConflictComparator`(판정)**.

---

## 3. 조사가 확정해준 설계 결정 (거의 확정 — 이대로 구현)

`growth/09` ④·⑤에서 좁혀진 것들. **개발 시 이 결정들을 전제로 시작한다.**

1. **묶기 ≠ 판정, 2단 구조 필수.** "같은 주제인가"(묶기)와 "같은 결론인가"(판정)는 다른 질문 — 임베딩/유사도는 "A안 채택"과 "A안 반대"를 가깝다고 본다("비슷함 ≠ 같은 편"). ADR-005의 두 포트가 정확히 이 구조.
2. **순수 임베딩 클러스터링 단독 = 탈락.** "비슷함 ≠ 같은 편" 때문.
3. **방법 A(3사 답 통째로 한 번에 시키기) = 탈락.** 디버깅 불가 + 과분할 방지 없음 + "몇 대 몇" 카운트를 AI가 자기 입으로 말해 검증 불가.
4. **한 섹션이 여러 쟁점에 속할 수 있게(다중 배정) 허용.**
5. **provider 입력 순서 무작위/회전 + 그 순서를 레코드에 스탬프.** (입력 순서가 결과를 편향시킴 → "Claude 편향 아니냐" 검증 가능해야 함)
6. **판정은 "충돌 쪽으로 편향"이 안전한 기본값.** 약한 모델은 충돌을 과소 탐지(재현율 낮음). 잘못 충돌로 보내면 사용자가 "같은 얘기네" 하고 채택하면 되지만, **잘못 합의로 자동 통과시키면 복구 경로가 없다.**
7. **stance마다 `quote`(원문 부분 문자열) 필수 → 서버가 substring 검증 → 실패 stance 폐기, stance 0개 된 Agenda도 폐기.** "근거 없는 비교 저장 금지"를 선언이 아니라 코드로 강제. (`sectionId` enum 제약도 함께)
8. **구조화 출력 세금 대응**: `reasoning`(임시 추론) 필드를 `kind`(결론)보다 **앞**에 두고 저장 전 버림("reason free, constrain late"). enum description에 판정 기준을 박음(`consensus`="표현 달라도 실질 주장 같음", `conflict`="양립 불가 권고").
9. **⚠️ Qwen은 구조화 출력 시 `max_tokens` 설정 금지** — JSON이 중간에 잘려 파싱 실패. 5~6 Agenda × stance 3개면 출력이 길어 실제 걸릴 함정.
10. **2:1 부분 합의 = 자동 다수결 금지 → 충돌로 사용자에게.** (사용자가 다수결 휴리스틱으로 소수 정답을 무시하는 현상이 실증됨)

---

## 4. 남은 결정 1개 — 방법 B vs C+D + 2-pass 여부 ★

**이것만 정하면 프롬프트 초안·Zod 스키마까지 따라 나오고, `growth/09`의 "고민"을 SPEC-AI-002로 닫을 수 있다.**

| | 방법 B (Pivot: 기준 답에 붙이기) | 방법 C+D 혼합 (쪼개 임베딩 묶기 + 목록먼저) |
|---|---|---|
| 구현 난이도 | 낮음 | 중간 |
| LLM 호출 수 | 2~3회 | 3~4회 + 임베딩 모델 |
| 재현성 | 중간 | 높음 |
| 단일 소스 쟁점 처리 | "놓친 쟁점 모으기" 단계 별도 필요 | 자동 관찰 |
| 챌린지 일정 적합성 | 좋음 | 빠듯할 수 있음 |
| 문헌 품질(SC-Taxo 순도) | 검증 사례 적음 | 최고 점수(결합형 62~65) |

**현재 기운 쪽(권장): 방법 B + 2-pass.**
- 근거: 챌린지 마감 있음, Qwen 최저가, 임베딩 인프라 아직 없음.
- 단 **B로 가도 "기준 답이 놓친 쟁점 모으기" 단계는 필수**이고, 그게 곧 "단일 소스 쟁점" 논점의 답이 된다.
- **최종 판단은 사람(=PM)이 내린다.** 이 결정만 확정하면 아래 5·6은 그대로 구현으로 이어진다.

### 왜 "2-pass"가 핵심인가
쟁점을 **먼저 확정하고(1-pass) → 각 AI 답을 나중에 배정(2-pass)**하면, "이 쟁점에 몇 개 AI가 참여했나"가 **결정론적 코드로 자동 카운트**된다. 그러면 아래 표처럼 "몇 대 몇" 문제가 **판단이 아니라 산수**가 되고, Manager는 배정·stance만 내면 된다(판정 규칙은 서버 코드 소유 → 재현성·감사가능성↑).

| provider 수 | 입장 분포 | 처리 |
|---|---|---|
| 3 | 일치 | consensus → 자동 통과 |
| 3 | 2:1 | 충돌 (다수결 자동처리 금지) |
| 2 | 일치 | consensus로 처리하되 미언급 provider 표시 |
| 2 | 불일치 | 충돌 |
| 1 | — | 단일 소스 안건 |

---

## 5. 이번에 확정해야 할 데이터 계약 (SPEC-SCHEMA-001이 여기로 미뤄둠)

공통 Zod 계약이 "이건 Manager Spec에서 확정"이라며 미룬 것들 — **SPEC-AI-002에서 정식화 대상**:
- `Agenda.stances[]` = `{ provider, text, sourceRefs: [{ sourceAnswerId, sectionId }], quote(필수) }` 의 정식 모양.
- `Agenda.sourceRefs[]` = **비교한 "모든" 근거 보존**(선택된 것만 저장 금지 — 3열 비교 화면 재구성용).
- `Agenda.recheckResult` = 재검토 결과의 정식 모양.
- 저장 전 버리는 임시 `reasoning` 필드는 **계약에 넣지 않되** 프롬프트 출력 스키마에는 `kind`보다 앞에 둔다.
- `resolution_reason`에 **단일 소스 쟁점용 신규 값** 추가 여부 결정(2-pass 카운트 결과와 연결).

기존 값(그대로 유지):
- `agenda_status`: draft / conflicted / recheck_requested / reanswered / passed / rejected
- `resolution_reason`(7종): auto_consensus / user_accepted / user_accepted_after_recheck / user_composed / user_composed_after_recheck / user_rejected / user_rejected_after_recheck
- **NO_VALUE 규칙**: `null` = 값 미상, `"NO_VALUE"` = 의도적으로 없음.

---

## 6. 구현 순서 (Claude Code용 Task 후보)

**결정(§4) 확정 후 진행. 앞 단계는 결정과 무관하게 지금도 착수 가능.**

1. **SPEC-AI-002 문서화** — §3 결정 + §4 확정안을 정식 Spec으로. AC(Acceptance Criteria) 먼저.
2. **Zod 계약 확정**(§5) — `packages/shared`에 `stances`·`sourceRefs`·`recheckResult`·quote 반영. Mock/실제가 같은 스키마 만족.
3. **서버 모듈 뼈대** — `apps/api/src/modules/agendas/`(가칭)에 ADR-005 포트 2개(`AgendaClassifier`·`ConflictComparator`) + registry + config 선택 + 버전 스탬프. `/prompts`에 Manager 프롬프트 텍스트.
4. **OpenRouter 어댑터** — Qwen 연결. `response_format: json_schema + strict`, provider 설정 `require_parameters: true`. **Qwen은 `max_tokens` 미설정.** 비스트리밍엔 Response Healing.
5. **2-pass 파이프라인** — (1) 쟁점 목록 확정 → (2) 각 provider 답 배정 → 서버가 provider 카운트로 consensus/conflict 결정(§4 표).
6. **grounding 검증** — quote substring 검사, 실패 stance/빈 Agenda 폐기, `sectionId` enum 제약.
7. **DB 저장 + SSE 이어붙이기** — Agenda를 Secret Key Client + Service 소유권 검증으로 저장(§7). 3사 SSE 뒤에 Agenda 이벤트 실시간 스트리밍. 새로고침 복원용 GET.
8. **web 재배선** — 브라우저 Mock(`buildMockAgendas`) 제거하고 서버 Agenda 소비. 충돌 4액션 UI는 기존 것 재사용.
9. **A/B 실측 항목**(§9) 측정.
10. **QA** — qa-reviewer Agent로 AC별 증거 기반 검증.

---

## 7. 하드 제약 (반드시 지킬 것)

- **2-클라이언트(ADR-002)**: 조회·사용자 행동 = 사용자 JWT + RLS / **AI 시스템 쓰기(Agenda 저장) = Secret Key Client + Service 계층이 검증된 userId로 소유권 확인 후에만.** 클라이언트가 보낸 userId는 신뢰하지 않는다.
- **비밀은 백엔드에만**: `apps/api/.env`는 gitignore. `SUPABASE_*`·`AI_KEY_ENCRYPTION_KEY`·각 AI 키·**OpenRouter 키**는 절대 커밋·프론트 노출 금지. `VITE_` 변수만 공개.
- **모델 최소 티어 고정**: 3사 = Haiku · gpt-5-nano · gemini-flash-lite. Manager = Qwen 최저가.
- **합의는 "사실 판정"이 아니라 "비교 결과"로만** 표현.
- **근거 없는 비교 결과를 정상 데이터로 저장하지 않는다**(§3-7).
- **Cowork(이 세션)는 `docs/`만 쓴다** — 코드는 쓰지 않음. 구현은 Claude Code(로컬), git 커밋은 사용자가.
- 데모 로그인 계정(LoginPage 하드코딩)은 **실서비스 전 제거·회전** 대상.

---

## 8. 파일 포인터

- `docs/domain-policy.md` §4 — Agenda 상태·전이·resolution_reason·재검토·근거 추적
- `docs/data-model.md` §3.5 — `agendas` 테이블(`source_refs`·`selected_source_ref`·`prompt_version`·`recheck_result`), §1.6 NO_VALUE
- `docs/specs/SPEC-SCHEMA-001-core-contracts.md` — 공통 Zod 계약, stance/sourceRefs/recheckResult를 AI-002로 미룬 근거
- `docs/specs/SPEC-AI-001-providers.md` — SourceAnswer 파이프라인·StructuredContent·SSE 배선(이어붙일 지점)
- `docs/decisions/ADR-002-data-access-clients.md`(2-클라이언트) / `ADR-005-ai-pipeline-module-boundaries.md`(포트)
- `docs/growth/09-ai-decision-logic.md` — 조사 전문(논거·표·논문 출처)
- 코드: `apps/api/src/modules/sourceAnswers/`(포트·어댑터 참고 패턴) / `apps/web/src/features/chat/`(`buildMockAgendas`·`mockData.ts`·`ConflictResolveModal.tsx` — 현재 Mock Manager가 화면에 뿌리는 것)

---

## 9. 실측(A/B)이 필요한 열린 리스크

코드가 아니라 **실제 케이스로 측정해야** 정해지는 것들:
- **CoT on/off** — 모델 계열별 효과가 정반대(Claude는 개선, 일부는 악화). Qwen에서 도움되는지 실측 전엔 모름.
- **의미 정렬 품질** — Qwen이 다르게 표현된 같은 주제를 잘 알아보는지.
- **유사도 threshold**(C+D로 갈 경우) — 0.5~0.9 훑어 최적점(문헌 예: 0.8) 탐색.
- **에스컬레이션** — Qwen이 애매하다고 표시한 Agenda만 상위 모델로 올리는 Cascaded Selective Evaluation을 config 레벨에 둘지.
- **Manager 호출 실패·timeout·좌초 정책** — 프로젝트 상시 미결정 항목. 부분 실패 시 done 신호 보장(SPEC-AI-001 패턴 재사용).

---

*이 문서로 개발을 재개하면 된다. §4 결정을 내리면 프롬프트 초안·Zod 스키마가 따라 나오고, 그 결과를 `docs/specs/SPEC-AI-002-manager.md`로 정식화하면서 `growth/09`의 고민을 닫는다.*
