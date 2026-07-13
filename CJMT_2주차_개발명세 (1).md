# CJMT 2주차 개발 명세 (Claude Code 작업용) — OpenRouter · Gemini 3 Flash Preview

> **CJMT** = Chungnam Just-eat Meal Tracker
> 음식 사진 한 장(또는 메뉴명 입력) → 내 몸 기준 부족 영양소와 보충 메뉴를 알려주는 웹서비스
> 이 문서는 Claude Code에게 전달하는 **개발 명세 + 작업 계획서**다. AI 호출은 전부 **OpenRouter**를 경유해 **Gemini 3 Flash Preview**(`google/gemini-3-flash-preview`)를 사용한다. OpenRouter는 **OpenAI 호환** API이므로 요청/응답 스키마는 OpenAI Chat Completions 형식을 따른다.

**이 문서 구성**
1. 개요·스택·데이터 모델·로직 명세 (무엇을 만드는가)
2. 2주차 작업 체크리스트 + 우선순위 + 의존성 순서 (어떻게 진행하는가)
3. 완료 기준 (무엇이 되면 끝인가)

---

## 0. 프로젝트 개요

- **목표**: 4주 안에 MVP를 완성도 있게 시연.
- **MVP 핵심 2기능**
  1. **F3 — 사진/메뉴명 → 영양분석 (AI 인식)**: 서비스 진입점.
  2. **F4 — 내 몸 기준 부족 영양소 계산·추천**: 차별점(셀링 포인트).
- **MVP 지원 기능(얇게)**: F1 로그인, F2 신체정보 입력·권장량 계산.
- **2주차 신규 기능**
  - **F7 — 비로그인 즉시 분석 진입**: 로그인/신체정보 없이도 분석 사용 가능.
  - **F8 — 포장지 뒷면 영양정보 분석**: 가공식품 영양성분표 이미지 → 정확 수치 추출.
  - **F9 — 데이터 저장(CSV 로컬 이관 + Supabase 서버 동기화)**.
- **확장(2주차 범위 밖)**: F5 주변 가게 추천, F6 달력 기록, 알레르기·기저질환 선택 확장, 위치 지정 검색, 시간대별 기록, 카드 표시정보 체크리스트.

> 한 줄 정의: **"음식 사진 한 장(또는 메뉴명) → 내 몸 기준 부족 영양소와 보충 메뉴를 알려주는 웹"**

**2주차 변경 요약**
- 비로그인 상태에서도 첫 화면 진입 즉시 영양 분석 가능(라우팅 가드 완화).
- 사진 없이 메뉴명 텍스트만으로도 영양 조회 가능.
- 포장지 뒷면(가공식품 영양성분표) 이미지 분석 경로 추가.
- 데이터 저장 이원화: **CSV = 로컬 백업/기기 이관용**, **Supabase = 로그인 시 서버 저장·불러오기용**.
- AI 호출을 Google 직접 호출 → **OpenRouter(Gemini 3 Flash Preview)** 로 전환 **(완료, 적용됨)**.

---

## 1. 기술 스택 (고정)

- **프론트엔드**: React 18 + Vite (SPA)
- **스타일**: 인라인 스타일 또는 CSS 모듈 (Tailwind 미사용)
- **상태관리**: React 내장 훅(useState, useContext)만 사용
- **라우팅**: react-router-dom v6
- **AI 호출**: **OpenRouter** 경유 **Gemini 3 Flash Preview** (`google/gemini-3-flash-preview`) — OpenAI 호환 `POST https://openrouter.ai/api/v1/chat/completions`, 이미지(`image_url`에 base64 data URI) + 텍스트 멀티모달. 1M 컨텍스트, text/image 입력 지원.
- **백엔드**: 없음(서버리스 지향). API 키는 **환경변수**로 관리하고, 개발 단계에선 간단한 Node/Express 프록시 서버로 키 노출 방지.
- **데이터 저장**:
  - **로컬**: 브라우저 메모리 + localStorage (기본).
  - **CSV**: 로컬 데이터를 파일로 내보내기/가져오기 → **기기 이관용**.
  - **Supabase**: **로그인 시** 서버 저장, 다른 기기 로그인 시 서버에서 불러오기.
