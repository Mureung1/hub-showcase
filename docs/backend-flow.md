# 영수증 업로드 백엔드 흐름 (F1~F3)

`docs/plan.md`의 F1~F3(영수증 업로드 → OCR → 파싱/저장)를 실제로 어떻게 구현했는지 정리한 문서. 코드는 `SpendMate/be/src/main/java/com/spendmate/` 아래 `controller`, `service`, `domain` 패키지 참고.

---

## 1. 전체 흐름 (2단계로 분리됨)

원래는 업로드 즉시 자동으로 DB에 저장하는 구조였는데, `docs/plan.md` 6.1의 "사용자는 오분류를 수동으로 수정할 수 있어야 한다"는 요구사항 때문에 **"미리보기(upload) → 확정(confirm)"** 2단계로 분리했다.

```
1) POST /api/receipts/upload
   파일 저장 + 클로바 OCR 호출 + 파싱까지만 하고, Expense는 저장 안 함
   → 파싱된 결과(상호명/품목/금액)를 응답으로 돌려줌 (미리보기)

2) (fe에서 사용자가 결과를 보고, 필요하면 수정)

3) POST /api/receipts/{id}/confirm
   사용자가 확인/수정한 items를 그대로 body로 보내면, 그때 진짜 Expense로 저장
```

## 2. API 스펙

### `POST /api/receipts/upload`

| 파라미터 | 설명 |
|---|---|
| `file` (multipart) | 영수증 이미지 (jpg/png) |
| `sourceType` (query, 선택) | `PAPER_RECEIPT`(기본값) 또는 `ORDER_SCREEN` |

**응답 (200)**
```json
{
  "receiptId": 2,
  "ocrStatus": "SUCCESS",
  "storeName": "농협하나로마트광주점",
  "spentAt": "2026-07-12T00:00:00",
  "items": [
    { "name": "P대파(흙대파)/1단/망(봉)/국산", "amount": 2480 },
    { "name": "할인", "amount": -1500 }
  ]
}
```
- 이미지가 아닌 파일이면 **400** 응답
- OCR 자체가 실패하면 `ocrStatus: "FAILED"`, `items`는 빈 배열

### `POST /api/receipts/{id}/confirm`

**요청 body**
```json
{
  "spentAt": "2026-07-12T00:00:00",
  "items": [
    { "name": "P대파(흙대파)/1단/망(봉)/국산", "amount": 2480 }
  ]
}
```
`items`는 upload 응답을 그대로 보내도 되고, fe에서 사용자가 이름/금액을 고친 값을 보내도 됨 (이게 "오분류 수동 보정" 기능의 실체).

**응답 (201)**: 저장된 Expense 목록 (`id`, `itemName`, `amount`)

---

## 3. OCR 파싱 로직 — 왜 이렇게 짰는지

영수증은 마트/편의점/배달/쇼핑 등 종류와 상관없이 **품목 단위로 쪼개지 않고, 상호명 + 총액 + 카테고리 한 줄(`ExpenseDraft` 1개)로만 저장**한다. 원래는 마트 영수증만 좌표 기반으로 품목을 쪼개고, 이후 Claude API로 품목명/가격을 추출하는 로직(`ClaudeItemExtractor`)까지 있었지만, 품목명을 소비하던 기능(레시피 추천 F11, 최저가 비교 F15)이 2주차 멘토링 피드백으로 스코프에서 완전히 제외되면서 품목 단위 데이터 자체가 필요 없어져 관련 코드를 모두 걷어냈다 (상세: [plan.md](./plan.md) 5-3).

### 3-1. 금액 인식 패턴

`MONEY_PATTERN`은 `1,234` 형태(콤마 구분)만 인식하고, `"원"`이 붙은 형태(`1,234원`, 배달앱 캡처 등에서 자주 나옴)도 인식하도록 되어있다. 콤마 없는 순수 숫자(`380`처럼 1000원 미만 단가)는 의도적으로 인식 대상에서 제외한다 — 그래야 품목코드나 수량 같은 다른 숫자와 안 헷갈린다.

---

## 4. 카테고리 자동분류 (F4)

`CategoryClassifier`가 상호명 텍스트에 브랜드 키워드가 있는지 검사해서 `Category`를 정한다.

- 검사 순서가 중요함: `CONVENIENCE_STORE`를 `MART`보다 먼저 검사한다. 안 그러면 "이마트24"가 `MART`의 "마트" 키워드에 먼저 걸려서 편의점인데 마트로 잘못 분류된다.
- 상호명에서 못 찾으면: `ORDER_SCREEN`(주문내역 캡처)은 배달인 경우가 대부분이라 `DELIVERY`로 추정하고, 그 외(`PAPER_RECEIPT`)는 `OTHER`로 둔다.
- `upload()`에서 영수증 하나당 한 번만 분류해서, 영수증당 항상 1개 생성되는 `ExpenseDraft`(`{name, amount, category}`)에 그 카테고리를 붙인다. fe가 받은 값을 그대로 `confirm()`에 넘기면 그 카테고리로 저장된다.

### `POST /api/expenses` (F12, 영수증 없는 지출)

영수증/캡처가 없는 지출(현금, 계좌이체, 더치페이 등)을 직접 입력하는 API. `/api/receipts/{id}/confirm`과 별도 엔드포인트로 분리했다 — 이쪽은 애초에 `Receipt`가 없으니 confirm을 억지로 재사용하면 `receipt` 관련 로직(존재 확인, sourceType 기반 inputType 결정 등)이 전부 무의미해지기 때문. 대신 사용자가 fe에서 직접 고른 카테고리를 그대로 받아서 저장한다 (자동분류 없음 — 이미 사람이 골랐으니까).

**요청 body**
```json
{ "amount": 3200, "category": "CONVENIENCE_STORE", "memo": "GS25 삼각김밥", "spentAt": "2026-07-15T00:00:00" }
```
**응답 (201)**: 저장된 Expense (`id`, `itemName`, `amount`, `category`, `spentAt`). `amount`가 없거나 0이면 400.

fe `FormStep`의 카테고리 버튼(외식/카페/식료품/편의점/교통/구독)은 백엔드 `Category` enum과 이름이 1:1로 안 맞는다. 매핑은 `AddExpenseScreen.tsx`의 `BASE_CATEGORIES.backendCategory`에 있음 — 카페→`CAFE`, 식료품→`MART`, 편의점→`CONVENIENCE_STORE`처럼 대응되는 것만 매핑하고, 외식/교통/구독처럼 백엔드에 대응 enum이 없는 건 전부 `OTHER`로 보낸다 (아래 한계 참고).

## 5. 알려진 한계 (다음에 개선할 것)

- 상호명 추출이 완벽하지 않음 (노이즈 단어 필터링 정도만 되어있음)
- 브랜드 키워드 목록이 수동으로 나열한 것이라 목록에 없는 브랜드는 전부 `OTHER`(또는 `ORDER_SCREEN`이면 `DELIVERY`)로 떨어짐 — 키워드는 실제 사용하면서 계속 보강해야 함
- fe `FormStep`의 "외식"/"교통"/"구독" 카테고리는 백엔드 enum에 대응하는 값이 없어서 전부 `OTHER`로 저장됨 (자기가 새로 추가한 커스텀 카테고리도 마찬가지)
- 시드 유저(`SEED_USER_ID = 1L`) 하드코딩 — 실제 로그인 붙으면 교체 필요 (`ReceiptService`, `ExpenseService` 둘 다)
- 같은 영수증을 여러 번 업로드해도 중복 체크 안 함
