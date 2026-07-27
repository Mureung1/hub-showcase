# Security Test Scenarios (ShowUp)

## 1. Unauthenticated Access
- Attempt to read any `/stores/{storeId}` collection without authentication.
- Expected: **Permission denied**.

## 2. Cross‑Store Read
- Authenticated as user A (owner of Store A). Try to read `/stores/StoreB/...`.
- Expected: **Permission denied**.

## 3. Owner UID Spoofing
- Attempt to write a new store document with a forged `ownerUid` that does not match `request.auth.uid`.
- Expected: **Permission denied**.

## 4. Invalid Incident Type
- Submit an incident with `type` = `spam` (not in the whitelist).
- Expected: **Permission denied** by rule validation.

## 5. Phone Number Exposure
- Query a customer document and try to retrieve the full `phone` field from the client UI.
- Expected: The UI should only receive `phoneMasked`; any attempt to read `phone` directly should be blocked by service layer masking.
- **기준 정의**: Firestore Rules는 필드 단위 읽기 제한을 지원하지 않음. 따라서:
  1. `getCustomer()` 서비스 함수는 `CustomerSearchResult` (phoneMasked만 포함)를 반환 — 원본 `phone` 필드 미반환
  2. FE 컴포넌트는 `phoneMasked`만 사용 — `customer.phone` 직접 참조 금지
  3. 보안 세션은 코드 검색으로 누락 0건 확인 (4일차 완료)

## 6. Deletion Cascade
- Delete a customer document and verify that all sub‑collections (`reservations`, `incidents`) are also removed.
- Expected: All related documents are deleted; no orphan data remains.

## 7. RiskStats Write Restriction
- From the client, attempt to update `riskStats` directly.
- Expected: **Permission denied** – only Cloud Function service account may write.

## 8. Compliance Check – "Blacklist" Term
- Search the codebase for the string `blacklist`.
- Expected: No occurrences in code/UI; the term is replaced with "risk indicator" or similar.
- **13일차 (7/27) 최종 재확인**: 코드/화면 0건, 보안 문서 내 금지 규정 언급 2건만 존재.

## 9. Owner UID Spoofing on Customer Update
- Attempt to update a customer's `phoneLast4` without also updating `phone`.
- Expected: **Permission denied** — `phoneLast4` must be accompanied by `phone` in the same update.

## 10. Reservation Status Validation
- Submit a reservation with `status` = `blacklist` (not in the whitelist).
- Expected: **Permission denied** by rule validation.

## 11. Customer Create Field Validation
- Submit a customer document missing `name` or `phoneLast4`.
- Expected: **Permission denied** — all three fields (`name`, `phone`, `phoneLast4`) are required.

## 12. Normal Owner CRUD
- Authenticated owner performs full CRUD on their own store's data.
- Expected: All operations succeed (store, customer, reservation, incident create/update).