- **배포**: Vercel 또는 Render (정적 호스팅 + 서버리스 함수 프록시).

> ⚠️ **API 키 보안 원칙**: OpenRouter 키·Supabase 서비스 키를 프론트 코드에 절대 하드코딩 금지. `.env`(gitignore) + 프록시 경유. 데모 단계라도 키가 깃허브에 올라가지 않게 한다.
> Supabase는 **anon key**만 프론트에서 사용하고, Row Level Security(RLS)로 유저별 데이터 접근을 제한한다.

---

## 2. 폴더 구조 (기준)

```
cjmt/
├── .env.example            # OPENROUTER_API_KEY= / SUPABASE_URL= / SUPABASE_ANON_KEY=
├── .gitignore              # .env, node_modules
├── index.html
├── package.json
├── vite.config.js          # /api → 프록시 서버
├── server/
│   └── proxy.js            # POST /api/ai : OpenRouter(OpenAI 호환) 프록시
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── router.jsx          # 2주차: 비로그인 진입 허용하도록 가드 완화
    ├── context/
    │   └── UserContext.jsx  # 로그인 유저 + 신체정보 + 권장량 (게스트 모드 지원)
    ├── lib/
    │   ├── ai.js            # aiComplete() 공통 헬퍼 (OpenRouter 경유)
    │   ├── nutrition.js     # 권장 영양소 계산(순수함수)
    │   ├── storage.js       # localStorage 래퍼 (날짜별 기록)
    │   ├── csv.js           # 2주차 신규: CSV export/import (기기 이관)
    │   └── supabase.js      # 2주차 신규: Supabase 클라이언트 + 동기화
    ├── pages/
    │   ├── Login.jsx        # F1
    │   ├── Profile.jsx      # F2 신체정보 입력
    │   ├── Analyze.jsx      # F3 사진/메뉴명 분석 (2주차: 텍스트 전용 경로 추가)
    │   └── Result.jsx       # F4 부족 영양소·추천 결과
    ├── components/
    │   ├── PhotoUpload.jsx
    │   ├── LabelScan.jsx     # 2주차 신규: 포장지 뒷면 영양성분표 스캔
    │   ├── MenuTextInput.jsx # 2주차 신규: 사진 없이 메뉴명 입력
    │   ├── NutritionCard.jsx
    │   ├── DeficiencyBar.jsx
    │   ├── MenuRecommendation.jsx
    │   └── DataSyncPanel.jsx # 2주차 신규: CSV 내보내기/가져오기 + 로그인 동기화
    └── styles/
        └── theme.js
```

---

## 3. 데이터 모델

### 3.1 User
```js
{
  id: string,            // 로그인 ID
  password: string,      // MVP 한정 평문(데모용). 배포 시 해시 필수.
  profile: {
    age: number, heightCm: number, weightKg: number,
    sex: 'male' | 'female',
    activity: 'low' | 'moderate' | 'high',
    conditions: string[] // 예: ['diabetes']
  },
  recommended: NutrientSet
}
```

### 3.2 NutrientSet (권장량/섭취량/부족분 공통)
```js
{
  calories: number,  // kcal
  protein: number,   // g
  carbs: number,     // g
  fat: number,       // g
  fiber: number,     // g
  sodium: number     // mg
}
```

### 3.3 MealAnalysis (F3 결과)
```js
{
  source: 'photo' | 'text' | 'label',  // 2주차: 분석 경로 구분
  items: [
    { name: string, brand?: string, nutrients: NutrientSet }
  ],
  total: NutrientSet   // items 합산
}
```

