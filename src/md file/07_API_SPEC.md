# 📄 07_API_SPEC.md

# Portfolio Zero-to-One Builder

---

# 0. 변경 배경

기존 API는 Repository/Resume/JobDescription/Matching/Portfolio를 각각 등록·분석·매칭하는 구조였다. 피봇 이후 Resume, JD, Matching API는 제거하고, 인터뷰 세션 중심의 API로 재정의했다. 상세 배경은 [[01_PRD]] 0장 참고.

---

# 1. 문서 목적

본 문서는 Portfolio Zero-to-One Builder의 API 명세를 정의한다.

AI 분석(코드 스캔)과 인터뷰 응답 생성은 비동기 Job 또는 즉시 응답 방식으로 처리한다.

---

# 2. API 설계 원칙

## 2.1 RESTful API

```text
POST /repositories
GET /repositories/{id}/candidates
POST /interviews
POST /interviews/{id}/messages
```

## 2.2 JSON 기반 통신

모든 요청과 응답은 JSON 형식을 사용한다.

## 2.3 코드 스캔은 비동기 Job, 인터뷰 응답은 동기 처리

레포지토리 스캔은 시간이 걸릴 수 있어 Job으로 처리하고, 인터뷰 메시지 응답은 스트리밍 없이 요청/응답(동기)으로 처리한다. (MVP에서는 스트리밍 제외)

## 2.4 공통 응답 형식

성공

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

실패

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "",
    "message": ""
  }
}
```

---

# 3. 인증(Authentication)

MVP에서는 회원가입/로그인 없이 **토큰 기반 익명 세션**으로 동작한다.

```
인터뷰 세션 생성 시 추측 불가능한 랜덤 UUID(interview_id)를 발급

↓

이후 모든 요청은 이 UUID를 알아야만 처리 (Google Docs 공유 링크와 동일한 방식)

↓

UUID는 순차 증가 값이 아니어야 하며, 응답 본문/로그에 불필요하게 노출하지 않는다
```

로그인 기반 계정 인증(JWT 등)은 Private 레포 지원이 필요해지는 시점에 함께 도입한다 (18장 향후 확장 참고). 서버가 GitHub API를 호출할 때 사용하는 Personal Access Token은 이것과 별개의 서버 전용 자격증명이며 유저 인증과 무관하다 ([[05_CODE_SCANNER_SCORER]] 10장 참고).

---

# 4. Repository API

## Repository 등록 및 스캔 시작

### POST

```text
/api/v1/repositories
```

### Request

```json
{
  "repository_url": "https://github.com/user/project"
}
```

### Response

```json
{
  "repository_id": "repo_001",
  "job_id": "job_001",
  "status": "PENDING"
}
```

---

## 후보 파일 조회

### GET

```text
/api/v1/repositories/{repositoryId}/candidates
```

### Response

CandidateFileSchema 목록 ([[09_DATA_SCHEMA]] 참고)

---

# 5. Interview API

## 인터뷰 세션 시작

### POST

```text
/api/v1/interviews
```

### Request

```json
{
  "repository_id": "repo_001"
}
```

### Response

```json
{
  "interview_id": "interview_001",
  "question": "",
  "cited_code": ""
}
```

---

## 답변 제출 및 다음 질문 수신

### POST

```text
/api/v1/interviews/{interviewId}/messages
```

### Request

```json
{
  "answer": ""
}
```

### Response

```json
{
  "judgement": "SUFFICIENT | AMBIGUOUS | LOW_UNDERSTANDING",
  "content_type": "PROBLEM_SOLVING | IMPLEMENTATION_INTRO",
  "next_question": "",
  "portfolio_markdown": ""
}
```

`next_question`이 follow-up(재질문)인지, 같은 파일의 다음 chunk에 대한 질문인지, 다음 후보 파일의 신규 질문인지는 `judgement`와 서버가 관리하는 `current_chunk_index`/`current_candidate_index`로 판단한다 ([[08_DATABASE]] 8장 참고).

---

## 인터뷰 현재 마크다운 조회

### GET

```text
/api/v1/interviews/{interviewId}/markdown
```

### Response

```json
{
  "portfolio_markdown": ""
}
```

---

## 인터뷰 종료

### POST

```text
/api/v1/interviews/{interviewId}/complete
```

---

# 6. Export API

## Markdown 다운로드

### GET

```text
/api/v1/interviews/{interviewId}/export/md
```

---

# 7. Job API

코드 스캔 작업 진행 상태를 조회한다.

## Job 조회

### GET

```text
/api/v1/jobs/{jobId}
```

### Response

```json
{
  "job_id": "job_001",
  "status": "RUNNING",
  "progress": 65
}
```

status

* PENDING
* RUNNING
* COMPLETED
* FAILED

---

# 8. API ↔ Agent 매핑 표

API | 호출되는 Agent
-- | --
POST /repositories | Code Scanner & Scorer
GET /repositories/{id}/candidates | Code Scanner & Scorer (조회)
POST /interviews | Question Generator
POST /interviews/{id}/messages | Ambiguity Checker → Writer / Tone Agent
GET /interviews/{id}/export/md | Export (Writer 결과 그대로 반환)

---

# 9. API Versioning

```text
/api/v1/...
```

Breaking Change 발생 시 `/api/v2/...`를 사용한다.

---

# 10. API 보안

* HTTPS 사용
* CORS 설정
* Rate Limit 적용
* 입력값 검증 (repository_url 형식 검증 등)
* **SSRF 방지**: `repository_url`은 호스트가 `github.com`인지 서버에서 반드시 검증한 뒤에만 접근한다. 내부망 주소를 GitHub URL처럼 위장해 서버가 대신 접근하게 만드는 공격을 차단한다.
* **레포 규모 상한**: 파일 개수가 임계값을 넘는 레포는 스캔 자체를 거부한다.

---

# 11. API 실행 흐름

```text
Frontend

↓

Repository 등록 (스캔 시작)

↓

후보 파일 조회

↓

인터뷰 세션 시작

↓

메시지 반복 제출

↓

인터뷰 종료

↓

Markdown Export
```

---

# 12. 향후 확장

* Resume/JD 선택 입력 API
* Streaming Message API (SSE)
* Interview Prep API
* Career Report API
* Private 레포 지원 (GitHub OAuth 로그인 도입, 계정 기반 인증으로 전환)
* 세션 재개 API (브라우저를 닫았다가 돌아와도 기존 interview_id로 이어서 진행)
* Markdown 편집 API (지금은 마크다운 프리뷰가 읽기 전용이지만, markdown_content를 단순 문자열로 저장해두어 나중에 편집 기능을 붙여도 데이터 모델 변경이 필요 없도록 설계함)

기존 API 구조를 변경하지 않고 확장 가능하도록 설계한다.

---

# 13. 핵심 설계 요약

Portfolio Zero-to-One Builder의 API는 **인터뷰 세션 중심 API**를 지향한다.

코드 스캔은 비동기 Job으로, 인터뷰 메시지는 동기 요청/응답으로 처리하며, Frontend는 매 응답마다 갱신된 전체 마크다운을 받아 프리뷰를 다시 렌더링한다.

API는 [[09_DATA_SCHEMA]]에서 정의한 공통 Schema를 기반으로 데이터를 주고받는다.
