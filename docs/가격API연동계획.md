# 식자재 실시간 시세 API 연동 계획

> 현재 `GET /api/prices`는 외부 연동 없이 정적 하드코딩 값을 반환한다(`backend/src/store.js`의 `getPrices()`, 6개 품목 고정, `updatedAt` 문자열도 수동 갱신). [backlog.md P2](./backlog.md)의 "식자재 가격 실시간 연동" 항목을 실제로 착수할 때 이 문서를 따른다.
> 기준 문서: [api.md](./api.md) §7.4(현재 계약), [algorithms.md](./algorithms.md)(장보기 리스트 가격 계산 로직).

---

## 1. 왜 필요한가

- `GET /api/prices`(가격 정보 화면)뿐 아니라 `backend/src/data/mealPrices.js`의 `mealPriceTable`(100개 재료 정적 가격표)이 장보기 리스트(`getShoppingList`)·주간 식단(`buildWeeklyPlan`) 전체의 예상 금액 계산에 쓰인다. 이 두 정적 데이터가 실제 물가와 괴리되면 "최소 구매"·"임박 재료 구출" 같은 가격 기반 추천 알고리즘 전체의 신뢰도가 떨어진다.
- 매일 변동하는 실제 소매가를 반영하려면 ①`GET /api/prices` 응답 ②`mealPriceTable`(재료 100종 매핑) 두 곳 모두 외부 데이터를 참조하도록 바꿔야 한다. 하나만 바꾸면 화면별로 가격이 서로 다른 모순이 생긴다.

---

## 2. 후보 API 비교

| 후보 | 제공처 | 데이터 성격 | 장점 | 단점 |
|---|---|---|---|---|
| **KAMIS(농산물유통정보) Open API** (추천) | 한국농수산식품유통공사(aT) | 전국 도매·소매 평균가, 일별 갱신, 품목코드 체계 존재 | 무료·즉시 발급, 농산물(양파·대파·감자 등 신선 채소류) 커버리지 넓음, REST+XML/JSON | 가공식품(계란·두부·베이컨 등)·수산물·육류 일부는 커버리지 약함, 품목코드를 우리 재료 id(`onion`,`pa`...)와 수동 매핑해야 함 |
| **공공데이터포털 — 축산물 유통정보** | 축산물품질평가원 | 소고기/돼지고기 등급별 경락가 | 육류 데이터는 KAMIS보다 상세 | 채소·가공식품은 커버 안 함 → KAMIS와 병행 필요 |
| **국가통계포털(KOSIS) 소비자물가** | 통계청 | 월별 물가지수(품목 대분류) | 장기 트렌드 파악용 | 일별 변동 없음(월 단위), "오늘 시세"용으로는 부적합 |
| **마트/이커머스 비공식 크롤링** | — | 실제 판매가 | 우리 앱이 쓰는 상품 단위("한단", "1모")와 가장 가깝게 맞출 수 있음 | 각 사이트 이용약관 위반 소지, 구조 변경에 매우 취약 — **비권장** |

**결론**: 신선 채소·과일·곡물은 **KAMIS**로, 육류(특히 돼지/소고기 부위별)는 **축산물 유통정보**로 보완하고, 나머지(가공식품·수산물·양념류 등 두 API가 커버 못 하는 품목)는 당분간 기존 정적값을 폴백으로 유지하는 **하이브리드 방식**을 권장한다. 전체 재료를 실시간화하려다 매핑 실패로 전체가 막히는 것보다, 커버되는 품목부터 단계적으로 교체하는 편이 리스크가 낮다.

---

## 3. 연동 방법 (아키텍처)

기존 컨벤션(`CLAUDE.md`의 "외부 연동은 BE가 프록시" 원칙, `backend/src/ocr/clovaOcr.js` 패턴)을 그대로 따른다.

```
backend/src/prices/
  kamisClient.js       — KAMIS Open API 호출 + 응답 파싱(외부 포맷 → 내부 포맷)
  ingredientPriceMap.js — 재료 id(pork, onion, pa...) ↔ KAMIS 품목코드 매핑 테이블
  priceCache.js        — 하루 1회 갱신되는 인메모리(또는 Supabase 테이블) 캐시
```

