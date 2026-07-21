# Supabase 서버 재시작 영속성 검증

> 검증일: 2026-07-21
> 대상: React → Express → Supabase의 포트폴리오 저장·목록·상세 조회

## 결론

PASS — Express 서버를 완전히 종료하고 다시 실행한 뒤에도 새로 저장한 행이 동일한 UUID와 HTML로 조회됐다.

~~~text
databaseConfigured: true
저장 전 목록: 1건
POST 응답: 201
저장 ID: 084b46cf-47ae-45e0-a6c4-a3b819c03bc8
서버 재시작 후 목록: 2건
상세 조회 유지: true
목록 조회 유지: true
저장 이름: Persistence Check 20260721-185450
~~~

검증용 행은 영속성 증거로 유지한다. 현재 삭제 API가 없으므로 자동 검증 과정에서 기존 데이터나 검증 행을 삭제하지 않는다.

## 왜 서버를 재시작해도 남는가

React state와 Express 프로세스 메모리는 새로고침하거나 서버를 종료하면 사라진다. 반면 포트폴리오 행은 별도 원격 저장소인 Supabase PostgreSQL의 portfolios 테이블에 저장된다. 새 Express 프로세스가 같은 Supabase 프로젝트를 조회하면 이전 프로세스가 저장한 행을 다시 받을 수 있다.

~~~mermaid
flowchart LR
  FE[React 화면] -->|POST /api/portfolios| BE1[Express 프로세스 A]
  BE1 -->|INSERT| DB[(Supabase portfolios)]
  BE1 -. 종료 .-> OFF[프로세스 메모리 제거]
  BE2[Express 프로세스 B] -->|SELECT by id| DB
  DB -->|동일 UUID와 HTML| BE2
  BE2 -->|GET 응답| FE
~~~

## 테이블과 쿼리 기본 개념

### 테이블

테이블은 같은 종류의 데이터를 행과 열로 저장한다. portfolios의 한 행은 포트폴리오 하나이며 주요 열은 다음과 같다.

| 열 | 의미 |
| --- | --- |
| id | 행을 유일하게 식별하는 UUID 기본키 |
| name, title | 목록에 표시할 이력서 정보 |
| theme_slug, theme_name | 선택한 디자인 정보 |
| html | 다시 미리볼 전체 포트폴리오 HTML |
| created_at | 저장 시각과 최신순 정렬 기준 |

### INSERT

POST /api/portfolios가 입력을 검증한 뒤 Supabase Data API에 INSERT를 요청한다. 성공하면 생성된 행을 받고 Express는 HTTP 201로 반환한다.

### SELECT

- GET /api/portfolios: created_at desc로 최신 목록을 조회한다. 목록 응답은 큰 html을 제외한다.
- GET /api/portfolios/:id: UUID가 같은 행 하나를 조회하고 html을 포함한다.

### RLS와 서버 키

migration은 RLS를 활성화하고 anon, authenticated 역할의 직접 접근을 회수한다. Supabase secret key는 Express 환경 변수에만 두며 브라우저에 전달하지 않는다. 다만 현재 Express API 자체에는 로그인과 사용자별 소유권 검사가 없으므로 공개 배포 전 user_id와 인증·인가 설계가 필요하다.

## 실제 검증 순서

1. 숨김 프로세스로 Express를 실행한다.
2. /api/health에서 databaseConfigured=true만 확인한다.
3. 고유한 이름과 작은 HTML을 POST /api/portfolios로 저장한다.
4. 응답의 UUID를 기록하고 Express 프로세스 트리를 종료한다.
5. 새 Express 프로세스를 실행한다.
6. 같은 UUID로 상세 조회해 HTML과 이름을 비교한다.
7. 최신 목록에도 같은 UUID가 포함되는지 확인한다.
8. 새 프로세스를 종료한다.

환경 변수 값, Supabase URL, secret key, 요청 헤더는 출력하지 않았다.

## 자동 테스트와 live 검증의 차이

현재 서버 테스트 7개는 fetch를 mock 처리하므로 입력 검증과 API 계약의 회귀를 빠르게 찾는 데 적합하다. 그러나 원격 네트워크, 실제 테이블, RLS, 서버 재시작 영속성은 증명하지 못한다.

- 자동 테스트: 매 커밋에서 빠르게 실행하는 mock 기반 계약 검증
- live smoke test: 승인된 Supabase 환경에서 필요할 때만 실행하는 실제 저장·재조회 검증

databaseConfigured=true도 환경 변수 문자열이 있다는 뜻일 뿐 네트워크·테이블·권한이 정상이라는 보장은 아니다. 실제 POST와 GET이 성공해야 DB 연결을 PASS로 판정한다.

## 남은 학습·보안 항목

- migration 적용 이력과 스키마 변경·롤백 방법
- 검증 데이터 보존 기간과 삭제 정책
- 사용자 인증과 행 소유권(user_id) 기반 RLS
- backup·retention·복구 절차
- DB에서 조회한 HTML을 iframe srcDoc에 표시할 때의 sandbox와 신뢰 경계
