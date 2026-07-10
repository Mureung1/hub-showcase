# CJMT 개발 스펙 (Claude Code 작업용) — Gemini API 버전

> **CJMT** = Chungnam Just-eat Meal Tracker
> 음식 사진 한 장 → 내 몸 기준 부족 영양소와 보충 메뉴를 알려주는 웹서비스
> 이 문서는 Claude Code에게 전달하는 **개발 명세서**다. AI 호출은 전부 **Google Gemini API**를 사용한다.

---

## 0. 프로젝트 개요

- **목표**: 4주 안에 MVP를 완성도 있게 시연.
- **MVP 핵심 2기능**
  1. **F3 — 사진 → 메뉴 영양분석 (AI 인식)**: 서비스 진입점.
  2. **F4 — 내 몸 기준 부족 영양소 계산·추천**: 차별점(셀링 포인트).
- **MVP 지원 기능(얇게)**: F1 로그인, F2 신체정보 입력·권장량 계산.
- **확장(MVP 성공 후)**: F5 주변 가게 추천(네이버 지도), F6 달력 기록.

> 한 줄 정의: **"음식 사진 한 장 → 내 몸 기준 부족 영양소와 보충 메뉴를 알려주는 웹"**

---

## 1. 기술 스택 (고정)

- **프론트엔드**: React 18 + Vite (SPA)
- **스타일**: 인라인 스타일 또는 CSS 모듈 (Tailwind 미사용)
- **상태관리**: React 내장 훅(useState, useContext)만 사용
- **라우팅**: react-router-dom v6
- **AI 호출**: **Google Gemini API** (`gemini-2.5-flash`) — REST `generateContent`, 이미지(base64 inline) + 텍스트 멀티모달
- **백엔드**: 없음(서버리스 지향). API 키는 **환경변수**로 관리하고, 개발 단계에선 간단한 Node/Express 프록시 서버로 키 노출 방지.
- **데이터 저장**: 1차는 브라우저 메모리 + localStorage. (확장 시 Supabase 등 검토, MVP 범위 밖)
- **배포**: Vercel 또는 Render (정적 호스팅 + 서버리스 함수 프록시).

> ⚠️ **API 키 보안 원칙**: Gemini 키를 프론트 코드에 절대 하드코딩 금지. `.env`(gitignore) + 프록시 경유. 데모 단계라도 키가 깃허브에 올라가지 않게 한다.

---

## 2. 폴더 구조 (기준)

```
cjmt/
├── .env.example            # GEMINI_API_KEY=
├── .gitignore              # .env, node_modules
├── index.html
├── package.json
├── vite.config.js          # /api → 프록시 서버
├── server/
│   └── proxy.js            # POST /api/gemini : Gemini REST 프록시
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── router.jsx
    ├── context/
    │   └── UserContext.jsx  # 로그인 유저 + 신체정보 + 권장량
    ├── lib/
    │   ├── gemini.js        # geminiComplete() 공통 헬퍼
    │   ├── nutrition.js     # 권장 영양소 계산(순수함수)
    │   └── storage.js       # localStorage 래퍼
    ├── pages/
    │   ├── Login.jsx        # F1
    │   ├── Profile.jsx      # F2 신체정보 입력
    │   ├── Analyze.jsx      # F3 사진 업로드·분석
    │   └── Result.jsx       # F4 부족 영양소·추천 결과
    ├── components/
    │   ├── PhotoUpload.jsx
    │   ├── NutritionCard.jsx
    │   ├── DeficiencyBar.jsx
    │   └── MenuRecommendation.jsx
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
  items: [
    { name: string, brand?: string, nutrients: NutrientSet }
  ],
  total: NutrientSet   // items 합산
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
- 모두 **순수함수**로 작성.

### 4.2 Gemini 공통 헬퍼 (`lib/gemini.js`)
프록시(`/api/gemini`) 경유. 텍스트/이미지 겸용.

```js
// 프록시로 { prompt, imageBase64?, mimeType?, jsonOnly? }를 넘기면
// 서버가 Gemini generateContent 형식으로 변환해 호출한다.
export async function geminiComplete({ prompt, imageBase64 = null, mimeType = 'image/jpeg' }) {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, imageBase64, mimeType }),
  });
  if (!res.ok) throw new Error('Gemini 요청 실패: ' + res.status);
  const data = await res.json();
  // 프록시가 candidates[0].content.parts 의 text를 합쳐서 { text }로 내려준다고 가정
  return data.text;
}