- **캐싱 필수**: KAMIS는 일별 갱신 데이터라 요청마다 호출할 필요가 없다. 서버 기동 시 1회 + 매일 자정 배치(또는 캐시 만료 후 다음 요청 시 lazy 갱신)로 충분 — `POST /api/receipts`의 15초 타임아웃+Mock 폴백 패턴처럼, API 실패 시 **직전 캐시값**으로 폴백(가짜 신선 데이터를 새 데이터인 척 보여주지 않되, 서비스 자체는 죽지 않게).
- **`store.js` 변경**: `getPrices()`를 비동기 함수로 바꾸고 `priceCache`에서 읽도록 수정(Supabase 마이그레이션 때 `store.js` 함수들을 이미 async로 바꾼 전례가 있음 — [api.md 부록 A](./api.md#a-supabase-데이터베이스-마이그레이션--완료-2026-07-10) 참고).
- **`mealPriceTable` 처리**: 실시간화하지 않는다(사용자 결정, 15일차) — 장보기 리스트·주간 식단 예상금액은 어차피 "평균값" 성격이면 충분하고, 실제 마트 가격도 매장·시점마다 편차가 있어 실시간 연동의 실익이 크지 않다고 판단. `resolvePrice()`가 `fridgeLogic.js` 여러 곳에서 동기 호출되는 구조를 유지.
- **환경변수**: `KAMIS_API_KEY`(`.env`, `.env.example`에 추가) — 크레덴셜 미설정 시 전량 정적 폴백(현재 동작 그대로 유지).
- **프론트 변경 없음**: `GET /api/prices` 응답 스키마(`{ updatedAt, items: [{emoji,name,avg,diff}] }`)를 유지하면 `frontend/src/pages/`의 가격 화면은 수정할 필요가 없다 — 계약은 그대로, 내부 구현만 교체.

---

## 4. 체크리스트

> **15일차 진행 상황**: `GET /api/prices`(6개 고정 품목) 범위는 구현 완료. `mealPriceTable`(100종 장보기 가격표)은 **사용자 결정으로 실시간화하지 않기로 확정**(실제 마트 가격은 매장·시점마다 어차피 달라 "평균값" 성격으로 충분하다는 판단) — `resolvePrice()`가 `fridgeLogic.js` 곳곳에서 동기 호출되는 구조 변경 리스크도 피할 수 있어 아래 4.1~4.2의 관련 항목은 보류로 종결한다.

### 4.1 조사·준비
- [x] KAMIS Open API 공식 문서(요청 URL·파라미터·응답 필드) 확인 — `periodProductList`, 파라미터는 `kamisClient.js` 주석 참고
- [ ] KAMIS Open API 실제 회원가입 및 인증키(`KAMIS_API_KEY`/`KAMIS_CERT_ID`) 발급 — **이 저장소 밖에서 사용자가 직접 진행해야 함**(외부 계정 가입은 에이전트가 대행 불가), 발급 후 `backend/.env`에 채워 넣기
- [ ] 축산물 유통정보 API 발급 여부 결정(육류 커버리지 보완 필요 시) — 미착수
- [x] 우리 재료 마스터(`backend/src/data/ingredients.js`, 100종) 중 KAMIS/축산물 API로 커버 가능한 품목 목록화 — 현재 범위(6개 품목)는 완료, `mealPriceTable` 100종은 실시간화 안 하기로 결정(보류로 종결, 아래 참고)
- [x] KAMIS 품목코드 체계(itemcode/kindcode/productrankcode) 매핑표 초안 작성(`backend/src/prices/ingredientPriceMap.js`) — ⚠️ 코드는 통상값 기준으로 작성했고 아직 실제 키로 검증 전. 인증키 발급 후 조회가 계속 001(No data)이면 KAMIS 품목코드표에서 재확인 필요(잘못돼도 정적 폴백으로 안전하게 떨어지도록 설계함)

### 4.2 백엔드 구현
- [x] `.env.example` 신설, `KAMIS_API_KEY`/`KAMIS_CERT_ID` 추가(`.env`는 기존과 동일하게 커밋 대상 아님)
- [x] `backend/src/prices/kamisClient.js`: `periodProductList` 호출 + 응답 파싱(8초 타임아웃, 최근 7일 조회 후 최신 항목 사용, `clovaOcr.js` 패턴대로 실패 시 전부 `null` 반환)
- [x] `backend/src/prices/ingredientPriceMap.js`: 6개 고정 품목 ↔ 품목코드 매핑 + 정적 폴백값
- [x] `backend/src/prices/priceCache.js`: 인메모리 캐시(24시간 TTL), lazy 갱신(요청 시점에 stale이면 갱신)
- [x] `store.js`의 `getPrices()`를 캐시 조회 기반 비동기 함수로 교체(`routes/prices.js`도 `async`로 수정)
- [x] `mealPriceTable`에 실시간 override 병합 로직 추가(부분 교체) — **보류 확정**: 실제 마트 가격도 매장·시점마다 편차가 커 "평균값"이면 충분하다는 판단, `resolvePrice()` 동기 호출 구조를 굳이 흔들지 않기로 함
- [x] 캐시 갱신 스케줄러 — 별도 배치 없이 lazy 갱신(요청 시 stale 여부 확인)으로 충분하다고 판단, 트래픽이 늘면 자정 배치로 전환 검토

### 4.3 검증
- [x] API 키 없을 때: 기존 정적 응답과 값이 동일함을 curl로 확인(`avg`/`emoji`/`name` 6종 동일, `diff:0`·`source:'static'` 추가됨 — 스키마는 하위 호환)
- [ ] API 키 있을 때: 실제 KAMIS 응답으로 실시간 값을 반환하는지 curl로 확인 — **인증키 발급 후 진행 필요**
- [x] API 타임아웃/실패 시: `fetchRetailPrice`가 예외를 삼키고 `null` 반환 → `priceCache.js`가 직전 캐시 또는 정적값으로 폴백(코드 리뷰로 확인, 실제 키 없이는 항상 이 경로를 탐)
- [ ] 장보기 리스트·주간 식단 총액 영향 확인 — `mealPriceTable`을 건드리지 않았으므로 영향 없음(해당 없음으로 종료)
- [x] 백엔드 테스트 스위트 전체 통과 확인(`npm test`, 기존에 있던 무관한 실패 1건 제외 114/115 통과)

### 4.4 문서·마무리
- [x] [api.md](./api.md) §1(외부 API 표)·§7.4를 실제 연동 내용으로 갱신
- [x] [backlog.md](./backlog.md) P2 "식자재 가격 실시간 연동" 항목을 완료 처리하고 구현 요약 남기기
- [ ] `CLAUDE.md`에 KAMIS 연동 사실 추가 — 현재 `CLAUDE.md`엔 외부 API 표가 따로 없어 해당 없음(api.md가 단일 소스)
