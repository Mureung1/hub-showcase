# 다음 작업 — 부족 영양소 기반 쿠팡 파트너스 상품 자동 수집

> **Step 1(조사·설계) 완료 상태 문서.** 조사 결과 **처음 구상했던 "사용자 요청마다 API 호출" 설계는
> 불가능**한 것으로 확인됐다. 아래에 근거와 대안 설계를 정리했고, Step 2부터의 프롬프트는 대안 설계
> 기준으로 다시 썼다.

---

## ⛔ 조사 결과: 원래 구상이 불가능한 이유

### 1. 검색 API 호출 한도가 **시간당 10회** (전체 계정 기준)

공식 문서에는 분당 50회로 적혀 있지만 **실제 적용은 시간당 10회**다. 초과하면 `rCode: 403`이 오고,
**이 403이 3번 누적되면 파트너스 계정의 API 사용이 영구 제한될 수 있다.**

이게 무슨 뜻이냐면:

| 설계 | 결과 |
|---|---|
| 사용자가 식단 탭에 들어올 때마다 호출 | **사용자 10명이면 한 시간 한도 소진.** 반복되면 계정 정지 |
| 사용자별로 다른 상품을 실시간 검색 | 한도상 불가능 |

즉 "웹에서 사용자별로 실시간 추천"은 이 API로는 **어떤 캐싱을 얹어도 원래 형태로는 못 만든다.**

### 2. API 키 발급에 **누적 판매금액 약 15만원** 조건

파트너스 가입만으로는 API 키가 안 나온다. 공유한 링크를 통해 **누적 15만원어치 구매가 발생해야**
최종 승인 → API 키 발급이다. 방금 제휴 링크를 만든 단계라면 아직 키를 받을 수 없다.

### 3. 기타 제약

- 검색 결과 **최대 10개**
- `minPrice`/`maxPrice` 파라미터 **미지원** (넣어도 조용히 무시되고 가격이 뒤섞여 온다)

---

## ✅ 대안 설계 — "사전 수집 + 정적 서빙"

### 핵심 통찰

**사용자별로 달라지는 건 "어떤 영양소가 부족한가"이지, "상품 카탈로그"가 아니다.**

- 영양소는 **11개로 고정**이다(`AD_NUTRIENTS`). 사용자가 100만 명이어도 11개다.
- 부족 영양소 판정(사용자별 개인화)은 **이미 `src/utils/adRecommendation.js`가 하고 있다.**
- 그러니 API로 자동화할 부분은 **"영양소별 상품 목록을 최신으로 유지하는 것"** 하나뿐이다.

### 구조

```
[주기적 배치]  scripts/fetch-coupang-products.mjs
   영양소 11개 × 검색 1회 = 11회 호출  (시간당 10회 한도 → 2시간에 나눠서, 또는 주 1회)
        ↓ 상품명·가격·이미지·제휴링크 수집
   src/data/coupangProducts.generated.json  (커밋해서 저장소에 포함)
        ↓
[런타임]  API 호출 0회. 기존 코드가 이 파일을 읽기만 한다.
   src/utils/adRecommendation.js  ← 사용자별 부족 영양소 판정 (그대로, 안 바뀜)
   src/components/DeficientNutrientAds.jsx  ← 표시 (그대로, 안 바뀜)
```

### 이 설계의 장점

| | |
|---|---|
| **한도 안전** | 런타임 호출이 0회라 사용자가 아무리 늘어도 계정 정지 위험이 없다 |
| **속도** | 광고 배너에 네트워크 대기가 없다(지금과 동일) |
| **서버 불필요** | `/api/coupang-products` 라우트를 만들 필요가 없다. Render/Vercel 이중 배포 문제도 안 생긴다 |
| **키 노출 위험 0** | 키는 개발자 로컬(또는 CI Secret)에만 있고, 배포물에는 아예 안 들어간다 |
| **기존 코드 그대로** | 데이터 공급원만 바뀌고 추천 로직·화면은 손대지 않는다 |
| **폴백 자동** | 배치가 실패하면 직전에 커밋된 JSON이 그대로 쓰인다 |