// JSON 응답 파싱 유틸: ```json 펜스 제거 후 파싱
export function parseJsonLoose(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}
```

### 4.3 프록시 서버 (`server/proxy.js`) — Gemini REST 변환
- 엔드포인트: `POST /api/gemini`
- 요청 body: `{ prompt, imageBase64?, mimeType? }`
- Gemini 호출 형식으로 변환:
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}
Content-Type: application/json

{
  "contents": [{
    "parts": [
      // 이미지가 있으면:
      { "inline_data": { "mime_type": "<mimeType>", "data": "<imageBase64>" } },
      { "text": "<prompt>" }
    ]
  }]
}
```
- 응답에서 `candidates[0].content.parts[].text`를 이어붙여 `{ text }`로 반환.
- 키는 `process.env.GEMINI_API_KEY`에서만 읽고 절대 클라이언트로 반환하지 않는다.
- 429/네트워크 오류 시 상태코드와 메시지를 그대로 전달(프론트에서 재시도 처리).

### 4.4 사진 영양분석 (`pages/Analyze.jsx`)
- 사용자가 사진 업로드 + (선택) 메뉴명·브랜드 입력.
- 이미지 → base64(순수 데이터, `data:` 접두어 제거) 변환.
- `geminiComplete({ prompt, imageBase64, mimeType })` 호출.
- **프롬프트 원칙**: "프랜차이즈로 식별되면 공식 영양표 기준, 아니면 표준 조리법 기반 추정. 설명·마크다운 없이 MealAnalysis JSON만 반환."
- 응답을 `parseJsonLoose`로 파싱 → `MealAnalysis` 형태 검증.

### 4.5 부족 영양소 계산·추천 (`pages/Result.jsx`)
- `deficiency = recommended - todayTotal` (음수면 초과).
- 부족 상위 2~3개 영양소를 근거로 Gemini에 저녁 보충 메뉴 추천 요청(JSON 반환).
- 시각화: 영양소별 막대(DeficiencyBar) + 추천 메뉴 카드.

---

## 5. 화면 흐름 (라우팅)
```
/login    → F1 로그인/회원가입
/profile  → F2 신체정보 입력 → 권장량 계산·저장
/analyze  → F3 사진 업로드·분석
/result   → F4 부족 영양소 + 보충 메뉴 추천
```
- 로그인 안 됨 → /login 리다이렉트
- 신체정보 없음 → /profile 리다이렉트

---

## 6. UI/디자인 원칙
- 모바일 우선(세로 화면), 카드형 레이아웃.
- 포인트 컬러 1개(그린=건강) + 중립 회색.
- 부족=주황, 충족=그린으로 즉시 구분.
- AI 호출은 수 초 걸리므로 **로딩 상태 필수**.
- 파싱 실패·네트워크 실패 시 사용자 친화 에러 + 재시도 버튼.

---

## 7. 비범위 (Out of Scope, MVP)
- F5 네이버 지도/주변 가게, F6 달력 기록: 구현하지 않음(자리만 비워둠).
- 소셜 로그인, 비밀번호 해시: 데모 후.
- 다국어, 접근성 고도화.

---

## 8. 완료 기준 (Definition of Done)
- [ ] 로그인 → 신체정보 입력 → 권장량 계산까지 끊김 없이 동작.
- [ ] 음식 사진 업로드 시 3~10초 내 Gemini 영양분석 JSON이 카드로 표시.
- [ ] "오늘 부족 영양소 상위 3개"가 내 권장량 기준으로 정확히 계산·표시.
- [ ] 부족분 기반 저녁 메뉴 2~3개 추천 표시.
- [ ] Gemini 키가 프론트 번들·깃허브에 노출되지 않음.
- [ ] 배포 URL에서 데모 시나리오 1회 완주 가능.
