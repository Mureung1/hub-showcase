# API 명세 — 관심 공고 (interests)

Express 서버가 제공하는 엔드포인트. 프론트는 Vite 프록시를 통해 `/api/...` 로 호출한다.
Base(개발): `http://localhost:3000`

관심 공고 하나 = `{ id, company, role, jd, created_at }`

---

## GET /api/interests
관심 공고 **목록** 조회 (최신순).

- 요청 body: 없음
- 응답 `200 OK`:
```json
[
  { "id": 2, "company": "토스", "role": "백엔드 신입", "jd": "필수: Java/Spring...", "created_at": "2026-07-20T08:34:13.319832+00:00" }
]
```

## POST /api/interests
관심 공고 **추가**.

- 요청 body:
```json
{ "company": "토스", "role": "백엔드 신입", "jd": "공고 내용(선택)" }
```
- `company`, `role` 필수 · `jd` 선택
- 응답 `201 Created`: 저장된 행 1개 (위 객체 형태)
- 응답 `400 Bad Request`: `{ "error": "company·role 은 필수입니다" }`
- 응답 `500`: `{ "error": "..." }` (DB 오류 등)

## DELETE /api/interests/:id
관심 공고 **삭제**.

- URL 파라미터: `id` (삭제할 행)
- 응답 `204 No Content`: 성공(본문 없음)
- 응답 `404 Not Found`: `{ "error": "없는 id" }`
- 응답 `500`: `{ "error": "..." }`

---

## 참고 — 원래는 이렇게 관리한다
이 markdown은 "손으로 쓴 최소 명세"다. 현업 표준은 **OpenAPI(Swagger)** — YAML/JSON으로 스펙을 적으면
- 예쁜 문서 UI 자동 생성(Swagger UI)
- 클라이언트 코드 자동 생성
- 요청/응답 검증
이 가능하다. (Spring이면 `springdoc-openapi`가 어노테이션에서 자동 생성)
