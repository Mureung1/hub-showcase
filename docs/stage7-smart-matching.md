# 7단계 — 스마트 매칭 로직 (유휴 시간 분석)

## 개요

**목표:** 사용자의 캘린더 일정을 분석하여 준비 시간이 충분한 공고를 우선 추천

**핵심 아이디어:**
- 사용자가 등록한 "바쁜 기간" (시험, 알바 등)을 자동 추출
- 각 공고의 마감일과 바쁜 기간의 관계를 분석
- 시간 여유가 있는 공고를 우선 정렬 및 추천

---

## 로직 흐름

### 1️⃣ 고부하 기간(High Load Period) 식별

```
사용자의 캘린더 이벤트들
    ↓
[시험] 7/20 ~ 7/27
[알바] 7/19 ~ 7/22
[기타] 8/5 ~ 8/8
    ↓
병합 (3일 이내 인접 이벤트)
    ↓
고부하 기간 1: 7/19 ~ 7/27 (시험+알바)
고부하 기간 2: 8/5 ~ 8/8 (기타)
```

**로직:**
- 캘린더 이벤트를 시작일 기준으로 정렬
- 인접한 이벤트들을 병합 (간격 ≤ 3일)
- 최종적으로 "연속된 바쁜 기간" 추출

**코드 위치:**
- `backend/src/services/smartMatchingService.ts::getHighLoadPeriods()`

---

### 2️⃣ 공고와 바쁜 기간의 관계 분석

```
공고 마감일: 7/25 (바쁜 기간 중)
    ↓
[HIGH CONFLICT] 점수: 20점 ⚠️
메시지: "바쁜 기간과 공고 마감일이 겹쳐요. 시간 관리가 필요합니다."

---

공고 마감일: 7/28 (바쁜 기간 1일 후)
    ↓
[LOW CONFLICT] 점수: 85점 ✅
메시지: "바쁜 기간이 끝난 직후 마감입니다. 여유있게 준비할 수 있어요!"

---

공고 마감일: 8/10 (바쁜 기간 후 3주)
    ↓
[NO CONFLICT] 점수: 60점
메시지: "마감까지 넉넉한 시간이 있습니다."
```

**분석 함수:**
- `backend/src/services/smartMatchingService.ts::getConflictLevel()`

---

### 3️⃣ 스코어 계산 규칙

| 상황 | 점수 | 판정 | 추천 메시지 |
|------|------|------|-----------|
| 캘린더 일정 없음 | 50 | 보통 | "캘린더에 일정이 없어 모든 공고를 자유롭게 준비할 수 있어요" |
| 바쁜기간과 완전히 겹침 | 20 | 주의 ⚠️ | "바쁜 기간과 공고 마감일이 겹쳐요. 시간 관리가 필요합니다." |
| 바쁜기간 직후 (1주일 이내) | 85 | 추천 ✅ | "바쁜 기간이 끝난 직후 마감입니다. 여유있게 준비할 수 있어요!" |
| 바쁜기간 후 (1~3주) | 70 | 추천 ✅ | "바쁜 기간 이후라 충분한 시간이 남아있습니다." |
| 마감까지 30일 이상 | 60 | 보통 | "마감까지 넉넉한 시간이 있습니다." |

**점수 계산 함수:**
- `backend/src/services/smartMatchingService.ts::calculateSmartScore()`

---

## 구현 상세

### 백엔드 구현

#### 1. smartMatchingService.ts (새 파일)

```typescript
// 고부하 기간 추출
export function getHighLoadPeriods(events: CalendarEvent[]): HighLoadPeriod[] {
  // 1. hideFromRecommendation이 false인 이벤트만 필터링
  // 2. dtstart 기준으로 정렬
  // 3. 인접 이벤트 병합 (gap ≤ 3일)
  // 4. HighLoadPeriod[] 반환
}

// 겹침 여부 판정
function getConflictLevel(
  receptionEndDate: Date,
  eventStartDate: Date,
  eventEndDate: Date,
  highLoadPeriods: HighLoadPeriod[]
): { level: 'high' | 'low' | 'none'; overlappingPeriod?: HighLoadPeriod }

// 스코어 계산
export function calculateSmartScore(
  posting: Posting,
  userEvents: CalendarEvent[]
): SmartMatchScore {
  // 1. getHighLoadPeriods()로 바쁜 기간 추출
  // 2. getConflictLevel()로 겹침 판정
  // 3. 겹침 정도에 따라 점수 + 메시지 생성
  // 4. SmartMatchScore 반환
}
```

#### 2. postings.ts (GET /api/postings?smart=true)

