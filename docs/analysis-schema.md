# AI 분석 결과 JSON 스키마

이 문서는 Mock 데이터와 실제 Claude API 응답이 따를 형식을 정의합니다.  
3주차에는 Mock 데이터로, 4주차에는 Claude API로 이 스키마를 채웁니다.

---

## 전체 응답 구조

```json
{
  "notice": {
    "title": "공지 제목",
    "summary": "공지 요약 (2-3문장)"
  },
  "events": [
    {
      "name": "일정명",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "deadline": "YYYY-MM-DD",
      "time": {
        "start": "HH:MM",
        "end": "HH:MM"
      },
      "location": "장소",
      "deliverables": ["제출물1", "제출물2"],
      "notes": "추가 정보"
    }
  ]
}
```

---

## 필드 설명

### `notice` (공지 정보)

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `title` | string | 공지 제목 | "2024 CalMe 겨울 해커톤" |
| `summary` | string | 공지 핵심 내용 요약 (2-3문장) | "겨울 방학 중 진행되는 해커톤 공지입니다. 2024년 12월 15일부터 31일까지 진행됩니다." |

---

### `events` (일정 배열)

배열의 각 요소는 하나의 일정입니다.

#### 필드 정의

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `name` | string | ✅ | 일정명 | "해커톤 신청 마감" |
| `startDate` | string \| null | ❌ | 시작 날짜 (YYYY-MM-DD) | "2024-12-01" |
| `endDate` | string \| null | ❌ | 종료 날짜 (YYYY-MM-DD) | "2024-12-31" |
| `deadline` | string \| null | ❌ | 마감 날짜 (YYYY-MM-DD) | "2024-12-10" |
| `time.start` | string \| null | ❌ | 시작 시간 (HH:MM, 24시간 형식) | "09:00" |
| `time.end` | string \| null | ❌ | 종료 시간 (HH:MM, 24시간 형식) | "18:00" |
| `location` | string \| null | ❌ | 개최 장소 | "서울대학교 공학관 301호" |
| `deliverables` | array | ✅ | 제출물 목록 (빈 배열 가능) | ["GitHub 링크", "발표 자료"] |
| `notes` | string \| null | ❌ | 추가 정보/메모 | "사전 등록 필수" |

---

## 날짜/시간 형식

- **날짜**: `YYYY-MM-DD` (ISO 8601)
  - ✅ "2024-12-31"
  - ❌ "2024/12/31", "12/31/2024"

- **시간**: `HH:MM` (24시간 형식)
  - ✅ "09:00", "18:30"
  - ❌ "9:00", "6:30 PM"

- **null 사용**: 정보가 없으면 `null` (빈 문자열 X)
  - ✅ `"startDate": null`
  - ❌ `"startDate": ""`

---

## 실제 예시

### 예시 1: 정상 케이스 (여러 일정, 모든 정보 포함)

```json
{
  "notice": {
    "title": "2024 CalMe 겨울 해커톤",
    "summary": "겨울 방학 중 진행되는 해커톤입니다. 팀 단위로 참가할 수 있으며, 선발된 팀에게 상품이 지급됩니다."
  },
  "events": [
    {
      "name": "팀 구성 및 신청 마감",
      "startDate": "2024-12-01",
      "endDate": null,
      "deadline": "2024-12-10",
      "time": {
        "start": null,
        "end": null
      },
      "location": null,
      "deliverables": ["팀 구성 정보"],
      "notes": "사전 등록 필수. 팀은 2-4명으로 구성"
    },
    {
      "name": "해커톤 본선",
      "startDate": "2024-12-15",
      "endDate": "2024-12-16",
      "deadline": null,
      "time": {
        "start": "09:00",
        "end": "18:00"
      },
      "location": "서울대학교 공학관 301호",
      "deliverables": ["프로젝트 결과물 (GitHub)", "발표 자료 (PPT/PDF)"],
      "notes": "노트북, 신분증, 충전기 준비"
    },
    {
      "name": "최종 결과물 제출",
      "startDate": null,
      "endDate": null,
      "deadline": "2024-12-31",
      "time": {
        "start": null,
        "end": null
      },
      "location": null,
      "deliverables": ["최종 보고서", "소스 코드"],
      "notes": "온라인 제출 (Google Form 링크 제공 예정)"
    }
  ]
}
```

### 예시 2: 불완전한 케이스 (날짜 일부 누락)

```json
{
  "notice": {
    "title": "겨울 방학 프로젝트",
    "summary": "프로젝트 과제 공지입니다. 마감일은 2025년 1월 31일입니다."
  },
  "events": [
    {
      "name": "프로젝트 제출",
      "startDate": null,
      "endDate": null,
      "deadline": "2025-01-31",
      "time": {
        "start": null,
        "end": null
      },
      "location": null,
      "deliverables": ["최종 보고서", "코드"],
      "notes": "온라인 제출만 인정"
    }
  ]
}
```

### 예시 3: 일정 없음 (요구사항만 있는 경우)

```json
{
  "notice": {
    "title": "학사공지",
    "summary": "이번 학기 학사일정 안내입니다."
  },
  "events": []
}
```

---

## 검증 규칙

1. **필수 필드**: `notice.title`, `notice.summary`, `events` (배열, 비어있을 수 있음)
2. **배열**: `events`는 항상 배열 (최소 0개, 제한 없음)
3. **날짜 유효성**: 
   - `startDate > deadline` 인 경우 주의 필요
   - `endDate < startDate` 인 경우 오류
4. **배열 필드**: `deliverables`는 항상 배열 (빈 배열 가능)
5. **null 값**: 정보가 없으면 `null` 사용 (필수 필드 제외)

---

## 4주차 Claude API 연동 시

이 스키마를 Claude API 프롬프트에서도 동일하게 사용합니다.
클라우드 API는 이 형식으로 JSON을 반환하도록 설정되며,  
3주차의 Mock 데이터와 4주차의 API 응답이 완벽히 호환됩니다.

변경 사항:
- `src/services/analysisService.js` 파일의 `analyzeNotice()` 함수만 수정
- `mockResponses` → `API 호출`로 변경
- 나머지 모든 코드는 그대로 유지
