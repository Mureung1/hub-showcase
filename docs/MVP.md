# MVP 범위 정의

> 이 문서의 In/Out 표가 AGENTS.md "MVP 범위 밖 기능 구현 금지" 규칙의 판단 기준이다. 주차별 실행 계획은 docs/PLAN.md, 현재 내부 진단은 docs/PRODUCT_REVIEW.md. 변경 이력·근거는 docs/LOG.md 참고.

## In — MVP에 포함

| # | 기능 | 범위 상세 |
|---|---|---|
| 1 | 시나리오 선택 | 4개 카드 고정 (팀플·조모임 / 교수님·조교님 / 선배·동기 / 친구·연인) — 카드마다 냥이 조력자 네이밍(팀플냥·교수냥·선배냥·연인냥, SPEC 1장) |
| 2 | 톤 결과 | 톤 사전 선택 UI 없음. **후보 3개 = 톤 3단계 공통 라벨(기본/더 부드럽게/더 분명하게), 기본이 첫 번째** (SCREENS.md 핵심 결정 1) |
| 3 | 입력 | 가이드형 대화 셸에서 답장/먼저 연락 → 관계 → 상황 카드 → **카드별 질문 정확히 1개** 순으로 선택하는 것이 기본. 맞는 카드가 없거나 구체 사실이 필요하면 **"내 상황을 직접 설명하기"**로 목적 6종+모드별 텍스트 입력(S2-b) 후 AI 생성 |
| 4 | 보낼 말 생성 | **하이브리드**: 카드+빠른 답변=`guided_ai`, 질문 없이 바로 초안=`template_fallback`, 직접 설명=`manual_ai`. AI는 1회 호출로 톤 3개를 구조화 출력하고, guided 실패는 같은 카드 정적 초안으로 정직하게 fallback한다. **입력에 없는 사실 생성 금지** (SPEC 2~5장) |
| 5 | 결과 복사 | 후보별 복사 버튼 + 복사 실패 폴백 ([EDGE_CASES 3-1]). **복사 = 핵심 과업 완료** |
| 6 | 상태 처리 | 로딩 / 실패(재시도) / 자리 표시자 하이라이트·안내 ([EDGE_CASES 2-1, 2-3]) |
| 7 | 콘텐츠 | AI few-shot 시드 24개는 T16 제3자 블라인드 정렬·전송 가능성 검수 완료 뒤 T19 서버 카탈로그로 이관했다. 상황 카드 288문구(4관계×6상황×4말투×3톤)는 T25 관계 호칭·완결성·사실 충실성·톤·모드 전수 검수를 통과했다(hard fail 0/288, 톤 정렬 96/96, 전송 가능 231/288, 하위관계 호환 288/288). 결정적 템플릿 엔진·manifest·checksum을 통한 운영 자산 전환은 T26 |
| 8 | 비식별 흐름 계측 | `result_shown/refinement_opened/regeneration_requested/copy_succeeded/situation_change` 5종만 Vercel Function→Neon에 best-effort 기록한다. 원문·후보·수정문·IP·user/session/device ID는 금지하며 event 수를 실제 사용자 funnel·전송·효과로 해석하지 않는다 (T36, SPEC 7장) |
| 9 | 대화형 표현 | 내부 S0~S3 상태·라우팅 계약은 유지하고, 냥이 발화·이전 선택 요약·빠른 답변으로 표현한다. 선택 턴은 AI를 호출하지 않으며 전체 자유 대화·대화 히스토리 저장은 도입하지 않는다 (SCREENS, T28) |
| 10 | 냥이 캐릭터 표현 | 사용자가 제공한 캐릭터 에셋을 Three.js + React Three Fiber의 **단일 Canvas**에서 2.5D로 표현한다. 대기·선택·생성·결과에 짧은 상태 반응만 제공하고, `prefers-reduced-motion`·WebGL 실패·저사양 환경에서는 같은 에셋의 정적 이미지로 대체한다 (T29) |
| 11 | 백엔드·DB | Vercel Function `/api/generate`와 `/api/interaction`이 생성과 strict 비식별 event를 분리한다. Neon PostgreSQL + Drizzle은 T30 핵심 네 테이블, retrieval metadata, interaction event에 **원문 없는** 버전·실행·평가·document embedding·집계 행동만 저장한다 (T18, T30, T35~T36) |
| 12 | AI 생성 워크플로 | guided/manual 두 AI route가 provider를 **1회 호출**하고 톤 후보 3개를 구조화 출력으로 받는다. 서버가 guided ID를 정본 카탈로그로 해석하고 schema·금지 표현을 검증한다. 검수 예시 retrieval은 비프로덕션 합성 offline 평가까지만 포함하며 운영은 static selector다. 자율 도구 호출·메모리·런타임 멀티에이전트는 사용하지 않는다 (T34~T35) |
| 13 | 개인 말투 프리셋 | 카드 guided 경로는 저장된 선택 또는 관계 안전 기본값을 사용하고, 직접 설명은 요청 전에 `습니다체 / 요체 / 이다체 / 용용체` 중 하나를 고른다. 현재 탭 30분 상태에만 보존하며 세 톤과 별도 축이다 (T32, T34) |
| 15 | 검수 예시 retrieval 실험 | Git 검수 예시 정본에 stable ID/version/mode를 붙이고, metadata-only pgvector exact top-2·Voyage adapter·static fallback·coverage activation guard·합성 offline 평가 기반을 구현한다. 사용자 원문과 query vector는 저장하지 않고 운영 `/api/generate`에는 연결하지 않는다 (T35) |
| 16 | 결과 중심 다듬기 | S3에서 같은 카드 질문을 인라인으로 열고, 성공한 교체의 직전 1세트 비교·복원과 후보 로컬 직접 수정·원문 복원을 제공한다. 수정문은 서버로 보내지 않으며 여러 세대 history·자유 follow-up chat은 만들지 않는다 (T36) |
| 14 | 교수·조교 이메일 형식 | 교수·조교 관계에서만 `메신저 / 이메일`을 고른다. 이메일은 습니다체 고정·전용 6상황·안내 입력을 거쳐 `정석 / 더 정중하게 / 더 간결하게` 제목+본문 3후보를 로컬 정적 템플릿으로 제공한다. 실제 발송·이메일 AI 생성은 제외한다 (T33) |

