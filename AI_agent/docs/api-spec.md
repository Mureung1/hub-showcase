# API 명세서 - Career Mission AI

## 기본 정보

- Base URL: `http://localhost:4000`
- 프론트엔드 환경 변수: `VITE_API_BASE_URL`
- Content-Type: `application/json`
- 인증 방식: `Authorization: Bearer <JWT>`
- 공통 오류 응답:

```json
{
  "message": "오류 메시지",
  "details": {}
}
```

## 인증 API

### 회원가입

- Method: `POST`
- Path: `/api/auth/register`
- 인증: 불필요
- 사용 화면: 회원가입

Request body:

```json
{
  "name": "홍길동",
  "username": "user123",
  "email": "user@example.com",
  "password": "abc123!",
  "school": "전북대학교",
  "major": "컴퓨터공학과",
  "verificationOrigin": "http://localhost:5173"
}
```

성공 응답 `201`:

```json
{
  "ok": true,
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "username": "user123",
    "name": "홍길동",
    "school": "전북대학교",
    "major": "컴퓨터공학과",
    "emailVerified": false,
    "verifiedAt": null
  }
}
```

주요 실패:

- `400`: 필수 입력 누락
- `400`: 아이디 형식 오류
- `400`: 이메일 형식 오류
- `400`: 비밀번호 형식 오류
- `500`: 이메일 발송 실패 또는 서버 오류

### 로그인

- Method: `POST`
- Path: `/api/auth/login`
- 인증: 불필요
- 사용 화면: 로그인

Request body:

```json
{
  "account": "user123",
  "password": "abc123!"
}
```

성공 응답 `200`:

```json
{
  "ok": true,
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "username": "user123",
    "name": "홍길동",
    "school": "전북대학교",
    "major": "컴퓨터공학과",
    "emailVerified": true,
    "verifiedAt": "2026-07-15T00:00:00.000Z"
  },
  "token": "jwt-token"
}
```

주요 실패:

- `400`: 계정 또는 비밀번호 누락
- `500`: 계정 없음, 비밀번호 불일치, 이메일 미인증

### 내 정보 조회

- Method: `GET`
- Path: `/api/auth/me`
- 인증: 필요
- 사용 화면: 마이페이지, 세션 복구

성공 응답 `200`:

```json
{
  "ok": true,
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "username": "user123",
    "name": "홍길동",
    "school": "전북대학교",
    "major": "컴퓨터공학과",
    "emailVerified": true,
    "verifiedAt": "2026-07-15T00:00:00.000Z"
  }
}
```

주요 실패:

- `401`: 토큰 없음 또는 유효하지 않은 토큰

### 이메일 인증

- Method: `POST`
- Path: `/api/auth/verify-email`
- 인증: 불필요
- 사용 화면: 이메일 인증 완료 화면

Request body:

```json
{
  "token": "verification-token"
}
```

성공 응답 `200`:

```json
{
  "ok": true,
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "username": "user123",
    "name": "홍길동",
    "school": "전북대학교",
    "major": "컴퓨터공학과",
    "emailVerified": true,
    "verifiedAt": "2026-07-15T00:00:00.000Z"
  }
}
```

주요 실패:

- `400`: 토큰 누락
- `400`: 유효하지 않거나 만료된 토큰

### 인증 메일 발송

- Method: `POST`
- Path: `/api/auth/verification-email`
- 인증: 불필요
- 사용 위치: 이메일 재발송 또는 별도 인증 메일 발송 유틸

Request body:

```json
{
  "email": "user@example.com",
  "name": "홍길동",
  "verificationUrl": "http://localhost:5173/verify-email?token=..."
}
```

성공 응답 `200`:

```json
{
  "ok": true
}
```

주요 실패:

- `400`: 이메일 형식 오류
- `400`: 인증 링크 형식 오류
- `500`: SMTP 발송 실패

### SMTP 상태 확인

