# ShowUp 핵심 기능 시연 스크립트

> **목적:** 이번 주에 만든 기능을 짧게 시연하고, 화면 → 서버 → DB가 한 바퀴 도는 흐름을 보여준다.  
> **소요:** 약 5~7분 (라이브 데모 4분 + 아키텍처 설명 2분)  
> **브랜치:** `N167_채민석` · **기간:** 7/13(월) ~ 7/16(목)

> 역사적 시연 스크립트(2026-07-16). 현재 Spark MVP는 클라이언트 `riskRefresh.ts`로 위험도를 갱신하고, 프로덕션 Cloud Functions는 배포하지 않았다. 최신 시연 전 README의 데모 계정·검증 상태를 확인한다.

---

## 사전 준비

```bash
# 터미널 1 — 앱
npm run dev

# 터미널 2 — Firestore 에뮬레이터 (선택)
firebase emulators:start --only firestore,functions

# 시드 데이터가 없으면
npm run seed   # 또는 src/seeds/upload.ts 실행
```

**시연 계정:** 테스트용 가게 계정 1개 준비  
**주의:** 당시 계획상 `riskStats` 직접 쓰기를 막으려 했으나, 현재 Spark MVP에서는 owner 클라이언트 갱신을 Rules가 허용한다. Functions 에뮬레이터는 이관 검증용이다.

---

## 슬라이드 1 — 오프닝 (30초)

> "ShowUp은 소상공인이 **예약 전에 고객 이력을 확인**하고, 노쇼·사건을 기록해 **다음 판단**에 쓰는 서비스입니다.  
> 오늘은 이번 주에 만든 **핵심 기능 5가지**와, **화면·서버·DB가 한 바퀴 도는 흐름**을 보여드리겠습니다."

---

## 슬라이드 2 — 이번 주에 만든 것 (45초)

| 기능 | 화면 | 핵심 파일 |
|------|------|-----------|
| **인증·가게 생성** | `/login`, `/register` | `auth.ts`, `stores.ts` |
| **고객 검색·등록** | `/customers` | `customers.ts`, `Customers.tsx` |
| **예약 생성·상태 변경** | `/reservations` | `reservations.ts`, `Reservations.tsx` |
| **사건 기록** | `/customers/:id` | `incidents.ts`, `IncidentModal.tsx` |
| **위험도 재계산·경고** | 검색 결과, 상세 | `riskRefresh.ts`, `RiskAlertBanner.tsx` |

> "5일간 인증부터 위험도 재계산까지 **핵심 순환 루프**를 구현했습니다."

---

## 슬라이드 3 — 3계층 구조 (1분)

```
[화면]  React 페이지 + services/*.ts
   ↓  Firebase SDK (읽기/쓰기)
[DB]    Firestore — stores/{uid}/customers|reservations|incidents
   ↓  쓰기 성공 후 클라이언트 재계산
[앱]    riskRefresh.ts — calculateRiskStats
   ↓  riskStats 갱신 (owner의 완전한 스키마 쓰기만 허용)
[화면]  RiskBadge · RiskAlertBanner 다시 표시
```

**강조 포인트**
- `storeId = user.uid` → 가게 간 데이터 격리 (`firestore.rules`)
- 전화번호는 UI에 **마스킹**만 노출 (`010-****-1234`)
- `riskStats`는 현재 owner 클라이언트가 갱신하며, Blaze 이관 후 서버 전용으로 전환

---

## 라이브 시연 — 한 바퀴 (4분)

### Act 1 · 로그인 → 가게 진입 (30초)

1. `/login` 접속 → 이메일/비번 입력 → **로그인**
2. **말하기:** "회원가입 시 Firebase Auth 계정과 `stores/{uid}` 문서가 함께 생성됩니다. 이후 모든 데이터는 이 가게 아래에만 저장됩니다."

**DB 변화:** (이미 가입된 경우 없음)  
`stores/{uid}` — `ownerUid`, `name`, `category`

---

### Act 2 · 고객 검색 (45초)

1. **고객** 탭 → `/customers`
2. 전화 **뒤 4자리** 또는 **이름** 입력 (300ms debounce)
3. 결과 목록: 마스킹 번호 + **RiskBadge**(안심/주의/위험)
4. 노쇼 3회+ 또는 abuse 1회+ → **RiskAlertBanner** 표시
5. 고객 카드 탭 → `/customers/:id`