## Out — MVP에서 제외 (이후 단계)

| 기능 | 제외 사유 |
|---|---|
| 피드백 수집·예시 DB 누적 | PRD에서도 이후 단계 후보. 피드백 시점·오염 문제([EDGE_CASES 4-x])가 먼저 정리되어야 함 |
| 회원가입 / 로그인 | 사건 발생형 재사용 가설은 외부 파일럿으로 먼저 검증. 익명 MVP에 영구 식별자를 추가하지 않음 |
| 생성 히스토리 저장 | 프라이버시 기준 미확정 상태에서 저장 최소화 |
| 시나리오/톤 커스텀 추가 | 4개 고정이 "구조화된 입력" 가치의 전제 |
| 시나리오-입력 불일치 감지 | [EDGE_CASES 1-4] |
| 완전한 3D 모델·복합 애니메이션 | 리깅된 전신 GLB, 물리 효과, 장면별 다중 Canvas, 자유 회전·이동은 에셋·성능 범위가 커서 제외. MVP는 제공 이미지 기반 2.5D 상태 반응과 정적 폴백까지 |
| retrieval 운영 활성화·ANN·reranker·런타임 멀티에이전트 | 현재 24개 corpus는 목적 coverage가 부족하다. 합성 offline static A/B와 별도 개인정보·provider 고지를 통과하기 전 실제 사용자 query retrieval, HNSW/IVFFlat, reranker, agent loop는 도입하지 않는다 |
| 템플릿 슬롯 자동 채움 (사용자 입력 병합) | 오병합이 빈칸보다 위험 — 자리 표시자 하이라이트(T11)로 사용자 채움 안내 (SPEC 4장) |
| 결제 | AGENTS.md 절대 금지 |

## 결정 완료

