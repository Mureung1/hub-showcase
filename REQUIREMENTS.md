# 요구사항: 관심 공고 북마크 (Spring Boot 수직 슬라이스)

feature-verifier 에이전트가 이 문서를 기준으로 PASS/FAIL을 판정합니다.
서버는 http://localhost:8080 에서 실행됩니다.

## 수용 조건

1. **저장하면 DB에 남는다.**
   `POST /api/bookmarks` 에 {userId, postingId}를 보내면 201과 생성 레코드가 온다.
   이후 `GET /api/bookmarks?userId=...` 목록에 그 공고가 포함된다.

2. **목록은 공고 정보를 조인해 돌려준다.**
   응답의 각 항목에 title, company가 채워져 있다 (job_postings/companies 조인).

3. **필수값이 없으면 거부한다.**
   userId 또는 postingId가 null이면 `POST` 는 400을 반환한다 (@Valid).

4. **userId 파라미터가 없으면 거부한다.**
   `GET /api/bookmarks` (userId 없음) 는 400을 반환한다.

5. **중복 저장을 막는다.**
   같은 userId + postingId 로 두 번 저장하면 두 번째는 409를 반환한다.

6. **삭제가 동작한다.**
   `DELETE /api/bookmarks/{id}` 는 204를 반환하고 목록에서 사라진다.
   없는 id를 삭제하면 404를 반환한다.

7. **본인 것만 조회된다.**
   `GET /api/bookmarks?userId=A` 는 userId=A 의 북마크만 반환한다.

## 검증용 curl (참고)
```bash
# 저장
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/api/bookmarks \
  -H "Content-Type: application/json" -d '{"userId":1,"postingId":1}'   # 201 기대
# 중복 → 409
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/api/bookmarks \
  -H "Content-Type: application/json" -d '{"userId":1,"postingId":1}'   # 409 기대
# 필수값 누락 → 400
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/api/bookmarks \
  -H "Content-Type: application/json" -d '{"userId":1}'                 # 400 기대
# 조회
curl -s "http://localhost:8080/api/bookmarks?userId=1"
# userId 없음 → 400
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8080/api/bookmarks"  # 400 기대
```

## 범위 밖
- 로그인/인증 (userId는 숫자로 고정)
- 페이지네이션
