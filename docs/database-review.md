# 데이터베이스 모델 검토

## 현재 DB 구조

### 기존 테이블

#### notices 테이블
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
title TEXT NOT NULL
content TEXT NOT NULL
created_at TEXT DEFAULT CURRENT_TIMESTAMP
```

#### users 테이블
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
email TEXT NOT NULL UNIQUE
password TEXT NOT NULL
name TEXT NOT NULL
created_at TEXT DEFAULT CURRENT_TIMESTAMP
```

#### events 테이블
- **상태**: 아직 생성되지 않음 ❌

---

## 새 JSON 스키마와 DB 매핑

### 공지 정보 (notice)
```json
{
  "title": "공지 제목",
  "summary": "공지 요약"
}
```

**현재 notices 테이블 매핑**:
- `title` → notices.title ✅
- `summary` → notices.content에 저장하거나, 별도 summary 필드 추가 ⚠️

### 일정 정보 (events 배열)
```json
{
  "name": "일정명",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "deadline": "YYYY-MM-DD",
  "time": {"start": "HH:MM", "end": "HH:MM"},
  "location": "장소",
  "deliverables": ["제출물1", "제출물2"],
  "notes": "추가 정보"
}
```

**필요한 events 테이블**:
```
id (PRIMARY KEY)
notice_id (FOREIGN KEY -> notices.id)
user_id (FOREIGN KEY -> users.id)
name TEXT
start_date TEXT (YYYY-MM-DD)
end_date TEXT (YYYY-MM-DD)
deadline TEXT (YYYY-MM-DD)
time_start TEXT (HH:MM)
time_end TEXT (HH:MM)
location TEXT
deliverables TEXT (JSON 형식)
notes TEXT
is_selected BOOLEAN (사용자가 등록 선택했는지)
created_at TEXT
```

---

## 필요한 변경사항

### 1단계: notices 테이블 보강 (선택사항)
현재: `content` 필드로 공지 본문 저장

**옵션 A (권장)**: `content`는 그대로 두고, `summary`는 별도로 저장
- `content` → 원문 보관
- `summary` → AI 분석 결과 요약

**옵션 B**: `content`를 `summary`로 변경
- 변경 필요: analysisController에서도 수정

**결정**: 옵션 A (기존 구조 유지, 필드만 추가)

### 2단계: events 테이블 생성 (필수)
새로운 events 테이블 생성 필요

```sql
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notice_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  deadline TEXT,
  time_start TEXT,
  time_end TEXT,
  location TEXT,
  deliverables TEXT,
  notes TEXT,
  is_selected BOOLEAN DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (notice_id) REFERENCES notices(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 3단계: notices 테이블에 user_id 추가 (필수)
공지를 어느 사용자가 분석했는지 추적 필요

```sql
ALTER TABLE notices ADD COLUMN user_id INTEGER;
ALTER TABLE notices ADD COLUMN summary TEXT;
ALTER TABLE notices ADD FOREIGN KEY (user_id) REFERENCES users(id);
```

---

## 저장 흐름 (3주차 UI → DB)

```
1. 사용자가 공지 텍스트 입력
   ↓
2. Mock analyzeNotice() 호출
   → notice {title, summary}
   → events [{name, startDate, ...}, ...]
   ↓
3. Frontend에서 사용자 수정/선택
   ↓
4. 선택된 일정들만 저장 API 호출
   ↓
5. Backend에서 DB 저장
   - INSERT INTO notices (user_id, title, content, summary) 
   - INSERT INTO events (notice_id, user_id, name, start_date, ...) 
```

---

## JSON 필드 저장 방식

`deliverables` 필드는 배열이므로:

**옵션 1**: JSON 문자열로 저장 (권장)
```sql
deliverables TEXT  -- JSON 문자열: '["제출물1", "제출물2"]'
```

**옵션 2**: 별도 테이블
```sql
CREATE TABLE event_deliverables (
  id INTEGER PRIMARY KEY,
  event_id INTEGER,
  deliverable TEXT,
  FOREIGN KEY (event_id) REFERENCES events(id)
);
```

**결정**: 옵션 1 (단순함, 3주차 수준에서 충분)

---

## 요약: 3주차 월요일 필요 작업

| 항목 | 상태 | 우선순위 |
|------|------|---------|
| notices 테이블에 `user_id` 추가 | ⚠️ 필수 | 높음 |
| notices 테이블에 `summary` 추가 | ⚠️ 권장 | 중간 |
| events 테이블 생성 | ⚠️ 필수 | 높음 |

---

## 다음 단계 (5단계: 통합 테스트)

DB 스키마 수정 후:
1. 새로운 Mock 데이터로 분석 API 테스트
2. 분석 결과를 DB에 저장하는 API 구현 (아직)
3. 저장된 데이터 조회 테스트