**화면 → DB**
```
Customers.tsx
  → searchCustomers(storeId, keyword)
  → Firestore: stores/{uid}/customers (name prefix / phoneLast4 쿼리)
  → getCustomer()에서 phone 마스킹 후 반환
```

---

### Act 3 · 예약 생성 (45초)

1. **예약** 탭 → **새 예약** → `/reservations/new`
2. 고객 검색 모달에서 고객 선택
3. 날짜·시간 입력 → **저장**
4. `/reservations` — 오늘 예약 목록에 표시

**화면 → DB**
```
NewReservation.tsx
  → createReservation(storeId, resId, { customerId, date, time, status: 'pending' })
  → Firestore: stores/{uid}/reservations/{resId}
```

---

### Act 4 · 이벤트 기록 (1분)

**방법 A — 예약 상태 변경**
1. `/reservations`에서 해당 예약의 **노쇼** 버튼 탭
2. `transitionReservationStatus(storeId, resId, 'noShow')`

**방법 B — 사건 기록**
1. `/customers/:id` → **사건 기록** → `IncidentModal`
2. 유형 선택 (폭언/분쟁/지각/무리한 요구) + 사실 메모 → 저장
3. `createIncident(storeId, customerId, incidentId, { type, memo })`

**화면 → DB → 위험도 갱신**
```
예약/사건 문서 write
  ↓
riskRefresh.ts
  transitionReservationAndRefresh
  createIncidentAndRefresh
  ↓
calculateRiskStats() — 노쇼 +8, 당일취소 +4, 방문 −1, abuse +10 ...
  ↓
customers/{customerId}.riskStats 업데이트
```

---

### Act 5 · 위험도 반영 확인 (45초)

1. **고객** 탭으로 돌아가 동일 고객 재검색
2. **RiskBadge** 등급·점수 변화 확인
3. 조건 충족 시 **RiskAlertBanner** 재표시
4. 고객 상세 **이벤트 타임라인** — 예약 + 사건 통합 표시

**말하기:** "점수는 참고 지표입니다. 자동 차단은 하지 않고, 사장님이 예약·거절·예약금을 판단합니다."

---

### Act 6 · 보안 한 줄 (15초)

> "타 가게 접근과 불완전한 `riskStats` 쓰기는 Firestore Rules가 거부합니다. 현재 회귀 테스트는 18건 PASS입니다."

---

## 슬라이드 8 — Firestore 구조 (30초, 보조)

```
stores/{storeId}/
  customers/{customerId}     ← name, phone, phoneLast4, riskStats
    incidents/{incidentId}   ← type, memo, occurredAt
  reservations/{resId}       ← customerId, date, time, status
```

---

## 슬라이드 9 — 마무리 (20초)

> "이번 주에 **검색 → 경고 → 예약 → 기록 → 위험도 갱신** 순환을 구현했습니다.
> 다음 주는 대시보드 연동, Functions 이관 준비, 모바일 QA로 데모 완성도를 올립니다.
> 질문 받겠습니다."

---

## Q&A 예상 (짧게)

| 질문 | 답변 |
|------|------|
| 왜 장기적으로 riskStats를 서버에서 갱신하나요? | 조작·경쟁 조건 방지 (`docs/riskStats-strategy.md`) |
| 자동 차단 안 하나요? | 원칙: 참고 지표. 최종 판단은 사장님 |
| 다른 가게 데이터 볼 수 있나요? | `ownerUid` 검증으로 차단 (침투 테스트 1차) |
| Functions 없이 데모 가능? | 가능. 현재 Spark MVP는 클라이언트 `riskRefresh.ts`가 점수를 갱신 |

---

## 시연 체크리스트

- [ ] dev 서버 실행 중
- [ ] (권장) Functions 에뮬레이터 실행
- [ ] 테스트 계정 로그인 확인
- [ ] 시드 데이터 또는 직접 등록한 고객 1명+
- [ ] 노쇼 3회 또는 abuse 1회 조건 맞는 고객 (경고 배너 시연용)
- [ ] PPT: `outputs/showup-core-demo-deck.pptx`