| 항목 | 결정 | 근거 |
|---|---|---|
| AI 연동 방식 | **목(mock)으로 UI 먼저 완성 → Vercel 서버리스 함수 `/api/generate`의 단일 구조화 생성 워크플로로 Gemini API 호출** | 프론트 직접 호출은 API 키 노출로 금지 ([EDGE_CASES 5-1]). 관계·목적·입력이 이미 확정되므로 자율 agent loop 대신 1회 생성+결정적 검증을 사용한다. 요청/응답 계약·프롬프트 구조는 SPEC.md 2~3장 |
| 데이터 계층 | **Neon PostgreSQL + Drizzle ORM** | 프롬프트·템플릿 버전과 원문 없는 실행/평가 메타데이터를 관리한다. DB 도입이 사용자 원문·생성 문구·히스토리 저장을 허용하지는 않는다 (SPEC 2장) |
| 캐릭터 렌더링 | **Three.js + React Three Fiber, 제공 에셋 기반 2.5D 단일 Canvas** | 냥이를 장식 이미지가 아니라 단계에 반응하는 조력자로 표현하되 모바일 성능·접근성을 위해 정적 폴백과 reduced-motion을 필수로 둔다 |
| 배포 환경 | **Vercel** | Vite 정적 빌드 + `/api` 서버리스 함수가 한 저장소·한 배포로 해결. API 키는 Vercel 환경변수로 서버 보관. `/api/interaction`의 Preview `waitUntil()` 수명주기는 T24에서 별도 확인 |
| AI 모델 선택 | **`gemini-3.1-flash-lite`부터 holdout 평가 후 합격하는 가장 빠르고 저렴한 Gemini 모델** | 상위 모델 고정은 짧은 실시간 문구에 과할 수 있다. T21에서 동일한 비시드 holdout으로 톤·전송 가능성·환각·지연·비용을 비교하고, 미달할 때만 상위 모델로 올린다 |
| 엣지케이스 범위 | **MVP 코드 처리 13개 확정** | 상세 목록은 EDGE_CASES.md "MVP 대응 범위 확정" 표 |
| 서비스 정의 | **"상황과 관계에 맞는 메시지 작성 도우미"** — 받은 메시지가 있으면 답장, 없으면 먼저 보내는 메시지를 생성 | 시나리오 4개를 관계형으로 재명명(위 In-표), 사용자 노출 문구는 "답장" 대신 "보낼 말"로 통일(CTA: "보낼 말 3가지 만들기") |
| 하이브리드 생성 | 명시적 route 계약 — **카드 답변=guided AI, 바로 초안=template fallback, 직접 설명=manual AI** | 카드 속도를 유지하면서 선택한 핵심 의도를 실제 생성에 반영한다. 템플릿은 즉시 응답·장애 fallback·평가 기준선으로 유지한다 |
| 콘텐츠 구성 | 시드 24개(AI few-shot 전용) + 상황 카드 템플릿 288개(카드 경로 전용) — **서로 독립적으로 작성**(파생 관계 아님) | SPEC 4장. 288문구는 T25 전수 검수를 통과했다. 결정적 컴파일러·manifest·checksum을 통한 운영 자산 전환은 T26 |
| 결과 다듬기 | **현재 후보를 잃지 않는 S3 인라인 다듬기 + 직전 1세트 복원 + 로컬 직접 수정** | 경쟁 서비스의 Original/Undo·Keep/Discard 패턴을 답냥이의 관계·카드 구조에 맞게 제한 적용한다. 효과는 T22에서 별도 검증 |

신규 구현 항목: CHECKLIST T25~T33에 T34(카드별 guided context 흐름) · T35(검수 예시 retrieval offline 실험)을 추가한다.

## MVP 완료 기준 (Definition of Done)

- 4개 시나리오 각각에서 "방식 → 관계 → 상황 카드 → 질문 1개(또는 바로 기본 초안/직접 설명) → 톤 3개 → 복사"가 모바일에서 동작한다. 기본 초안 결과는 같은 카드 context로, guided 실패 fallback은 같은 answer로 AI 재시작할 수 있고 더 구체적일 때만 직접 설명으로 이동한다.
- API 실패 시 재시도 UI가 노출됨 (목 단계에서는 강제 실패 케이스로 확인)
- 제공 에셋이 Three.js 단일 Canvas에서 상태에 맞게 보이고, reduced-motion·WebGL 실패에서는 동일 흐름을 막지 않는 정적 이미지가 표시됨
- `/api/generate`가 브라우저에 provider 키를 노출하지 않고 guided/manual AI의 단일 호출→구조화 검증을 수행하며, 카드 질문 ID를 서버 정본으로 해석함
- DB migration과 서버 데이터 계층 테스트가 통과하고, T30 핵심 네 테이블과 `retrieval_examples`에 허용 필드만 존재하며 사용자 원문·생성 문구·query vector·영구 사용자 ID가 저장되지 않음
- 실 AI 입력 화면에서 외부 provider 전송과 당시 보존 조건이 안내됨
- `RESEARCH_REVIEW.md`의 문헌 근거·과해석 경계를 반영하고, T25 대표 12문구 뒤 `COMPETITIVE_VALIDATION.md`의 무참여자 모델 벤치마크가 **`Provisional Go`를 통과함**. 이 판정은 provider 비종속 서버·DB 기반 구현을 막지 않으며, Iterate/No-go면 T20 실 provider 품질 진행과 T22~T23 출시 판정을 보류함
- T22의 긴 인터뷰 없는 외부 과업에서 평소 ChatGPT/Gemini와 유효 짝비교를 완료한 대학생 5명을 확보하고 카드 4개 중 3개 이상과 실 AI 1개 무도움 완료·시간·개인정보 이해·“내 말 같다”를 기록함 (PRODUCT_REVIEW)
- 카드 경로는 T22에서 평소 쓰는 ChatGPT/Gemini와 비교하고, 실 AI 경로는 답냥이 단독 사용성을 검증해 **최종 `Go`를 통과함**. Iterate/No-go면 T23·출시를 보류하고, 그 전에는 범용 AI 대비 우월성을 주장하지 않음
- `/api/interaction`과 `interaction_events`가 5개 allowlist event만 best-effort 기록하고 원문·후보·수정문·IP·user/session/device ID를 받거나 저장하지 않음 (SPEC 7장)
- 테스트 통과 (AGENTS.md: 테스트 없이 완료 선언 금지)
