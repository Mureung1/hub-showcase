# 이력 기반 AI 채용 매칭 서비스 — API 설계서

> 문서 버전: v0.1 (MVP)
> 대응 기획서: `기획서.md` v0.1
> 스타일: REST / JSON / JWT 인증
> 상태 기준: `기획서.md`의 F1~F7 기능·데이터 모델을 그대로 매핑

---

## 0. 설계 전제

기획서에 명시되지 않은 부분은 아래 기본값으로 설계했다. MVP 검증 후 조정 가능.

| 항목 | 채택 | 이유 |
|------|------|------|
| API 스타일 | REST | Next/FastAPI 조합에서 가장 빠른 검증. GraphQL은 확장 시 재검토 |
| 인증 | JWT (Access + Refresh) | 이메일 기반 인증(F1), 소셜 로그인 후순위와 정합 |
| LLM 작업(문서 생성·요구조건 추출) | **비동기 잡 패턴** | 응답 10~30초 소요 → 요청/폴링 분리. 스트리밍은 대안 |
| 이력(Credential) 모델 | 단일 리소스 + `type` 판별 | 데이터 모델의 `Credential(유형)` 구조를 그대로 따름 |
| 포지션 수집(F3) | 내부(admin/service) 엔드포인트 | 사용자 노출 아님. 크롤링/API 리스크는 기획서 8장 참고 |

---

## 1. 공통 규약

### 1.1 기본 정보
- **Base URL**: `https://api.example.com/api/v1`
- **Content-Type**: `application/json; charset=utf-8`
- **인증 헤더**: `Authorization: Bearer <access_token>`
- **버전**: URL 경로 버전(`/v1`)

### 1.2 페이지네이션 (목록 공통)
쿼리 파라미터로 제어하고, 응답은 `data` + `pagination`으로 감싼다.

```
GET /positions?page=1&size=20&sort=match_score:desc
```

```json
{
  "data": [ /* ... */ ],
  "pagination": {
    "page": 1,
    "size": 20,
    "total_items": 137,
    "total_pages": 7,
    "has_next": true
  }
}
```

