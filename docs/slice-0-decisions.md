# Slice 0 — 스캔 → 조회 → 등록/미등록 분기 (설계 결정 기록)

전체 흐름의 허브 노드(`바코드로 상품 조회`)만 먼저 세운 단계. 입고/출고는 다음 Slice.

## 1. 이 Slice에서 확정한 것

### 데이터 스키마 (동기화 친화적)

| 엔티티 | 위치 | 비고 |
|---|---|---|
| `Product` | `packages/core/src/types.ts` | 이번 Slice에서 조회 |
| `Lot` | `packages/core/src/types.ts` | 타입만 정의, 조회/생성 안 함 |

Dexie 스토어 선언 (`apps/web/src/db.ts`):

```
products: 'id, &barcode, updatedAt'
lots:     'id, productId, expiryDate, updatedAt'
```

### ID 전략 — 클라이언트 생성 UUID

- PK는 `crypto.randomUUID()` 로 **클라이언트가** 생성한 string. auto-increment(`++id`) **금지**.
- 이유: 로컬(IndexedDB)에서 만든 레코드가 서버(MySQL)로 동기화될 때 같은 ID를 유지해야 매핑 충돌이 없다. MySQL 측은 이 UUID를 `CHAR(36)` 또는 `BINARY(16)` PK로 받는 전제.
- 생성 로직을 `packages/core` (`newId()`, `now()`)에 두어 web/mobile이 동일 전략을 공유한다.

### `expiryDate`는 Date가 아니라 `'YYYY-MM-DD'` 문자열

- 직렬화·표시가 쉽고, **문자열 사전순 = 날짜순**이라 이후 FEFO 정렬에 안전.
- MySQL `DATE` 컬럼과 호환.

### 재고 수량은 Lot에만 둔다

- `Product`에는 수량 필드가 없다. **Product 총재고 = Lot들의 수량 합(파생값)**.
- 원장을 Lot으로 단일화 → FEFO 모델과 일관성 유지.

### 로컬 우선(local-first)

- IndexedDB(Dexie)가 UI의 1차 데이터 소스. MySQL·동기화는 이후 Slice.
- Slice 0은 서버·API·동기화 로직(dirty 플래그·soft-delete·충돌 해소) 일체 없음.
  단, `updatedAt`을 미리 스키마에 넣어 이후 동기화 판단에 쓸 수 있게 했다.

## 2. 저장소 레이아웃 결정 — pnpm 워크스페이스

스펙은 "monorepo 여부 미확정, 우선 독립 실행 가능한 단일 Vite 앱"이었으나,
이번에 **pnpm 워크스페이스로 확정**한다(사용자 결정).

```
hub/                      # 챌린지 허브 (GitHub 루트)
  sherpa-app/             # Sherpa 워크스페이스 루트 (앱 코드 없음, 오케스트레이션만)
    pnpm-workspace.yaml
    package.json
    apps/
      landing/            # 기존 아이디어 소개 랜딩 (루트에서 이사)
      web/                # ← Slice 0 앱 (React + TS + Vite + Dexie)
      # mobile/           # (예약) 이후 React Native/Expo — 지금은 만들지 않음
    packages/
      core/               # 도메인 타입 + 공유 유틸(id/시각) — web/mobile 공유
    docs/
```

- `packages/core`는 지금은 **타입 + 얇은 유틸만**. **FEFO 구현은 Slice 1**에서 같은 패키지에 추가한다(지금 넣으면 검증 못 하는 죽은 코드).
- `apps/mobile`은 지금 스캐폴딩하지 않고 자리만 예약.
- `@sherpa/core`는 빌드 스텝 없이 TS 소스로 직접 소비(Vite alias + tsconfig paths).

## 3. 상태 관리

- 이 규모엔 `useState`로 충분 — 상태 관리 라이브러리 미도입.

## 4. 도메인 용어집 (코드는 영어, 매핑은 여기)

| 코드(영어) | 도메인(한국어) | 의미 |
|---|---|---|
| Product | 상품 | 바코드로 식별되는 품목 |
| Lot | 배치 | 한 번의 입고 단위(유통기한·수량을 가짐) |
| barcode | 바코드 | 조회 키 |
| inbound | 입고 | 새 Lot 생성·재고 증가 (다음 Slice) |
| outbound / consume | 출고·소진 | FEFO 차감·재고 감소 (다음 Slice) |
| FEFO | 선입선출(유통기한 기준) | First-Expired-First-Out |

## 5. 임시(제거 예정) 요소

- `apps/web` 하단의 "테스트용 등록 바코드" 안내(`App.tsx`의 `.devhint`)는
  등록/미등록 두 분기를 눈으로 확인하기 위한 **Slice 0 검증용 임시 UI**다. 실사용 화면 아님.