- Method: `GET`
- Path: `/api/auth/smtp-status`
- 인증: 불필요
- 사용 위치: 개발/운영 설정 점검

성공 응답 `200`:

```json
{
  "ok": true
}
```

## 스펙 API

### 내 스펙 조회

- Method: `GET`
- Path: `/api/specs/me`
- 인증: 필요
- 사용 화면: 스펙 등록, 마이페이지, 분석

성공 응답 `200`:

```json
{
  "ok": true,
  "spec": {
    "id": "clx...",
    "userId": "clx...",
    "targetRole": "백엔드 개발자",
    "grade": "3학년",
    "gpa": "4.1",
    "certificates": "정보처리기사",
    "languageScore": "TOEIC 850",
    "projects": "Spring 기반 팀 프로젝트",
    "activities": "동아리 백엔드 파트",
    "skills": "Java, Spring, SQL",
    "createdAt": "2026-07-15T00:00:00.000Z",
    "updatedAt": "2026-07-15T00:00:00.000Z"
  }
}
```

스펙이 없을 때:

```json
{
  "ok": true,
  "spec": null
}
```

### 내 스펙 저장

- Method: `POST`
- Path: `/api/specs`
- 인증: 필요
- 사용 화면: 스펙 등록

Request body:

```json
{
  "targetRole": "백엔드 개발자",
  "grade": "3학년",
  "gpa": "4.1",
  "certificates": "정보처리기사",
  "languageScore": "TOEIC 850",
  "projects": "Spring 기반 팀 프로젝트",
  "activities": "동아리 백엔드 파트",
  "skills": "Java, Spring, SQL"
}
```

성공 응답 `200`:

```json
{
  "ok": true,
  "spec": {
    "id": "clx...",
    "userId": "clx...",
    "targetRole": "백엔드 개발자",
    "grade": "3학년",
    "gpa": "4.1",
    "certificates": "정보처리기사",
    "languageScore": "TOEIC 850",
    "projects": "Spring 기반 팀 프로젝트",
    "activities": "동아리 백엔드 파트",
    "skills": "Java, Spring, SQL",
    "createdAt": "2026-07-15T00:00:00.000Z",
    "updatedAt": "2026-07-15T00:00:00.000Z"
  }
}
```

필수 항목:

- `targetRole`
- `grade`
- `gpa`
- `projects`
- `activities`

주요 실패:

- `400`: 필수 항목 누락
- `401`: 인증 실패

## AI 분석 API

### 최신 분석 결과 조회

- Method: `GET`
- Path: `/api/analysis/me`
- 인증: 필요
- 사용 화면: 분석 결과, 마이페이지

성공 응답 `200`:

```json
{
  "ok": true,
  "analysis": {
    "id": "clx...",
    "userId": "clx...",
    "readiness": 72,
    "targetRole": "백엔드 개발자",
    "fitLevel": "적합",
    "portfolioLevel": "보완 필요",
    "burnoutLevel": "낮음",
    "strengths": ["프로젝트 경험이 있음"],
    "gaps": ["배포 경험 보완 필요"],
    "recommendations": ["API 문서화 미션 수행"],
    "analyzedAt": "2026-07-15T00:00:00.000Z"
  }
}
```

분석 결과가 없을 때:

```json
{
  "ok": true,
  "analysis": null
}
```

### 분석 실행

- Method: `POST`
- Path: `/api/analysis`
- 인증: 필요
- 사용 화면: AI 분석

Request body: 없음

성공 응답 `200`:

```json
{
  "ok": true,
  "analysis": {
    "id": "clx...",
    "userId": "clx...",
    "readiness": 72,
    "targetRole": "백엔드 개발자",
    "fitLevel": "적합",
    "portfolioLevel": "보완 필요",
    "burnoutLevel": "낮음",
    "strengths": ["프로젝트 경험이 있음"],
    "gaps": ["배포 경험 보완 필요"],
    "recommendations": ["API 문서화 미션 수행"],
    "analyzedAt": "2026-07-15T00:00:00.000Z"
  }
}
```

