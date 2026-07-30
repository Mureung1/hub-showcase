## 🌐 Live Demo

👉 https://kyungminnn999.github.io/hub/

# 👗 Pick My Clothes

> **상황 맞춤 옷 코디 추천 AI Agent**

AI Agent 서비스 개인 프로젝트

---

## 💡 프로젝트 소개

약속에 나가기 전 **"뭐 입지?"** 고민하다 늦어본 경험, 있으신가요?

**Pick My Clothes**는 사용자의 옷장, 오늘의 상황(장소·일정·날씨), 대화를 AI Agent가 분석하여 빠르게 코디를 추천하는 서비스입니다.

---

## 🎯 해결하는 문제

> **"약속에 나가기 전, 무엇을 입을지 고민하다가 약속에 늦은 적이 있다."**

| 원인 | 설명 |
|------|------|
| 선택 과부하 | 옷은 많지만 상황에 맞는 조합을 떠올리기 어렵다. |
| 상황-옷 매칭 부재 | 회의, 데이트, 친구 모임마다 적합한 스타일이 다르다. |
| 날씨·장소 미반영 | 날씨와 장소를 고려하지 않아 다시 갈아입느라 시간을 낭비한다. |
| 시간 압박 | 출발 직전에 결정해야 해서 고민 시간이 길어지고 지각한다. |

**Pick My Clothes**는 "무엇을 입을지" 고민하는 시간을 줄여, 상황에 맞는 코디를 빠르게 결정할 수 있도록 돕습니다.

---

# ✨ 핵심 기능

## 1️⃣ 상황 기반 코디 추천

장소, 상황(목적), 날씨를 입력하면 AI Agent가 그에 맞는 코디 2~3개를 추천합니다.

**예시**

> 강남 / 회의 / 흐림 18°C  
> → 블라우스 + 슬랙스 + 가디건

---

## 2️⃣ 내 옷장 기반 추천

사용자가 업로드한 실제 보유 의류만으로 코디를 구성합니다.

- AI가 의류를 자동 분석
- 카테고리 분류
- 색상 분석
- 스타일 태깅
- 지금 바로 입을 수 있는 조합 추천

---

## 3️⃣ AI Agent 대화형 추천

단순히 버튼을 누르는 방식이 아니라,

AI Agent와 대화하며

- 현재 상황 확인
- 추천 이유 설명
- 스타일 변경
- 추가 질문

등을 자연스럽게 진행할 수 있습니다.

---

## 4️⃣ 새 옷 포함 코디 + 구매 링크

미래 약속을 준비할 때

**'새로운 옷'** 기능을 선택하면

- 기존 옷
- 새로 구매하면 좋은 아이템

을 함께 추천합니다.

필요한 경우 구매 링크도 제공합니다.

---

## 5️⃣ 대화형 코디 피드백

이미 정한 코디에 대해서도 AI에게 자연어로 질문할 수 있습니다.

예시

> "오늘 블라우스에 치마를 입을 건데 신발은 뭐가 어울릴까?"

↓

AI Agent

> "메리제인 구두나 로퍼를 추천드립니다."

또한

- 내 옷장에 있는 신발 사진 제공
- 없다면 쇼핑 링크 제공

까지 지원합니다.

---

# 🧭 사용자 시나리오

## 📝 Scenario A : 오늘 나갈 때 (내 옷장 기반)

```
약속 전 고민

↓

Pick My Clothes 접속

↓

장소 · 상황 · 날씨 입력

↓

(최초 1회)
옷장 사진 업로드

↓

AI가 내 옷장에서
2~3가지 코디 추천

↓

코디 선택 후 출발
```

---

## 📝 Scenario B : 미래 코디 계획 (새 옷 포함)

```
미래 약속 계획

↓

상황 입력

↓

새로운 옷 버튼 클릭

↓

AI 추천

↓

쇼핑 링크 제공

↓

코디 저장
```

---

## 📝 Scenario C : 대화형 코디 피드백

```
코디 일부 결정

↓

AI Agent에게 질문

↓

코디 피드백 제공

↓

옷장 리마인드
또는
쇼핑 링크 제공

↓

최종 코디 완성
```

