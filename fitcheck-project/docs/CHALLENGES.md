# FitCheck — 포트폴리오 챌린지 (A안)

> **프로젝트:** FitCheck — 비대면 셀프 케어 + 로컬 오프라인 매칭 O2O 피트니스 플랫폼  
> **스택:** Frontend(React/Vite/TS), Mobile(Expo WebView), Backend(Node.js/Express/TS), DB(Supabase/Postgres)  
> **역할:** 풀스택  
> **구성:** 기술 면접·풀스택 포트폴리오용 **핵심 3건**

| # | 챌린지 | 태그 | 포트폴리오 한 줄 |
|---|--------|------|-----------------|
| 1 | 상담 PII 암호화 + HMAC 조회 | Backend · DB · Security | AES-256-GCM 저장 + HMAC 조회 컬럼으로 보안·검색 동시 확보 |
| 2 | 식단 AI 비동기 분석 | Backend · Frontend · AI | Gemini Vision을 저장 API와 분리, 2초 폴링으로 UX 지연 없이 AI 결과 반영 |
| 3 | PT 시청 기록 기반 헬스장 매칭 | Backend · Frontend · Product | PT 시청 기록·GPS 규칙 매칭으로 O2O 헬스장 추천 근거 제공 |

---

## 1. 상담 PII 암호화 + HMAC 조회

**태그:** `Backend` · `DB` · `Security`

### 🧩 암호화된 PII를 저장하면서 전화번호 조회도 가능하게 만들기

**상황**

지도에서 헬스장·트레이너에게 상담을 신청할 때 이름·연락처·메모 등 PII를 Supabase에 저장해야 했습니다. 개인정보는 DB에 평문으로 두기 어렵고, 동시에 전화번호 기준 중복 확인·조회도 필요했습니다.

**문제의 원인**

AES-256-GCM으로 필드를 암호화하면 요청마다 IV가 달라 같은 전화번호도 ciphertext가 매번 달라집니다. `phone` 컬럼에 인덱스를 걸어도 `WHERE phone = ?` 형태의 등치 검색이 불가능합니다. 암호문을 그대로 인덱싱하는 방식은 근본적으로 조회 키로 쓸 수 없습니다. `topic` 필드도 DB enum 제약과 암호문 저장이 충돌해 스키마 수정이 필요했습니다.

**시도와 해결**

암호문 직접 조회는 포기하고, 조회 전용 `phone_hmac` 컬럼(HMAC-SHA256, 숫자만 정규화)을 추가했습니다. PII 필드는 `encryptField()`로 저장하고, GET 시 `decryptField()`로 복호화합니다. 목록 API(`GET /consult-requests/me`)는 `maskPhone()`으로 `010-****-5678` 형태만 노출합니다. 기존 평문 row는 `v1:` prefix 없이 legacy로 읽히도록 호환 처리했습니다.

**결과**

PII는 앱 레벨 암호화로 DB에 평문이 남지 않고, `phone_hmac` + 인덱스로 전화번호 기준 조회·중복 확인이 O(1)에 가깝게 동작합니다. 상담 신청·내 상담 조회·트레이너 상세 조회 흐름에서 암·복호화가 Express 레이어에서만 수행됩니다.

**배운 점**

"암호화"와 "검색 가능"은 한 컬럼으로 동시에 만족하기 어렵습니다. AEAD로 기밀성을 확보하고, HMAC 등 별도 deterministic 컬럼으로 조회 키를 분리하는 패턴이 실무에서 자주 쓰입니다.

**한 줄 요약**

> 상담 PII를 AES-256-GCM으로 암호화하고, 전화번호 조회용 HMAC 컬럼·인덱스를 분리해 보안과 검색 성능을 함께 확보했습니다.

**면접 꼬리질문**

1. AES-GCM IV가 매번 달라지면 `WHERE phone = ?`가 왜 불가능한가?
2. HMAC pepper를 DB와 분리해 두는 이유는?

---

## 2. 식단 AI 비동기 분석

**태그:** `Backend` · `Frontend` · `AI/External API`

### 🧩 Gemini Vision 12초 대기를 1~2초 체감 저장으로 바꾸기

**상황**

회원이 식단 사진을 올리면 Gemini Vision으로 탄단지·칼로리와 피드백을 생성하는 기능을 만들었습니다. 초기에는 `POST /meals` 안에서 AI 호출까지 끝낸 뒤 응답하는 방식을 검토했으나, Vision API가 수 초~45초까지 걸려 저장 버튼을 누른 뒤 화면이 오래 멈추는 문제가 예상되었습니다.

**문제의 원인**

Gemini Vision 분석은 네트워크·이미지 fetch·모델 추론이 합쳐져 HTTP 요청 하나의 타임아웃 안에 안정적으로 끝낼 수 없었습니다. 분석 실패 시에도 식단 기록 자체는 남겨야 했기 때문에, 동기 처리로는 UX와 안정성을 동시에 맞추기 어려웠습니다. 업로드와 DB insert가 분리되어 있어 Storage URL 없이 meal row만 생기는 경우도 막아야 했습니다.

**시도와 해결**

동기 응답 방식은 사용자 체감 지연 때문에 제외했습니다. 대신 `createMealLog`에서 DB INSERT 직후 201을 반환하고, `queueMealAiAnalysis`로 백그라운드 분석을 fire-and-forget 실행하도록 바꿨습니다. 프론트는 `aiAnalysisPending` 플래그가 있는 항목을 2초 간격·최대 90초까지 폴링해 타임라인을 갱신합니다. 사용자가 탄단지를 직접 입력한 경우에는 AI가 macros를 덮어쓰지 않도록 `hasExplicitMacros`로 분기했습니다.