```typescript
router.get('/', verifyAuth, async (req, res) => {
  const { smart } = req.query // smart=true 파라미터 확인

  if (smart === 'true') {
    // 1. 사용자의 모든 캘린더 이벤트 조회
    const userEvents = await prisma.calendarEvent.findMany({ 
      where: { userId } 
    })

    // 2. 각 공고에 대해 calculateSmartScore() 실행
    const positionsWithScores = postings.map(posting => ({
      ...posting,
      smartScore: calculateSmartScore(posting, userEvents)
    }))

    // 3. 추천여부 우선, 스코어 높은 순으로 정렬
    positionsWithScores.sort((a, b) => {
      if (a.smartScore.isRecommended !== b.smartScore.isRecommended) {
        return a.smartScore.isRecommended ? -1 : 1
      }
      return b.smartScore.score - a.smartScore.score
    })

    // 4. smartScore 포함해서 응답
    return res.json({ data: { postings: positionsWithScores } })
  }
  
  // smart=false인 경우: 기존 필터링만 적용 (smartScore 없음)
})
```

---

### 프론트엔드 구현

#### 1. DashboardLayout.tsx (실제 대시보드)

**상태 추가:**
```typescript
const [useSmartMatching, setUseSmartMatching] = useState(false)
```

**fetchPostings 함수 확장:**
```typescript
const fetchPostings = async (
  category: Category, 
  page: number, 
  smart: boolean = false  // ← 새 파라미터
) => {
  const response = await postingsApi.list(
    limit, 
    page * limit, 
    category, 
    smart  // ← smart 파라미터 전달
  )
  // 응답 처리...
}
```

**useEffect 의존성 추가:**
```typescript
useEffect(() => {
  fetchPostings(selectedCategory, offset / limit, useSmartMatching)
}, [selectedCategory, offset, useSmartMatching])  // ← useSmartMatching 추가
```

**토글 버튼 UI (페이지 제목 옆):**
```tsx
<button
  onClick={() => setUseSmartMatching(!useSmartMatching)}
  style={{
    backgroundColor: useSmartMatching ? '#6366f1' : '#fff',
    color: useSmartMatching ? '#fff' : '#6b7280',
    // ...
  }}
>
  <span>⏰</span>
  <span>시간 최적화</span>
</button>
```

#### 2. apiClient.ts (API 타입 정의)

**Posting 인터페이스 확장:**
```typescript
export interface Posting {
  // 기존 필드들...
  smartScore?: {
    score: number
    reason: string
    isRecommended: boolean
    conflictLevel: 'high' | 'medium' | 'low' | 'none'
  }
}
```

**postingsApi.list 함수:**
```typescript
export const postingsApi = {
  list: async (
    limit = 20, 
    offset = 0, 
    category = 'all', 
    smart = false  // ← 새 파라미터
  ) => {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      category,
    })
    if (smart) {
      params.append('smart', 'true')  // ← smart=true 쿼리 파라미터
    }
    return apiCall(`/postings?${params}`)
  }
}
```

#### 3. PostingCard.tsx (추천 정보 표시)

**스마트 추천 배지:**
```tsx
{posting.smartScore && (
  <span style={{
    backgroundColor: posting.smartScore.isRecommended ? '#dcfce7' : '#fee2e2',
    color: posting.smartScore.isRecommended ? '#22c55e' : '#ef4444',
  }}>
    {posting.smartScore.isRecommended ? '⏰ 추천' : '⏰ 주의'}
  </span>
)}
```

**추천 메시지 박스:**
```tsx
{posting.smartScore && (
  <div style={{
    backgroundColor: posting.smartScore.isRecommended ? '#f0fdf4' : '#fef2f2',
    borderLeft: `3px solid ${posting.smartScore.isRecommended ? '#22c55e' : '#ef4444'}`,
  }}>
    {posting.smartScore.reason}
  </div>
)}
```

---

## 데이터 흐름 (시각화)

```
사용자 대시보드
    ↓
[⏰ 시간 최적화] 버튼 클릭
    ↓
DashboardLayout.tsx
    useSmartMatching = true
    ↓
fetchPostings(category, page, smart=true)
    ↓
API 요청: GET /api/postings?smart=true&category=all&limit=12&offset=0
    ↓
백엔드 postings.ts
    ↓
1. 사용자 캘린더 이벤트 조회
2. 각 공고에 smartScore 계산
3. 추천여부 + 점수로 정렬
4. 응답: { postings: [...smartScore 포함...] }
    ↓
프론트엔드 DashboardLayout.tsx
    setPostings(response.data.postings)
    ↓
각 PostingCard에서 smartScore 표시
    ├─ 배지: "⏰ 추천" 또는 "⏰ 주의"
    └─ 메시지: 한국어 추천 사유
    ↓
화면에 스마트 정렬된 공고 목록 표시
```

---

## 사용 예시

### 시나리오 1: 학생이 시험 기간을 등록한 경우

**캘린더:**
```
7월 20일 ~ 27일: 📚 기말고사
```

**공고 목록:**
| 공고 | 마감일 | 스마트 점수 | 추천 메시지 |
|------|--------|------------|-----------|
| A사 콘테스트 | 7/25 | 20점 | ⏰ 주의: "바쁜 기간과 겹쳐요" |
| B사 공모전 | 7/28 | 85점 | ⏰ 추천: "끝난 직후 여유있게 준비" |
| C사 대외활동 | 8/10 | 60점 | "마감까지 충분한 시간" |

**정렬 결과:**
1. B사 공모전 (85점) ← 추천됨
2. C사 대외활동 (60점)
3. A사 콘테스트 (20점) ← 주의됨

