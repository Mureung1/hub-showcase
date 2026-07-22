# 테스트 가이드

Day 12에서 정한 테스트 환경/컨벤션 정리. Day 13의 테스트코드 생성 Skill이 참고하는 기준 문서이기도 하다.

## 실행

```
npm test
```

`package.json`의 `test` 스크립트가 `vitest run`을 실행한다.

## 도구

- **vitest** — 테스트 실행기. ESM 네이티브라 이 프로젝트(`"type": "module"`)에 별도 설정 없이 바로 동작해서 Jest 대신 선택.
- **supertest** — Express 라우트에 실제 HTTP 요청을 보내는 테스트 도우미.

## 컨벤션

- **파일 위치**: 소스 파일 옆에 `*.test.js`로 붙인다 (예: `src/services/postContent.js` → `src/services/postContent.test.js`). 별도 `test/` 폴더로 분리하지 않는다.
- **Supabase 연결**: mock 없이 실제 Supabase 프로젝트에 그대로 연결한다. 테스트가 만든 데이터는 `afterEach`에서 직접 지운다 (posts API에 DELETE가 없어서 `supabase` 클라이언트로 직접 삭제). `vitest.setup.js`가 `src/index.js`와 동일한 방식으로 `.env`를 로드해준다.
- **TDD는 이번엔 생략**: 이미 구현된 기능에 나중에 테스트를 붙이는 것이라 "테스트 먼저 → 실패 확인 → 구현" 순서는 밟지 않았다. 대신 기댓값은 코드 실행 결과를 베끼지 않고 `../docs/api-spec.md`/도메인 규칙 기준으로 먼저 정한 뒤 작성했다.

## 원칙

1. 구현이 아니라 행동(behavior)을 테스트 — 리팩토링해도 안 깨지게
2. 테스트 하나 = 시나리오 하나 (여러 케이스를 한 테스트에 몰아넣지 않음)
3. AAA 패턴 (Arrange-Act-Assert)
4. 테스트 이름만 보고 뭘 검증하는지 알 수 있게 작성
5. 독립성 — 테스트 순서와 무관하게 항상 같은 결과 (Supabase 정리 로직으로 보장)
6. happy path + edge case(누락값, 잘못된 값) 둘 다 포함
7. (라우트 테스트) 입력-출력 계약: status code + 응답 형식 검증
8. (라우트 테스트) 사이드 이펙트 확인: 응답만이 아니라 실제로 DB에 반영됐는지까지 확인

## 예시 파일

| 파일 | 성격 | 확인 |
| --- | --- | --- |
| `src/services/postContent.test.js` | 순수 함수 단위 테스트, DB 의존 없음 | `buildNoticePost`의 정상 생성 + 에러 케이스 3종 |
| `src/routes/posts.test.js` | supertest + 실제 Supabase 통합 테스트 | `POST /posts/notice` 생성/검증, 저장 여부 재조회, 400/404 에러 |