---

## 시스템 아키텍처

Pick My Clothes는 React 프론트엔드, Express 서버, Gemini API,
Supabase로 구성되어 있습니다.

```
flowchart LR
    USER([사용자])

    subgraph FRONT["React · Vite 프론트엔드"]
        direction TB

        APP["App.tsx<br/>전체 상태 및 화면 관리"]

        LOGIN["LoginPanel<br/>회원가입 · 로그인"]
        CLOSET["ClosetTab<br/>내 옷장 조회 · 추가 · 삭제"]
        OUTFIT["OutfitsTab<br/>날씨 · 장소 · 상황 선택"]
        RESULT["추천 결과 화면<br/>코디 및 스타일리스트 설명"]
        SAVED["저장 코디 · 캘린더<br/>추천 기록 관리"]

        LOCAL[("LocalStorage<br/>비회원 데이터 임시 저장")]

        APP --> LOGIN
        APP --> CLOSET
        APP --> OUTFIT
        OUTFIT --> RESULT
        RESULT --> SAVED

        APP <-->|비회원 데이터 저장·불러오기| LOCAL
    end

    subgraph SERVER["Express 서버"]
        direction TB

        API["POST /api/recommend<br/>추천 요청 처리"]
        VALIDATE["입력값 및 추천 모드 확인<br/>My Closet / New Outfit"]
        CATALOG[("자체 상품 카탈로그<br/>productCatalog.ts")]
        FALLBACK["로컬 추천 규칙<br/>Gemini 실패 시 fallback"]

        API --> VALIDATE
        VALIDATE -->|New Outfit 상품 조회| CATALOG
        VALIDATE --> FALLBACK
    end

    subgraph AI["Google Gemini API"]
        GEMINI["Gemini AI 스타일리스트<br/>조건 분석 및 상품 ID 선택"]
    end

    subgraph DB["Supabase"]
        direction TB

        AUTH["Supabase Auth<br/>사용자 인증"]
        USERDATA[("user_data 테이블<br/>closet<br/>saved_styles<br/>calendar_events<br/>profile")]
    end

    USER -->|화면 조작| APP

    OUTFIT -->|"POST /api/recommend<br/>날씨 + 장소 + 상황 + 옷장 + 추천 모드"| API

    VALIDATE -->|"프롬프트 + 선택 가능한 옷 목록"| GEMINI
    GEMINI -->|"추천 상품 ID + stylistNote"| VALIDATE

    CATALOG -->|"상품 이미지 · 이름 · 브랜드 · 가격"| API
    FALLBACK -->|"대체 추천 결과"| API

    API -->|"JSON 추천 결과"| OUTFIT
    OUTFIT -->|"상품 ID를 실제 옷 정보와 연결"| RESULT

    LOGIN <-->|"회원가입 · 로그인 · 세션 확인"| AUTH

    APP <-->|"옷장 · 저장 코디<br/>캘린더 · 프로필 조회/저장"| USERDATA
    AUTH -->|"인증된 user_id"| USERDATA

    RESULT -->|"추천 코디 저장"| APP
    CLOSET -->|"옷 추가 · 삭제"| APP
    SAVED -->|"저장 코디 · 일정 수정"| APP

```

---

# 📄 프로젝트 문서

## 📋 Project Management

### Dashboard

- [Pick My Clothes Dashboard](https://github.com/users/kyungminnn999/projects/1)
---

## 📚 Documents

- [Development Task](./project-docs/task.md)
- [Backlog](./project-docs/BACKLOG.md)
- [Planning](./project-docs/PLANNING.md)
- [Design Skill](./project-docs/design-skill.md)
- [CLAUDE.md](./CLAUDE.md)

---

## 🛠️ Tech Stack

### Frontend

- React
- Vite
- JavaScript
- CSS

### Backend

- Express

### AI

- Gemini API

### Deployment

- GitHub Pages

---

## 👤 Developer

**김경민**

경북대학교 IT대학 컴퓨터학부 글로벌소프트웨어융합전공

AI Agent Challenge 프로젝트