### 시나리오 2: 캘린더에 일정이 없는 경우

**결과:**
- 모든 공고: 50점 (보통)
- 메시지: "캘린더에 일정이 없어 모든 공고를 자유롭게 준비할 수 있어요"
- 정렬: 기존 필터링만 적용 (우선순위 변화 없음)

---

## 주요 설계 결정사항

### 1. 고부하 기간 병합 기준 (3일)

**이유:**
- 토/일 휴식을 고려하면 "연속된 바쁜 기간"의 정의 필요
- 금요일 시험 + 월요일 시험 = 연속된 기간으로 봄
- 차라리 너무 관대하게 병합 (3일 <= gap) → 사용자가 조정 가능

### 2. 마감일 vs 수행기간

**현재 구현:**
- 공고의 **마감일**을 기준으로 점수 계산
- 수행기간(eventStartDate/eventEndDate)도 체크하지만, 마감일이 핵심

**이유:**
- 대부분의 학생은 마감 임박 직전에 준비
- 수행기간이 바쁜 기간과 겹쳐도 준비 시간만 충분하면 가능

### 3. 점수 범위 (20~85점)

**설계:**
- 최소 20점 (주의): 겹치지만 선택 가능
- 최대 85점 (강력 추천): 바쁜 기간 직후
- 중간값 60점: 준비 시간 충분

**이유:**
- 0점은 추천 안 함의 느낌이 너무 강함
- 20점도 "완전히 피하라"보다는 "주의하세요" 정도
- 사용자의 우선순위 판단 존중

### 4. hideFromRecommendation 플래그

**용도:**
- 사용자가 특정 기간에 추천 공고를 "숨기기" 선택 가능
- 예: "7월 20~27일은 시험 기간이니 아예 추천 받고 싶지 않다"

**구현:**
```typescript
// 캘린더 이벤트 생성 시
{
  title: "기말고사",
  type: "EXAM",
  dtstart: "2026-07-20",
  dtend: "2026-07-27",
  hideFromRecommendation: true  // ← 이 기간은 스마트 추천에 제외
}

// 백엔드에서 필터링
const filtered = events.filter(e => !e.hideFromRecommendation)
```

---

## 향후 개선사항 (선택)

### 1. 주당 유휴 시간 계산
```typescript
// 아직 미구현
function getWeeklyIdleHours(events: CalendarEvent[]): number {
  // 1주일(168시간) - 일정 소요 시간 = 유휴 시간
  // 예: 시험 40시간 + 알바 15시간 = 55시간 소요
  //     168 - 55 = 113시간 유휴
}
```

### 2. LLM 기반 추천 메시지
```typescript
// 현재는 규칙 기반, 향후 Claude API로 확장
// "7월 20~27일 시험, 7월 28일 마감, 3일 준비 시간"
// → LLM이 자동 생성: "충분하지 않은 준비 시간입니다. 다른 공고를 고려하세요."
```

### 3. A/B 테스트
- 스마트 정렬 ON vs OFF 사용자 행동 비교
- 실제로 "바쁜 기간 직후" 공고를 더 클릭하는지 검증

---

## 테스트 시나리오

### Case 1: 하루 일정 (하루종일 일정 수정 완료)
```
입력: 7월 22일 ~ 7월 22일 (하루종일 시험)
DB 저장: dtstart=2026-07-22T00:00:00, dtend=2026-07-22T23:59:59
캘린더 표시: 7월 22일에만 점 1개 ✅
```

### Case 2: 여러 날 일정
```
입력: 7월 20일 ~ 7월 27일 (기말고사)
getHighLoadPeriods() 결과:
  [{ start: 2026-07-20, end: 2026-07-27, type: 'EXAM' }]
```

### Case 3: 인접 이벤트 병합
```
입력:
  [알바] 7월 19일 ~ 7월 22일
  [시험] 7월 23일 ~ 7월 27일

getHighLoadPeriods() 결과:
  [{ start: 2026-07-19, end: 2026-07-27, type: '...' }]
  (gap = 1일 <= 3일이므로 병합)
```

### Case 4: 별도 기간 (병합 안 됨)
```
입력:
  [시험] 7월 20일 ~ 7월 27일
  [알바] 8월 5일 ~ 8월 8일

getHighLoadPeriods() 결과:
  [
    { start: 2026-07-20, end: 2026-07-27, type: '...' },
    { start: 2026-08-05, end: 2026-08-08, type: '...' }
  ]
  (gap = 9일 > 3일이므로 별도 기간)
```

---

## 마치며

**7단계 완성 상태:**
- ✅ 고부하 기간 식별 로직
- ✅ 공고 겹침 분석
- ✅ 스코어 계산 및 정렬
- ✅ 추천 메시지 생성
- ✅ 백엔드 API (`GET /api/postings?smart=true`)
- ✅ 프론트엔드 UI (토글 버튼 + 배지 + 메시지)
- ⏳ 주당 유휴 시간 계산 (선택)
- ⏳ 테스트 케이스 작성 (선택)

**다음 단계:** 8단계 — 스크랩 + D-Day 알림