### 3.4 DailyRecord (2주차 신규 — 날짜별 저장 단위)
로컬(localStorage)·CSV·Supabase 모두 이 구조를 공통 기준으로 삼는다.
```js
{
  date: string,          // 'YYYY-MM-DD'
  meals: MealAnalysis[], // 그날 분석한 음식들
  dayTotal: NutrientSet, // meals 전체 합산
  recommended: NutrientSet, // 그날 기준 권장량(스냅샷)
  deficiency: NutrientSet,  // recommended - dayTotal
  compliant: boolean     // 권장량 준수 여부(달력 표시용)
}
```

---

## 4. 핵심 로직 명세

### 4.1 권장 영양소 계산 (`lib/nutrition.js`)
- **BMR (Mifflin-St Jeor)**
  - 남: `10*kg + 6.25*cm - 5*age + 5`
  - 여: `10*kg + 6.25*cm - 5*age - 161`
- **TDEE** = BMR × 활동계수 (low 1.375 / moderate 1.55 / high 1.725)
- **탄단지 기본 비율**: 탄수 50% / 단백 20% / 지방 30% → kcal을 g으로 환산(탄4·단4·지9 kcal/g)
- **식이섬유**: 여 25g / 남 30g 기본값
- **나트륨**: 2000mg 상한 기준
- **기저질환 보정(선택)**: 예 diabetes면 탄수 -5%. MVP에선 얇게(주석 수준).
- **게스트(비로그인) 기본값**: 신체정보가 없으면 권장량 계산을 생략하고, 분석·표시는 그대로 진행한다. 권장량 대비 비교는 신체정보 입력 후 활성화.
- 모두 **순수함수**로 작성.

### 4.2 AI 공통 헬퍼 (`lib/ai.js`)
프록시(`/api/ai`) 경유. 텍스트/이미지 겸용. 프론트 인터페이스는 기존과 동일하게 `{ prompt, imageBase64?, mimeType? }`를 넘긴다(내부 변환만 OpenAI 호환으로 바뀜).

```js
// 프록시로 { prompt, imageBase64?, mimeType? }를 넘기면
// 서버가 OpenRouter(OpenAI Chat Completions) 형식으로 변환해 호출한다.
export async function aiComplete({ prompt, imageBase64 = null, mimeType = 'image/jpeg' }) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, imageBase64, mimeType }),
  });
  if (!res.ok) throw new Error('AI 요청 실패: ' + res.status);
  const data = await res.json();
  // 프록시가 choices[0].message.content 를 { text }로 내려준다고 가정
  return data.text;
}

// JSON 응답 파싱 유틸: ```json 펜스 제거 후 파싱
export function parseJsonLoose(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}
```

### 4.3 프록시 서버 (`server/proxy.js`) — OpenRouter (OpenAI 호환) 변환
- 엔드포인트: `POST /api/ai`
- 요청 body: `{ prompt, imageBase64?, mimeType? }`
- OpenRouter 호출 형식으로 변환:
```
POST https://openrouter.ai/api/v1/chat/completions
Authorization: Bearer ${OPENROUTER_API_KEY}
Content-Type: application/json
# (권장) HTTP-Referer, X-Title 헤더로 앱 식별