### 1.3 에러 포맷 (공통)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "email 형식이 올바르지 않습니다.",
    "details": [
      { "field": "email", "reason": "invalid_format" }
    ]
  }
}
```

| HTTP | code 예시 | 상황 |
|:---:|-----------|------|
| 400 | `VALIDATION_ERROR` | 요청 바디/파라미터 오류 |
| 401 | `UNAUTHORIZED` | 토큰 없음/만료 |
| 403 | `FORBIDDEN` | 타인 리소스 접근 |
| 404 | `NOT_FOUND` | 리소스 없음 |
| 409 | `CONFLICT` | 이메일 중복 등 |
| 422 | `UNPROCESSABLE` | 형식은 맞으나 처리 불가(예: 이력 0건인데 매칭 요청) |
| 429 | `RATE_LIMITED` | LLM 호출 과다 |
| 500 | `INTERNAL_ERROR` | 서버 오류 |

### 1.4 비동기 잡 패턴 (LLM 공통)
매칭 재계산·문서 생성처럼 오래 걸리는 작업은 잡을 생성하고 상태를 폴링한다.

```
POST /...   → 202 Accepted { "job_id": "...", "status": "queued" }
GET  /jobs/{job_id}  → { "status": "processing" | "succeeded" | "failed", "result": {...} }
```

`status` 값: `queued` → `processing` → `succeeded` / `failed`

---

## 2. 엔드포인트 맵 (요약)

| 도메인 | 메서드 | 경로 | 기획서 대응 |
|--------|:---:|------|:---:|
| 인증 | POST | `/auth/signup` | F1 |
| 인증 | POST | `/auth/login` | F1 |
| 인증 | POST | `/auth/refresh` | F1 |
| 인증 | POST | `/auth/logout` | F1 |
| 인증 | GET | `/auth/me` | F1 |
| 이력 | GET | `/credentials` | F2 |
| 이력 | POST | `/credentials` | F2 |
| 이력 | GET | `/credentials/{id}` | F2 |
| 이력 | PATCH | `/credentials/{id}` | F2 |
| 이력 | DELETE | `/credentials/{id}` | F2 |
| 포지션 | GET | `/positions` | F3·F4 |
| 포지션 | GET | `/positions/{id}` | F5 |
| 매칭 | GET | `/positions/{id}/match` | F4·F5 |
| 매칭 | POST | `/matches/recompute` | F4 |
| 매칭 | GET | `/jobs/{job_id}` | F4·F6 (공통) |
| 문서 | POST | `/positions/{id}/documents` | F6 |
| 문서 | GET | `/documents` | F6 |
| 문서 | GET | `/documents/{id}` | F6 |
| 문서 | PATCH | `/documents/{id}` | F6 |
| 문서 | DELETE | `/documents/{id}` | F6 |
| 지원 | POST | `/positions/{id}/apply` | F7 |
| (내부) 수집 | POST | `/internal/positions/ingest` | F3 |
| (내부) 추출 | POST | `/internal/positions/{id}/extract-requirements` | F4 |

---

## 3. 인증 (F1)

### 3.1 회원가입
`POST /auth/signup`

요청:
```json
{
  "email": "seojun@example.com",
  "password": "••••••••",
  "name": "김서준"
}
```
응답 `201`:
```json
{
  "user": { "id": "usr_01H...", "email": "seojun@example.com", "name": "김서준", "created_at": "2026-07-09T09:00:00Z" },
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```
- 중복 이메일 → `409 CONFLICT`
- 가입 직후 이력 입력을 유도하되, 필수 여부는 기획서 10장(열린 이슈)에서 확정. 본 설계는 **가입과 이력 입력을 분리**(가입 후 별도 단계).

### 3.2 로그인
`POST /auth/login` → 요청 `{ email, password }`, 응답은 3.1과 동일한 토큰 세트.

### 3.3 토큰 갱신
`POST /auth/refresh` → `{ "refresh_token": "..." }` → 새 access_token 발급.

### 3.4 로그아웃
`POST /auth/logout` → refresh_token 무효화. 응답 `204`.

### 3.5 내 정보
`GET /auth/me` → 현재 사용자 + 이력 요약(개수).
```json
{
  "id": "usr_01H...", "email": "seojun@example.com", "name": "김서준",
  "credential_summary": { "certification": 2, "portfolio": 1, "career": 1, "company": 1 }
}
```

---

## 4. 이력 관리 (F2)

이력은 단일 리소스 `Credential`이며 `type`으로 종류를 구분한다. `content`는 type별로 스키마가 다르므로 JSON 오브젝트로 유연하게 받는다.

**type**: `certification`(자격증) · `portfolio`(포트폴리오) · `career`(경력) · `company`(회사)

### 4.1 이력 목록
`GET /credentials?type=career` (type 미지정 시 전체)
```json
{
  "data": [
    {
      "id": "cr_01...", "type": "career", "title": "백엔드 개발",
      "content": { "role": "백엔드 개발자", "skills": ["Python", "AWS"], "description": "..." },
      "period": { "start": "2022-03", "end": null, "is_current": true },
      "created_at": "2026-07-09T09:10:00Z"
    }
  ]
}
```

### 4.2 이력 추가
`POST /credentials`

type별 `content` 권장 스키마:

```jsonc
// certification (자격증)
{ "type": "certification",
  "title": "정보처리기사",
  "content": { "issuer": "한국산업인력공단", "issued_at": "2021-05" } }

// portfolio (포트폴리오)
{ "type": "portfolio",
  "title": "매칭 서비스 사이드프로젝트",
  "content": { "url": "https://...", "stack": ["Next.js", "FastAPI"], "summary": "..." } }

// career (경력)
{ "type": "career",
  "title": "백엔드 개발",
  "content": { "company": "OO테크", "role": "백엔드 개발자", "skills": ["Python","AWS"], "description": "..." },
  "period": { "start": "2022-03", "end": null, "is_current": true } }

// company (재직 회사)
{ "type": "company",
  "title": "OO테크",
  "content": { "industry": "SaaS", "size": "50-100" },
  "period": { "start": "2022-03", "is_current": true } }
```
응답 `201`: 생성된 Credential 객체.

> ⚠️ 이력 변경(생성/수정/삭제)은 매칭 점수를 무효화한다. 서버는 해당 사용자의 `MatchScore`를 stale로 표시하고, 다음 `/positions` 조회 또는 `/matches/recompute` 시 재계산한다(§6.2).

### 4.3 이력 상세 / 수정 / 삭제
- `GET /credentials/{id}`
- `PATCH /credentials/{id}` — 부분 수정. 응답 `200`.
- `DELETE /credentials/{id}` — 응답 `204`.
- 타인 이력 접근 → `403 FORBIDDEN`.

---

## 5. 포지션 목록·상세 (F3 노출, F4·F5)

### 5.1 포지션 목록 — 적합도 순 정렬 (핵심)
`GET /positions`

이 서비스의 홈 화면. 로그인 사용자 기준으로 **매칭 점수 내림차순**이 기본 정렬.

쿼리 파라미터:
| 파라미터 | 예시 | 설명 |
|----------|------|------|
| `sort` | `match_score:desc`(기본) / `collected_at:desc` | 정렬 |
| `job_category` | `backend` | 직군 필터(MVP는 1~2개 직군으로 좁힘) |
| `location` | `서울` | 지역 필터 |
| `min_score` | `0.5` | 최소 적합도 |
| `page`, `size` | | 페이지네이션 |

응답:
```json
{
  "data": [
    {
      "id": "pos_01...",
      "company": "네이버",
      "title": "백엔드 개발자 (플랫폼)",
      "job_category": "backend",
      "location": "성남",
      "source_url": "https://recruit.example.com/123",
      "collected_at": "2026-07-08T00:00:00Z",
      "match": {
        "score": 0.92,
        "status": "ready",           // ready | computing | stale
        "matched_count": 4,
        "required_total": 5
      }
    }
  ],
  "pagination": { "page": 1, "size": 20, "total_items": 137, "total_pages": 7, "has_next": true }
}
```
- `match.status`
  - `ready`: 최신 점수
  - `computing`: 재계산 중(이력 변경/신규 유저) → 클라이언트는 폴링 또는 잠시 후 재조회
  - `stale`: 재계산 필요(트리거 전)
- 이력이 0건이면 매칭 없이 `collected_at` 순으로 반환하고, 응답 메타에 `"match_available": false` 표시.

### 5.2 포지션 상세
`GET /positions/{id}` — 공고 요약 정보. 적합도 분해는 별도(5.3)로 분리해 상세 화면을 가볍게 유지.
```json
{
  "id": "pos_01...",
  "company": "네이버",
  "title": "백엔드 개발자 (플랫폼)",
  "job_category": "backend",
  "location": "성남",
  "source_url": "https://recruit.example.com/123",
  "description_summary": "공고 원문을 LLM으로 요약한 텍스트...",
  "requirements": [
    { "id": "req_1", "text": "Python 3년 이상", "is_required": true, "weight": 0.4 },
    { "id": "req_2", "text": "AWS 운영 경험", "is_required": true, "weight": 0.3 },
    { "id": "req_3", "text": "정보처리기사", "is_required": false, "weight": 0.2 },
    { "id": "req_4", "text": "팀 리딩 경험", "is_required": false, "weight": 0.1 }
  ],
  "collected_at": "2026-07-08T00:00:00Z"
}
```

---

## 6. 매칭 (F4·F5)

### 6.1 나의 적합도 분해 + 방향 제시
`GET /positions/{id}/match`

기획서 4.2 예시와 5장 "방향 제시"를 그대로 API로 표현한 핵심 엔드포인트.

```json
{
  "position_id": "pos_01...",
  "score": 0.75,
  "status": "ready",
  "computed_at": "2026-07-09T09:20:00Z",
  "breakdown": [
    { "requirement_id": "req_1", "text": "Python 3년 이상", "is_required": true,
      "weight": 0.4, "fulfillment": 1.0, "contribution": 0.40,
      "matched_credentials": ["cr_01..."], "evidence": "경력 4년" },
    { "requirement_id": "req_2", "text": "AWS 운영 경험", "is_required": true,
      "weight": 0.3, "fulfillment": 0.5, "contribution": 0.15,
      "matched_credentials": ["cr_03..."], "evidence": "부분 경험" },
    { "requirement_id": "req_3", "text": "정보처리기사", "is_required": false,
      "weight": 0.2, "fulfillment": 1.0, "contribution": 0.20,
      "matched_credentials": ["cr_05..."], "evidence": "보유" },
    { "requirement_id": "req_4", "text": "팀 리딩 경험", "is_required": false,
      "weight": 0.1, "fulfillment": 0.0, "contribution": 0.00,
      "matched_credentials": [], "evidence": null }
  ],
  "gaps": [
    { "requirement_id": "req_4", "text": "팀 리딩 경험", "severity": "low" }
  ],
  "guidance": [
    "AWS 부분 경험을 '운영/배포 자동화' 맥락으로 구체화하면 req_2 충족도를 높일 수 있습니다.",
    "팀 리딩 경험은 없지만, 사이드프로젝트에서의 협업·주도 사례로 보완 서술 가능합니다.",
    "Python 4년 경력은 강점이므로 이력서 상단에 배치하세요."
  ]
}
```

- `fulfillment`(0~1)와 `weight` 곱이 `contribution`, 그 합이 `score`. 기획서 4.1 수식과 일치.
- `guidance`는 LLM 생성. 지연이 크면 이 필드만 비동기로 채우고 `"guidance_status": "computing"`을 반환하는 변형 가능.

### 6.2 매칭 재계산 트리거
`POST /matches/recompute`

이력을 크게 바꾼 뒤 강제 재계산할 때. 대상 범위를 옵션으로.
```json
{ "scope": "all" }            // 또는 { "scope": "position", "position_id": "pos_01..." }
```
응답 `202`:
```json
{ "job_id": "job_match_01...", "status": "queued" }
```
- 진행 상태는 `GET /jobs/{job_id}`로 폴링(§1.4).
- MVP는 직군을 좁혀 포지션 풀이 작으므로, 단일 사용자 재계산은 수 초 내 완료를 목표로 한다(기획서 4.3).

---

## 7. AI 문서 생성 (F6)

이력서·자기소개서를 포지션에 맞춰 생성. LLM 지연 때문에 **비동기 잡**으로 설계한다.

### 7.1 생성 요청
`POST /positions/{id}/documents`
```json
{
  "doc_type": "resume",          // resume(이력서) | cover_letter(자기소개서)
  "tone": "professional",         // 선택: professional | concise | passionate
  "language": "ko"
}
```
응답 `202`:
```json
{ "job_id": "job_doc_01...", "status": "queued" }
```

### 7.2 생성 상태·결과
`GET /jobs/{job_id}`
```json
{
  "job_id": "job_doc_01...",
  "status": "succeeded",
  "result": {
    "document_id": "doc_01...",
    "doc_type": "resume",
    "position_id": "pos_01...",
    "content": "생성된 이력서 마크다운/텍스트...",
    "created_at": "2026-07-09T09:30:00Z"
  }
}
```
- `failed` 시 `result: null` + `error` 필드.
- **대안**: 실시간 타이핑 UX가 필요하면 SSE 스트리밍(`GET /jobs/{job_id}/stream`)을 추가.

### 7.3 문서 목록 / 상세
- `GET /documents?position_id=pos_01...&doc_type=resume`
- `GET /documents/{id}`

### 7.4 문서 편집 (사용자 검수)
`PATCH /documents/{id}` — 기획서 8장(할루시네이션 대비 검수 필수)에 따라 편집 저장 지원.
```json
{ "content": "사용자가 수정한 최종 텍스트..." }
```
응답 `200`: 수정된 문서. 편집 범위(전체 vs 부분)는 기획서 10장 열린 이슈이며, 본 설계는 전체 편집 저장을 기본으로 둔다.

### 7.5 문서 삭제 / 재생성
- `DELETE /documents/{id}` → `204`
- `POST /documents/{id}/regenerate` → 같은 포지션·옵션으로 새 잡 생성(선택 기능).

---

## 8. 외부 지원 연결 (F7)

`POST /positions/{id}/apply`

플랫폼 내 제출은 범위 밖(기획서 3.2). 지원 클릭을 기록하고 원본 채용 페이지 URL을 반환한다.
```json
// 요청 (어떤 문서를 들고 지원하는지 선택적으로 기록)
{ "document_id": "doc_01..." }
```
응답 `200`:
```json
{
  "redirect_url": "https://recruit.example.com/123",
  "clicked_at": "2026-07-09T09:40:00Z"
}
```
- 클릭 기록은 남기되, **실제 지원 완료 추적은 불가**(기획서 8장-5 감수 사항). 통계 지표로만 활용.

---

## 9. (내부) 포지션 수집·요구조건 추출 (F3·F4)

사용자에게 노출되지 않는 서비스/관리자 전용. 인증은 별도 service token 권장.

### 9.1 공고 적재
`POST /internal/positions/ingest`
```json
{
  "source": "worknet_api",       // 크롤링 대신 공식/공공 API 우선(기획서 8장-1)
  "company": "네이버",
  "title": "백엔드 개발자 (플랫폼)",
  "job_category": "backend",
  "location": "성남",
  "source_url": "https://recruit.example.com/123",
  "raw_description": "공고 원문 전체 텍스트..."
}
```
응답 `201`: 저장된 JobPosting. 적재 후 요구조건 추출 잡을 자동 트리거해도 된다.

### 9.2 요구조건 추출 (LLM)
`POST /internal/positions/{id}/extract-requirements`
- 공고 원문 → LLM으로 `JobRequirement[]`(조건 텍스트·필수여부·추정 가중치) 구조화(기획서 4.3).
- 응답 `202` + `job_id`.

---

## 10. 데이터 모델 보강

기획서 6장 모델에 API 동작에 필요한 필드를 보강했다(★ = 신규/구체화).

| 엔티티 | 필드 |
|--------|------|
| **User** | id, email, password_hash, name★, created_at |
| **Credential** | id★, user_id, type(certification/portfolio/career/company), title★, content(JSONB)★, period(start/end/is_current)★, created_at, updated_at★ |
| **JobPosting** | id, company, title, job_category★, location★, source, source_url, raw_description, description_summary★, collected_at |
| **JobRequirement** | id★, posting_id, text, is_required, weight, embedding(pgvector)★ |
| **MatchScore** | id★, user_id, posting_id, score, status(ready/computing/stale)★, breakdown(JSONB)★, computed_at |
| **GeneratedDoc** | id, user_id, posting_id, doc_type(resume/cover_letter), content, is_edited★, created_at, updated_at★ |
| **Job**★ (비동기 잡) | id, user_id, type(match/document), status, result(JSONB), error, created_at |

- `Credential.content`, `MatchScore.breakdown`은 JSONB로 유연 저장.
- `JobRequirement.embedding`, (선택) `Credential` 임베딩은 pgvector로 유사도 계산(기획서 4.3).

---

## 11. 인증·권한·개인정보

- **모든 사용자 데이터 엔드포인트는 소유자 검증**: 토큰의 user_id ≠ 리소스 소유자 → `403`.
- **비밀번호**: bcrypt/argon2 해시 저장. 평문 미저장.
- **민감 이력 암호화**: 자격증·경력·회사 등은 민감정보(기획서 8장-2). 저장 시 암호화, 전송 시 TLS, 수집 동의 절차 필요.
- **레이트 리밋**: LLM 호출(문서 생성·매칭·추출)은 사용자/토큰당 제한 → `429`. 비용 관리(기획서 8장-4).
- **내부 엔드포인트**(§9)는 공개 API와 분리하고 service token 또는 IP 화이트리스트로 보호.

---

## 12. MVP 이후 확장 여지

기획서 3.2 / 9장 로드맵과 연결.

| 확장 | API 추가 방향 |
|------|---------------|
| 신규 포지션 알림 | `/notifications`, 웹훅/구독 리소스 |
| 지원 이력 관리(ATS) | `/applications` 리소스로 승격(현재는 클릭 기록만) |
| 소셜 로그인 | `/auth/oauth/{provider}` |
| 기업 회원·직접 지원(양면화) | `/companies`, `/positions`(쓰기 권한), 제출 엔드포인트 |
| 결제·구독 | `/billing`, 생성 횟수 쿼터 연동 |

---

## 13. 미결정 사항 (기획서 10장 연동)

API 확정 전 결정이 필요한 항목:

1. **채용 데이터 확보 방식** → §9 `source` 값과 스키마가 여기에 종속. 법적 검토 선행.
2. **가입 시 이력 입력 필수 여부** → §3.1 가입 응답과 온보딩 플로우에 영향.
3. **문서 편집 범위(전체 vs 부분)** → §7.4 `PATCH` 스키마 확정.
4. **매칭 재계산 시점**(이력 저장 즉시 vs 배치) → §6.2 트리거 정책.
