# 5단계 — 필터링 로직 + 대시보드 카드뷰

> 상태: ✅ **완료** (2026-07-13)

---

## 개요

219건 크롤링 데이터와 사용자 프로필을 매칭시켜 **맞춤형 공고 필터링**을 구현하고, **Prototype 디자인 기반 완성도 높은 대시보드**를 구축했습니다.

---

## 구현 사항

### 백엔드

#### 1. 매칭 알고리즘 (`matchingService.ts`)
- **Pure Function 기반**: LLM 연동 시 손쉽게 교체 가능
- **매칭 로직**:
  - 전공(majors[]): 사용자 전공이 포함되거나 조건 없으면 PASS
  - 학년(grades[]): 사용자 학년이 범위에 포함되거나 조건 없으면 PASS
  - 거주지(regions[]): 사용자 거주지가 포함되거나 조건 없으면 PASS
  - 재학상태(enrollmentStatuses[]): 매칭되거나 조건 없으면 PASS
  - 나이(ageMin/Max): 범위 내 또는 조건 없으면 PASS
  - 소득(incomeMax): 사용자 분위 ≤ 공고 조건 또는 조건 없으면 PASS
- **반환값**: `{ isEligible, matchedCount, totalCriteria, score }`

```typescript
matchUserToPosting(user, eligibility) → {
  isEligible: boolean  // 모든 조건 만족 여부
  score: 0-100        // 매칭도 퍼센트
}
```

#### 2. 필터링 API (`postings.ts`)

**GET /api/postings?limit=20&offset=0&category=all**
- 인증 필수 (JWT)
- 사용자 프로필 기반 자동 필터링
- 각 공고의 매칭도 계산해서 반환
- 스크랩 상태 포함

```json
{
  "data": {
    "postings": [
      {
        "id": "uuid",
        "title": "2025 SW 해커톤",
        "category": "COMPETITION",
        "isEligible": true,
        "matchScore": 85,
        "isScraped": false,
        "eligibility": { ... }
      }
    ],
    "pagination": {
      "total": 219,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

**POST /api/postings/:id/scrap**
- 스크랩 토글
- 동일 공고 재클릭 시 스크랩 해제

**GET /api/postings/:id**
- 공고 상세 조회
- 매칭도 + 스크랩 상태 포함

### 프론트엔드

#### 1. DashboardLayout.tsx (완성도 높은 전체 레이아웃)

**구조:**
```
┌─────────────────────────────────────────────────────┐
│  좌측 사이드바(220px) │ 메인 콘텐츠 │ 우측 패널(272px) │
├──────────────────┼──────────────────┼────────────────┤
│ • 로고             │ • 상단바         │ • 미니캘린더    │
│ • 프로필 카드     │ • 페이지 제목    │ • 마감일정      │
│ • 네비게이션      │ • 카테고리 탭    │ • 여유시간      │
│ • 스마트 추천카드 │ • 공고 카드 그리드 │ • 프로필 매칭 │
│                  │ • 페이지네이션  │                 │
└──────────────────┴──────────────────┴─────────────────┘
```

**주요 기능:**
- 카테고리별 탭 필터링 (전체, 공모전, 대외활동, 정책, 행사)
- 3열 그리드 레이아웃
- 페이지네이션 (12개씩)
- 모달 미니캘린더
- 마감일정 요약

#### 2. PostingCard.tsx

**표시 정보:**
- 카테고리 배지 (색상 구분)
- 제목 (2줄 말줄임)
- 매칭도 (%)
- "지원 가능" / "조건 불일치" 뱃지
- D-Day (마감일 기반)
- 자격요건 요약 (전공, 학년, 거주지, 나이, 소득)
- 스크랩 버튼 (토글)
- 원문 링크

**D-Day 색상:**
- 6일 이상: 회색
- 3-5일: 주황
- 1-2일: 빨강
- 0일(오늘): 빨강
- 음수(지남): 회색

#### 3. 디자인 시스템

Prototype 기반 design-guide.md 준수:
- **색상 팔레트**: Indigo, Gray, Green, Orange, Red
- **카테고리별**: 공모전(#fef3c7), 대외활동(#ede9fe), 정책(#d1fae5), 행사(#dbeafe)
- **타이포그래피**: 10px ~ 22px
- **간격**: 8px, 12px, 16px, 24px
- **보더 반경**: 6px, 8px, 12px, 9999px

### API 클라이언트

```typescript
postingsApi.list(limit, offset, category)     // 필터링 목록
postingsApi.detail(id)                        // 상세 조회
postingsApi.scrap(id)                         // 스크랩 토글
```

---

## 데이터 흐름

```
사용자 로그인
    ↓
프로필 설정
    ↓
대시보드 진입
    ↓
GET /api/postings (자동 필터링)
    ↓
UserProfile vs Eligibility 매칭 (matchingService)
    ↓
219건 → 필터링된 결과 + 매칭도
    ↓
카드 그리드 렌더링
```

---

## 기술 스택

| 계층 | 기술 |
|------|------|
| **백엔드** | Express, Prisma, PostgreSQL/Supabase |
| **프론트엔드** | React 18, TypeScript, Inline Styles |
| **상태관리** | 로컬 state (React hooks) |
| **API** | REST (fetch) |
| **디자인** | design-guide.md 기준 |

---

## 주요 성과

✅ **219건 공고 기준 필터링 성공**
- 사용자 프로필 자동 분석
- 매칭도 계산 (0-100%)

✅ **완성도 높은 UI**
- Prototype 레이아웃 재현
- Responsive Grid (350px 최소)
- D-Day 시각화

✅ **향후 확장성**
- matchingService.ts → LLM 연동 가능
- 가중치 기반 스코어링 추가 가능
- 추천 알고리즘 통합 가능

---

## 다음 단계 (6단계)

**캘린더 연동 - 2가지 옵션**

### 옵션 A: Google Calendar API (권장)
- Google OAuth 연동
- 실시간 공고 마감일 동기화
- 사용자 개인 일정 통합
- 푸시 알림

### 옵션 B: iCalendar (.ics 내보내기)
- Google Calendar, Outlook, Apple Calendar 호환
- 브라우저 기반 다운로드/구독
- OAuth 불필요

**선택 예정:** Google Calendar API (더 나은 UX)

---

## 파일 구조

```
backend/src/
├── services/
│   └── matchingService.ts       # 매칭 알고리즘
└── routes/
    └── postings.ts              # 필터링 API

frontend/src/
├── pages/
│   ├── DashboardLayout.tsx      # 전체 레이아웃 (Prototype 기반)
│   └── Dashboard.tsx            # 이전 버전 (참고용)
├── components/
│   └── PostingCard.tsx          # 카드 컴포넌트
└── utils/
    └── apiClient.ts             # postingsApi 클라이언트
```

---

## 테스트 결과

✅ **219건 공고 로드 성공**
- 브라우저: 3열 그리드 표시
- 페이지네이션: 정상 작동
- 스크랩 토글: 정상 작동
- 카테고리 필터링: 정상 작동

---

## 다음 문서

→ `docs/stage6-calendar.md` (캘린더 연동)