주요 실패:

- `400`: 저장된 스펙 없음
- `400`: 분석 필수 스펙 항목 누락
- `401`: 인증 실패
- `500`: OpenAI API 호출 실패 또는 응답 파싱 실패

## 검색 API

### 직업 검색

- Method: `GET`
- Path: `/api/jobs`
- 인증: 불필요
- 사용 화면: 스펙 등록의 목표 직무 입력

Query:

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `keyword` | 아니오 | 검색어. 비어 있으면 전체 직업 목록을 반환할 수 있다. |

성공 응답 `200`:

```json
{
  "jobs": [
    {
      "id": "fallback-system-software",
      "name": "시스템소프트웨어개발자",
      "category": "IT 관련 전문직",
      "summary": "",
      "aliases": ["백엔드 개발자"],
      "matchedAlias": "백엔드 개발자"
    }
  ]
}
```

### 자격증 검색

- Method: `GET`
- Path: `/api/qualifications`
- 인증: 불필요
- 사용 화면: 스펙 등록의 자격증 입력

Query:

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `keyword` | 예 | 최소 2글자 이상 검색어 |

성공 응답 `200`:

```json
{
  "qualifications": [
    {
      "id": "fallback-info-engineer",
      "name": "정보처리기사",
      "type": "국가기술자격",
      "series": "기사",
      "field": "정보통신",
      "subField": "정보기술",
      "aliases": []
    }
  ]
}
```

특이사항:

- 검색어가 2글자 미만이면 빈 배열을 반환한다.
- Q-Net API 호출 실패 또는 키 누락 시 fallback 목록에서 검색한다.

### 학교 검색

- Method: `GET`
- Path: `/api/schools`
- 인증: 불필요
- 사용 화면: 회원가입의 학교 입력

Query:

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `keyword` | 아니오 | 학교명 검색어 |

성공 응답 `200`:

```json
{
  "schools": [
    {
      "id": "mock-jeonbuk-main",
      "name": "전북대학교",
      "type": "일반대학",
      "region": "전북특별자치도",
      "address": "전북특별자치도 전주시 덕진구 백제대로 567",
      "campus": "본교"
    }
  ]
}
```

특이사항:

- 커리어넷 API 키가 없으면 fallback 학교 목록에서 검색한다.

### 전공 검색

- Method: `GET`
- Path: `/api/majors`
- 인증: 불필요
- 사용 화면: 회원가입의 전공 입력

Query:

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `keyword` | 예 | 전공명 검색어 |
| `schoolName` | 아니오 | 선택한 학교명 |

성공 응답 `200`:

```json
{
  "majors": [
    {
      "id": "career-net-major-computer-science",
      "name": "컴퓨터공학과",
      "schoolName": "",
      "campus": "커리어넷 전공 목록",
      "area": "공학계열",
      "source": "career-net-major"
    }
  ]
}
```

특이사항:

- `keyword`가 비어 있으면 빈 배열을 반환한다.
- 커리어넷 API 키가 없으면 fallback 전공 목록에서 검색한다.

## 헬스체크 API

### 서버 상태 확인

- Method: `GET`
- Path: `/api/health`
- 인증: 불필요
- 사용 위치: 서버 실행 확인

성공 응답 `200`:

```json
{
  "ok": true,
  "service": "career-mission-api"
}
```

## 아직 구현되지 않은 API

다음 기능은 Prisma 모델 또는 화면 초안은 있으나 백엔드 라우트가 아직 없다.

- 미션 추천 목록 조회
- 사용자별 미션 시작/진행 상태 저장
- 미션 결과물 URL 또는 파일 업로드
- AI 피드백 저장/조회
- 포트폴리오 자동 생성

구현 전 별도 API 초안을 작성하고, 프론트엔드 화면과 응답 형식을 맞춘 뒤 라우트를 추가한다.