### 잃는 것

- "실시간 개인화 상품 검색"은 포기한다. → 하지만 **개인화는 이미 영양소 판정 단계에서 일어나고 있다.**
  사용자 A는 단백질 상품을, 사용자 B는 식이섬유 상품을 본다. 그 차이가 개인화의 본질이고,
  같은 "단백질" 사용자끼리 다른 상품을 보여줄 실익은 크지 않다.

---

## Step 0 — 내가 먼저 확인할 것

1. [partners.coupang.com](https://partners.coupang.com) → 누적 판매금액이 **15만원**을 넘었는지 확인
2. 넘었다면 **최종 승인** 여부 확인 → 승인 후 API 키(ACCESS/SECRET) 발급

| 항목 | 값 |
|---|---|
| 누적 판매금액 | |
| 최종 승인 상태 | 승인 / 미승인 |
| ACCESS KEY | |
| SECRET KEY | |

### ✅ Step 0 검증
- [ ] 키 2개 확보 → Step 2로
- [ ] **아직 15만원 미달 → 이 작업 전체를 보류.** 대신 아래 "지금 당장 할 수 있는 것"을 한다

### 💡 키가 없는 동안 할 수 있는 것 (권장)

현재 등록된 제휴 링크 9개의 **상품명·가격·이미지만 손으로 채우면** 지금 구조에서 카드가 완성된다.
[`src/data/coupangProducts.js`](../src/data/coupangProducts.js)의 각 항목에 `// sourceUrl:` 주석으로
실제 상품 페이지 주소가 적혀 있으니, 열어서 복사해 붙이면 된다. 5분이면 끝나고 API가 필요 없다.
상품명을 채우면 **같은 영양소의 2·3번 상품도 자동으로 노출 대상이 된다**(지금은 중복 카드 방지를 위해
1번만 쓰고 있다).

---

## Step 1 — 조사 (완료됨)

이 문서 상단의 "조사 결과"와 "대안 설계"가 Step 1의 산출물이다. 아래는 확정된 기술 사양이다.

### 인증 (HMAC)

```
message   = datetime + method + path + query      // 이 순서로 단순 연결
datetime  = UTC, "yyMMddTHHmmssZ" 형식             // 예: 260722T143022Z
signature = HMAC-SHA256(message, SECRET_KEY)      // hex
header    = Authorization: CEA algorithm=HmacSHA256, access-key=<ACCESS>, signed-date=<datetime>, signature=<sig>
```

주의: `path`에 query를 포함하지 않고, `query`는 `?` 없이 따로 붙인다.

### 검색 API 응답 필드

```
{ rCode: "0", rMessage: "", data: { productData: [
    { productId, productName, productPrice, productImage, productUrl, isRocket, categoryName }
] } }
```

`rCode`가 `"0"`이면 성공. `productUrl`이 **이미 제휴 추적이 붙은 링크**다(별도 deeplink 변환 불필요).

### 우리 스키마와의 매핑

| 쿠팡 응답 | `coupangProducts.js` 스키마 |
|---|---|
| `productId` | `id` (`cp-<nutrient>-<productId>`) |
| `productName` | `productName` |
| `productPrice` | `price` |
| `productImage` | `imageUrl` |
| `productUrl` | `partnersUrl` |
| (검색 키워드로 역산) | `nutrient` |

---

## Step 2 — 수집 스크립트 구현 (키 확보 후)

### 🤖 프롬프트 2

```
docs/next-쿠팡API-자동추천-프롬프트.md 를 읽어와. 조사는 이미 끝났고, "대안 설계"대로 구현한다.
API 키를 발급받았다: ACCESS_KEY / SECRET_KEY 확보.

**중요 제약(반드시 지킬 것)**: 검색 API는 시간당 10회 한도이고, 403이 3번 쌓이면 파트너스 계정의
API가 영구 정지될 수 있다. 그래서 이 작업에서 만드는 건 런타임 API 호출이 아니라 **오프라인 배치
스크립트**다. 서버 라우트(/api/...)는 만들지 않는다.

1. scripts/fetch-coupang-products.mjs (신규):
   - .env에서 COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY를 읽는다(VITE_ 접두사 금지)
   - src/data/coupangProducts.js의 AD_NUTRIENTS 11개 각각에 대해 검색 키워드를 정의하고
     (키워드 표는 이 스크립트 안이 아니라 데이터 파일 쪽에 두는 게 나은지 판단해서 제안해줘)
     영양소당 1회씩 검색
   - **호출 사이에 최소 6분 간격을 강제**할 것(시간당 10회 = 6분당 1회). 진행 상황을 콘솔에
     출력해서 몇 분 남았는지 보이게
   - --nutrient=protein 처럼 특정 영양소만 갱신하는 옵션, --dry-run 옵션 제공
   - 403(rCode 403)을 받으면 **즉시 중단**하고 남은 호출을 시도하지 말 것. 다시 실행하기까지
     얼마나 기다려야 하는지 안내 출력
   - HMAC 서명 생성은 별도 함수로 분리하고, 서명 결과를 검증하는 단위 확인을 스크립트 안에 포함

2. 결과 저장: src/data/coupangProducts.generated.json
   - 스키마는 기존과 동일: { id, nutrient, productName, price, imageUrl, partnersUrl }
   - 수집 시각(fetchedAt)도 함께 기록
   - 의약품 오인 표현("치료"/"예방"/"개선 보장")이 상품명에 있으면 그 상품은 제외
     (scripts/check-ad-recommendation.mjs에 같은 검사가 있다)
   - 가격이 0이거나 상품명이 비면 제외
   - 이 파일은 **커밋한다**(배포물에 포함되어야 하고, 배치 실패 시 폴백이 되어야 하므로)

3. src/data/coupangProducts.js:
   - generated.json이 있으면 그걸 우선 쓰고, 없거나 비어 있으면 지금 손으로 넣은 목록을
     쓰도록 병합한다. 손으로 넣은 항목이 사라지면 안 된다
   - 영양소당 최소 1개 보장(하나라도 비면 배너가 빌 수 있다)

4. .env.example / README.md 환경변수 표에 COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY 추가.
   "서버 런타임에는 쓰이지 않고 수집 스크립트에서만 쓰는 키"라고 명시할 것

5. 완료 후: --dry-run으로 서명 생성까지만 확인하는 방법과, 실제 수집 시 예상 소요 시간을 알려줘.
```

### ✅ Step 2 검증
- [ ] `node scripts/fetch-coupang-products.mjs --dry-run` → 실제 호출 없이 서명·요청 URL만 출력
- [ ] `--nutrient=protein` 1개만 실행 → `generated.json`에 단백질 상품이 채워짐
- [ ] 상품명·가격·이미지가 **실제 값**으로 들어옴
- [ ] 403을 받으면 즉시 중단하고 대기 안내가 뜸 (일부러 연달아 호출해 확인)
- [ ] `git grep VITE_COUPANG` → 0건
- [ ] `npm run check:ads` 통과 / `npm run build` 통과
- [ ] 식단 탭에서 실제 상품명·가격·이미지가 보임

---

## Step 3 — 갱신 자동화 (선택)

### 🤖 프롬프트 3

```
수집 스크립트가 잘 도니, 주기적으로 돌게 만들자.

1. 갱신 주기 제안과 근거를 먼저 알려줘 (상품 가격이 얼마나 자주 바뀌는지 / 한도가 시간당
   10회인 점 / 11개 영양소를 다 돌면 1시간 이상 걸리는 점을 고려)

2. 실행 방식 2가지를 비교하고 추천해줘:
   (a) GitHub Actions cron — 키를 GitHub Secrets에 두고, 결과 JSON을 자동 커밋/PR
   (b) 로컬에서 수동 실행 후 커밋
   이 저장소는 Render와 Vercel에 동시 배포되므로, JSON이 커밋되면 양쪽에 자동 반영된다는 점도 확인

3. (a)를 고르면 워크플로 파일을 만들고, 실패 시(403 등) 조용히 넘어가지 않고
   알림이 남게 해줘. 이전 JSON을 덮어쓰지 않는 것도 중요하다

4. 수집이 오래된 경우(예: 30일 이상) check:ads가 경고를 출력하도록 추가
```

### ✅ Step 3 검증
- [ ] 수동 트리거로 워크플로 1회 성공
- [ ] 403 상황에서 기존 JSON이 손상되지 않음
- [ ] 오래된 데이터 경고가 뜸

---

## 이 작업에서 특히 조심할 것

| 항목 | 왜 |
|---|---|
| **시간당 10회 한도** | 가장 위험하다. 403 3회면 **계정 API 영구 정지 가능**. 호출 간 6분 간격 강제 + 403 시 즉시 중단이 필수 |
| **런타임 호출 금지** | 사용자 요청 경로에서 이 API를 부르면 안 된다. 배치 전용 |
| **SECRET KEY** | `VITE_` 접두사 금지. 이 설계에서는 아예 배포물에 안 들어간다(로컬/CI Secret에만) |
| **배너가 비는 상태** | FR-3.4 "배너는 항상 표시". generated.json이 비거나 깨져도 손으로 넣은 목록으로 폴백되어야 한다 |
| **의약품 오인 표현** | 쿠팡에서 받아온 상품명에 "혈압 개선" 같은 표현이 섞여 올 수 있다. 수집 단계에서 걸러야 한다 |
| **개인정보** | 이 설계에서는 쿠팡에 사용자 정보가 전혀 안 나간다(검색 키워드는 고정 11개). 실시간 설계였다면 부족 영양소가 건강정보로 새어나갈 수 있었다 — 대안 설계의 부수적 이점 |

---

## 참고: 지금 구조에서 이미 준비된 것

```
src/data/coupangProducts.js      ← 상품 "데이터"  (여기만 generated.json 병합으로 교체)
src/utils/adRecommendation.js    ← 사용자별 부족 영양소 판정 (순수 함수, 안 바뀜)
src/components/DeficientNutrientAds.jsx  ← 표시 (안 바뀜)
```

`productName`/`price`/`imageUrl`이 비어도 화면이 대체 표기하도록 이미 만들어져 있어서
(`displayProductName`), 수집이 부분적으로만 성공해도 깨지지 않는다.

---

## 출처

- [HMAC Signature 생성 — 쿠팡 Open API 공식](https://developers.coupang.com/hc/en-us/articles/360033461914-Creating-HMAC-Signature)
- [API 인증 — 쿠팡 Open API 공식](https://developers.coupangcorp.com/hc/en-us/sections/360004301613-API-authentication)
- [쿠팡파트너스 검색 API 호출 제한 및 가격 필터링 이슈 (시간당 10회, 403 3회 영구정지)](https://velog.io/@shwj203/%EC%BF%A0%ED%8C%A1%ED%8C%8C%ED%8A%B8%EB%84%88%EC%8A%A4-%EA%B2%80%EC%83%89-API-%ED%98%B8%EC%B6%9C-%EC%A0%9C%ED%95%9C-%EB%B0%8F-%EA%B0%80%EA%B2%A9-%ED%95%84%ED%84%B0%EB%A7%81-%EC%9D%B4%EC%8A%88)
- [쿠팡 파트너스 API 키 발급 조건 (누적 15만원)](https://www.inflearn.com/en/community/questions/1485079/)
- [쿠팡 파트너스 SDK (응답 필드 참고)](https://github.com/mooooburg-dev/coupang-partners-sdk-standalone)