{
  "model": "google/gemini-3-flash-preview",
  "messages": [{
    "role": "user",
    "content": [
      { "type": "text", "text": "<prompt>" },
      // 이미지가 있으면 data URI로 첨부:
      { "type": "image_url",
        "image_url": { "url": "data:<mimeType>;base64,<imageBase64>" } }
    ]
  }]
}
```
- 응답에서 `choices[0].message.content`(문자열)를 그대로 `{ text }`로 반환.
- 이미지가 없으면 `content`는 텍스트 파트 하나만 담는다(문자열로 넘겨도 무방).
- 키는 `process.env.OPENROUTER_API_KEY`에서만 읽고 절대 클라이언트로 반환하지 않는다.
- 429/네트워크 오류 시 상태코드와 메시지를 그대로 전달(프론트에서 재시도 처리).
- (선택) 순수 JSON 응답 강제가 필요하면 요청에 `"response_format": { "type": "json_object" }`를 추가하고, 그래도 펜스가 붙을 수 있으니 `parseJsonLoose`로 방어한다.
- (선택) Gemini 3 Flash Preview는 thinking 모델이므로, 응답 지연이 크면 reasoning 레벨을 낮추는 옵션(`minimal`) 적용을 검토한다.

### 4.4 음식 영양분석 (`pages/Analyze.jsx`)
2주차: **세 가지 입력 경로**를 지원한다. 모두 `MealAnalysis`로 귀결.

1. **사진 분석 (source: 'photo')**
   - 사진 업로드 + (선택) 메뉴명·브랜드 입력.
   - 이미지 → base64(`data:` 접두어 제거) → `aiComplete({ prompt, imageBase64, mimeType })`.
   - **프롬프트 원칙**: "프랜차이즈로 식별되면 공식 영양표 기준, 아니면 표준 조리법 기반 추정. 설명·마크다운 없이 MealAnalysis JSON만 반환."

2. **메뉴명 텍스트 분석 (source: 'text')** — *2주차 신규*
   - 사진 없이 메뉴명(+선택 브랜드)만 입력해도 분석.
   - 이미지 없이 `aiComplete({ prompt })`만 호출.
   - **프롬프트 원칙**: "주어진 메뉴명/브랜드로 표준 1인분 기준 추정. 설명·마크다운 없이 MealAnalysis JSON만 반환."

3. **포장지 뒷면 영양정보 분석 (source: 'label')** — *2주차 신규*
   - 가공식품 영양성분표 사진 업로드 → 표에서 수치 직접 추출.
   - **프롬프트 원칙**: "이미지의 영양성분표를 읽어 표기된 수치를 그대로 추출. 추정 금지, 표에 없는 값은 null. 1회 제공량 기준. 설명·마크다운 없이 MealAnalysis JSON만 반환."
   - 조리음식 추정 경로와 구분(추정이 아니라 **정확 수치 추출**).

- 모든 경로: 응답을 `parseJsonLoose`로 파싱 → `MealAnalysis` 형태 검증 → 실패 시 재시도 버튼.
- 분석 결과는 그날 `DailyRecord.meals`에 누적하고 로컬에 저장(4.6 참조).

### 4.5 부족 영양소 계산·추천 (`pages/Result.jsx`)
- `deficiency = recommended - dayTotal` (음수면 초과).
- 신체정보(권장량)가 없는 게스트는 부족분 계산 대신 "신체정보 입력 시 부족 영양소 확인 가능" 안내를 표시.
- 부족 상위 2~3개 영양소를 근거로 AI(Gemini 3 Flash Preview)에 저녁 보충 메뉴 추천 요청(JSON 반환).
- 시각화: 영양소별 막대(DeficiencyBar) + 추천 메뉴 카드.

### 4.6 데이터 저장 (2주차 신규)

#### (A) 로컬 저장 (`lib/storage.js`)
- 로그인 여부와 무관하게, 분석 결과를 날짜별 `DailyRecord`로 localStorage에 저장.
- 키 예: `cjmt:record:YYYY-MM-DD`, 인덱스 `cjmt:record:index`.
- 게스트도 그대로 사용(로컬이 1차 저장소).

#### (B) CSV 내보내기/가져오기 (`lib/csv.js`) — **기기 이관용**
- **목적**: 기기가 바뀌어도 기존 데이터를 그대로 옮긴다. (로그인 불필요)
- **내보내기**: localStorage의 전체 `DailyRecord`를 CSV 파일로 다운로드.
- **가져오기**: CSV 파일 업로드 → 파싱 → localStorage에 복원(같은 날짜는 덮어쓰기 또는 병합, 정책 명시).
- **CSV 컬럼(한 행 = 하루 한 끼 항목 단위)**:

| 컬럼 | 설명 |
|---|---|
| `date` | YYYY-MM-DD |
| `source` | photo / text / label |
| `item_name` | 음식명 |
| `brand` | 브랜드(없으면 빈 값) |
| `calories` | kcal |
| `protein` | g |
| `carbs` | g |
| `fat` | g |
| `fiber` | g |
| `sodium` | mg |
| `recommended_calories` | 그날 권장 kcal(스냅샷, 없으면 빈 값) |
| `recommended_protein` | g |
| `recommended_carbs` | g |
| `recommended_fat` | g |
| `recommended_fiber` | g |
| `recommended_sodium` | mg |
| `compliant` | true / false / 빈 값 |

> `dayTotal`·`deficiency`는 `date`별로 재계산 가능하므로 CSV에는 원자료(끼니 행 + 권장량)만 저장하고, 가져오기 시 재계산한다.

#### (C) Supabase 서버 저장 (`lib/supabase.js`) — **로그인 동기화용**
- **목적**: 로그인하면 서버에 저장하고, 다른 기기에서 로그인하면 서버 데이터를 그 기기로 불러온다.
- **동작**
  - 로그인 시: 로컬 `DailyRecord`를 Supabase로 업로드(업서트) + 서버 데이터를 로컬로 병합.
  - 이후 분석/저장 시: 로컬 저장과 함께 서버에도 업서트.
  - 다른 기기 로그인 시: 서버에서 해당 유저 레코드를 내려받아 로컬에 채움.
- **테이블 스키마**

`profiles`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `user_id` | uuid (PK) | Supabase auth 유저 |
| `age` | int | |
| `height_cm` | numeric | |
| `weight_kg` | numeric | |
| `sex` | text | 'male' / 'female' |
| `activity` | text | 'low' / 'moderate' / 'high' |
| `conditions` | text[] | 예: ['diabetes'] |
| `updated_at` | timestamptz | |

`daily_records`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → profiles) | RLS 기준 |
| `date` | date | 유저+날짜 유니크 |
| `meals` | jsonb | `MealAnalysis[]` |
| `day_total` | jsonb | `NutrientSet` |
| `recommended` | jsonb | `NutrientSet`(스냅샷) |
| `deficiency` | jsonb | `NutrientSet` |
| `compliant` | boolean | |
| `updated_at` | timestamptz | |

- `daily_records`는 `(user_id, date)` 유니크 제약 → 업서트 기준.
- **RLS**: 각 유저는 `user_id = auth.uid()` 행만 조회·수정 가능.
- **충돌 정책(명시 필요)**: 같은 날짜가 로컬/서버에 모두 있으면 `updated_at` 최신 우선. (MVP 기본값, 필요 시 조정)

---

## 5. 화면 흐름 (라우팅) — 2주차 개편

```
/         → 진입 즉시 분석 가능(게스트 허용). = /analyze 로 바로 진입
/login    → F1 로그인/회원가입 (선택)
/profile  → F2 신체정보 입력 → 권장량 계산·저장 (선택, 부족분 비교에 필요)
/analyze  → F3 사진/메뉴명/포장지 분석 (비로그인 사용 가능)
/result   → F4 부족 영양소 + 보충 메뉴 추천 (권장량 없으면 안내 표시)
```

**가드 완화(2주차 핵심 변경)**
- 로그인 안 됨 → **리다이렉트하지 않음**. 게스트로 분석 사용 가능.
- 신체정보 없음 → **리다이렉트하지 않음**. 분석은 진행하되, 부족분 비교 화면에서 "신체정보 입력하면 부족 영양소를 볼 수 있어요" 안내.
- 로그인/신체정보는 **선택적 상향 기능**(부족분 비교·서버 저장)을 켜는 용도.

---

## 6. UI/디자인 원칙
- 모바일 우선(세로 화면), 카드형 레이아웃.
- 포인트 컬러 1개(그린=건강) + 중립 회색.
- 부족=주황, 충족=그린으로 즉시 구분.
- AI 호출은 수 초 걸리므로 **로딩 상태 필수**.
- 파싱 실패·네트워크 실패 시 사용자 친화 에러 + 재시도 버튼.
- 첫 화면에서 사진/메뉴명/포장지 세 입력 방식이 명확히 보이도록 구성.
- 데이터 이관(CSV) / 서버 동기화(로그인)는 별도 패널(`DataSyncPanel`)에서 안내.

> 참고: 토스 디자인 시스템 적용은 별도 `/toss` 규칙 문서를 따른다. 토큰(theme.js) 기반, 화면당 Primary 버튼 1개, 모든 상태(Loading/Empty/Error) 구현 원칙 준수.

---

## 7. 2주차 작업 체크리스트 (진행 순서)

핵심 사용자 시나리오(비로그인 진입 → 분석 → 저장)를 앞에 두고, 하루 단위 작업으로 분해했다.

### 우선순위·의존성 요약

| # | 작업 | 우선순위 | 선행 | 예상 |
|---|---|---|---|---|
| ~~0~~ | ~~OpenRouter 전환 (프록시·헬퍼 교체)~~ ✅ **완료** | P0 | — | 완료 |
| 1 | 라우팅 가드 완화 (비로그인 진입 허용) | P0 | — | 0.5일 |
| 2 | 사진 없이 텍스트만으로 영양 조회 | P0 | 1 | 1일 |
| 3 | 비로그인 로컬 저장(localStorage) 기반 마련 | P0 | 1 | 0.5일 |
| 4 | 포장지 뒷면 영양정보 분석 (라벨 스캔) | P1 | 2 | 1일 |
| 5 | 날짜별 데이터 CSV 내보내기/가져오기 | P1 | 3 | 1일 |
| 6 | Supabase 연동 (로그인 시 서버 동기화) | P2 | 3,5 | 1일 |

**권장 순서: (0 완료) → 1 → 2 → 3 → (4 ∥ 5) → 6**
- 0(OpenRouter 전환)은 **이미 완료**됨. 프로젝트는 현재 OpenRouter/Gemini 3 Flash Preview로 동작 중.
- 4와 5는 서로 독립이라 병렬 진행 가능.
- 6은 3(로컬 저장 구조)과 5(CSV 스키마)가 확정된 뒤에 시작.

### P0 — 핵심 진입 시나리오

**[x] #0 OpenRouter 전환 — 프록시·헬퍼 교체 ✅ 완료**
- `server/proxy.js`를 OpenRouter(OpenAI 호환) 형식으로 변경(4.3). ✅
- `lib/gemini.js` → `lib/ai.js`, `geminiComplete()` → `aiComplete()`, 엔드포인트 `/api/gemini` → `/api/ai`. ✅
- `.env`의 `GEMINI_API_KEY` → `OPENROUTER_API_KEY`. ✅
- **상태:** 완료. 프로젝트는 현재 OpenRouter(Gemini 3 Flash Preview)로 AI 호출이 정상 동작 중. 이후 작업은 이 기반 위에서 진행한다.

**[ ] #1 라우팅 가드 완화 — 비로그인 진입 허용**
- 로그인/신체정보 없어도 `/analyze` 진입 가능하게 리다이렉트 조건 제거(`router.jsx`).
- 신체정보 없으면 "권장량 계산은 나중에" 안내만 띄우고 분석은 진행.
- **완료 기준:** 로그인 안 한 상태로 첫 화면에서 `/analyze`까지 막힘 없이 도달한다.

**[ ] #2 사진 없이 텍스트만으로 영양 조회**
- `Analyze.jsx`에 "메뉴명만 입력" 경로 추가(이미지 optional 처리) + `MenuTextInput.jsx`.
- `aiComplete`에 `imageBase64` 없이 프롬프트만 전달하는 분기(`source: 'text'`).
- **완료 기준:** 사진 업로드 없이 메뉴명만 입력해도 NutritionCard가 표시된다.

**[ ] #3 비로그인 로컬 저장 기반 마련**
- `storage.js`에 날짜별 `DailyRecord` 저장·조회 래퍼 구현(4.6-A).
- 로그인 여부와 무관하게 localStorage에 쌓이는 구조(Supabase는 #6에서 얹음).
- **완료 기준:** 비로그인 상태에서 분석한 결과가 날짜별로 localStorage에 저장·재조회된다.

### P1 — 기능 확장

**[ ] #4 포장지 뒷면 영양정보 분석 (라벨 스캔)**
- `LabelScan.jsx` + `source: 'label'` 경로. 영양성분표 이미지 → 표기 수치 그대로 추출(4.4-3).
- 조리음식 추정과 구분되는 "정확 수치" 프롬프트로 처리.
- **완료 기준:** 영양성분표 사진 한 장으로 칼로리·탄단지·나트륨이 카드에 정확히 채워진다.

**[ ] #5 날짜별 데이터 CSV 내보내기/가져오기**
- `csv.js` + `DataSyncPanel.jsx`. `DailyRecord`를 CSV export/import(4.6-B).
- 다른 기기에서 CSV import로 복원(같은 날짜 처리 정책 명시).
- **완료 기준:** 내보낸 CSV를 다른 브라우저/기기에서 가져오면 기록이 그대로 복원된다.

### P2 — 로그인 저장소 이관

**[ ] #6 Supabase 연동 — 로그인 시 서버 동기화**
- `supabase.js`. 프로젝트/테이블(`profiles`,`daily_records`) 생성, 클라이언트 연결, RLS 설정(4.6-C).
- 로그인 시 localStorage 데이터를 Supabase로 업서트 + 서버 데이터를 로컬로 병합.
- **완료 기준:** 로그인하면 로컬 기록이 Supabase에 올라가고, 다른 기기 로그인 시 동일 데이터가 보인다.

### 이번 주 비범위 (자리만 확보)
- F5 주변 가게 추천, F6 달력 기록(달력 표시는 `compliant` 필드로 데이터만 준비).
- 알레르기·기저질환 선택 UI 확장, 위치 지정 검색, 시간대별 기록.
- 음식/식당 카드 표시정보 체크리스트(원하는 정보만 표시).
- 프로젝트 이름/로고 확정, UI 대폭 개편.
- 소셜 로그인, 비밀번호 해시(데모 후), 다국어, 접근성 고도화.

---

## 8. 완료 기준 (Definition of Done) — 2주차

**기존 유지**
- [ ] 음식 사진 업로드 시 3~10초 내 AI(Gemini 3 Flash Preview) 영양분석 JSON이 카드로 표시.
- [ ] "오늘 부족 영양소 상위 3개"가 내 권장량 기준으로 정확히 계산·표시(신체정보 입력 시).
- [ ] 부족분 기반 저녁 메뉴 2~3개 추천 표시.
- [ ] OpenRouter 키가 프론트 번들·깃허브에 노출되지 않음.
- [ ] 배포 URL에서 데모 시나리오 1회 완주 가능.

**2주차 신규**
- [x] AI 호출이 OpenRouter(Gemini 3 Flash Preview)로 전환되어 정상 동작. ✅ **완료**
- [ ] 로그인/신체정보 없이 첫 화면에서 바로 영양 분석까지 도달 가능(게스트).
- [ ] 사진 없이 메뉴명만 입력해도 영양 카드가 표시.
- [ ] 포장지 뒷면 영양성분표 사진 1장으로 칼로리·탄단지·나트륨이 표기 수치대로 카드에 채워짐.
- [ ] 분석 결과가 날짜별로 localStorage에 저장·재조회됨.
- [ ] CSV 내보내기 후 다른 브라우저/기기에서 가져오면 기록이 그대로 복원됨.
- [ ] 로그인 시 로컬 기록이 Supabase에 업로드되고, 다른 기기에서 로그인하면 동일 데이터가 불러와짐.
- [ ] Supabase anon key만 노출, RLS로 유저별 데이터 접근 제한.