부가적으로 다음을 같은 흐름에 묶었습니다.

- **업로드 파이프라인:** `POST /uploads/meals` → public URL → `POST /meals` → 조건부 AI 큐(`shouldQueueMealAiAnalysis`)
- **클라이언트 리사이즈:** 업로드 전 768px JPEG 압축(`resizeMealImage.ts`)으로 업로드·분석 시간 단축
- **Gemini fallback:** 모델 404 시 fallback 체인, 45초 타임아웃, JSON 파싱 방어(`mealAi.service.ts`)

**결과**

식단 저장은 API 응답 기준 1~2초 이내로 완료되고, AI 결과는 타임라인에서 순차적으로 채워집니다. 분석 실패 시에도 기록은 유지되며, `aiFeedback`에 오류 메시지가 남아 사용자가 재시도 여부를 판단할 수 있습니다. API 키가 없으면 AI 큐 자체를 건너뛰어 식단 CRUD만 정상 동작합니다.

**배운 점**

외부 AI API를 붙일 때는 "저장"과 "분석"을 분리하고, 클라이언트에는 pending 상태를 명시적으로 노출하는 편이 낫습니다. 폴링은 WebSocket 대비 구현이 단순하고, 90초 상한을 두면 무한 대기를 막을 수 있습니다. LLM 연동에는 모델 fallback·타임아웃·graceful degradation을 기본으로 두는 것이 안전합니다.

**한 줄 요약**

> Gemini Vision 식단 분석을 저장 API와 비동기 분리하고 2초 폴링으로 UX 지연 없이 AI 결과를 반영했습니다.

**면접 꼬리질문**

1. 폴링 대신 WebSocket/SSE를 쓰지 않은 이유는?
2. AI 분석이 실패해도 meal row는 왜 유지하나?

---

## 3. PT 시청 기록 기반 헬스장 매칭

**태그:** `Backend` · `Frontend` · `Product/Algorithm`

### 🧩 "가까운 헬스장"이 아니라 "맞는 헬스장"을 추천하기

**상황**

회원이 PT 강좌를 본 뒤 주변 헬스장을 추천하는 O2O 매칭 기능을 구현했습니다. GPS로 가까운 헬스장만 보여주는 것만으로는 "왜 이 헬스장인지" 설명이 부족했고, 강좌를 아직 보지 않은 신규 사용자도 지도를 쓸 수 있어야 했습니다. 프론트는 Naver Map SDK와 GPS로 사용자 위치를 받아 `GET /gyms/recommended`에 lat·lng를 전달합니다.

**문제의 원인**

추천에 LLM을 쓰면 비용·지연·일관성 문제가 생깁니다. 시청 기록(`course_views`)이 없는 사용자에게 specialty·헬스장 타입 점수를 그대로 주면 근거 없는 높은 점수가 나옵니다. 반대로 로그인·시청 후에는 goal·body_part와 트레이너 specialty를 연결해 설명 가능한 추천이 필요했습니다.

**시도와 해결**

Gemini 기반 추천은 제외하고 `gymRecommendation.service.ts`에 규칙 기반 점수(거리 40 + specialty 40 + 헬스장 타입 20)를 설계했습니다. `course_views`를 upsert로 누적하고, `getCourseActivity`에서 최근 30건으로 관심 프로필(topGoals, topBodyParts)을 만듭니다. `optionalAuth`로 비로그인 사용자는 거리 점수만, 로그인·시청 후에는 specialty·타입 점수가 추가됩니다. 매칭 이유 문구(`matchReasons`)를 API 응답에 포함해 지도·홈 UI에서 그대로 노출합니다.

**결과**

강좌 미시청 시 최대 약 40점(거리 위주), 시청 후 최대 100점까지 차등 반영됩니다. 추천 근거가 "다이어트·하체 강좌 3회 시청 — 1:1 PT숍 추천"처럼 문장으로 표시되어, 사용자·트레이너 모두 결과를 이해할 수 있습니다. Naver Map + GPS로 받은 위치와 백엔드 매칭 점수가 `/user/map`에서 한 흐름으로 연결됩니다.

**배운 점**

초기엔 AI 추천을 고려했지만, 설명 가능성과 비용을 우선하면 도메인 규칙 + 행동 로그 집계가 더 적합한 경우가 많습니다. 게스트/회원 분기는 middleware(`optionalAuth`)와 서비스 레이어에서 interest profile empty 처리로 일관되게 맞추는 것이 중요합니다.

**한 줄 요약**

> PT 강좌 시청 기록과 GPS를 규칙 기반 100점 체계로 합쳐, 로그인 전·후 차등 헬스장 매칭과 추천 사유 노출을 구현했습니다.

**면접 꼬리질문**

1. LLM 추천 대신 규칙 기반을 선택한 기준은?
2. 비로그인 사용자에게 specialty 점수를 0으로 둔 이유는?

---

## 이력서용 한 줄 3종 세트

포트폴리오·이력서에 그대로 붙여 넣을 수 있는 버전입니다.

1. Gemini Vision 식단 분석을 비동기 분리·폴링으로 UX 지연 없이 반영
2. 상담 PII AES-256-GCM + HMAC 조회 컬럼으로 보안·검색 성능 동시 확보
3. PT 시청 기록·GPS 기반 규칙 매칭으로 O2O 헬스장 추천 근거 제공

---

## 관련 문서

- [docs/README.md](./README.md) — 아키텍처·데이터 흐름
- [backend/README.md](../backend/README.md) — PII 암호화·헬스장 매칭 점수 상세
