# 수직 슬라이스 기능 검증 — 포트폴리오 저장·최근 기록 조회

> 검증일: 2026-07-14
>
> 검증 Agent: [`feature-verifier`](../../.claude/skills/feature-verifier/SKILL.md)
>
> 관련 이슈: [#8](https://github.com/dolphin1404/NaverConnect_wm/issues/8) →
> [#9](https://github.com/dolphin1404/NaverConnect_wm/issues/9) →
> [#10](https://github.com/dolphin1404/NaverConnect_wm/issues/10)

## 검증 대상

사용자가 결과 화면에서 포트폴리오를 저장하면 React가 Express API를 호출하고, Express가
Supabase `portfolios` 테이블에 저장한다. 저장 응답으로 최근 목록이 갱신되고, 기록을 선택하면
DB에서 상세 HTML을 조회해 미리보기가 바뀐다.

## 요구사항 추적표

| 요구사항                  | FE                                                     | BE                                               | DB                                | 증거                           |  판정   |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------------ | --------------------------------- | ------------------------------ | :-----: |
| React 저장·최근 기록 화면 | `PortfolioLibrary`의 loading/empty/success/error state | `/api/portfolios` 호출                           | 목록 메타데이터·상세 HTML 분리    | client API 테스트 4개, build   |  PASS   |
| Express 저장 API          | JSON 입력·201 응답 처리                                | `POST /api/portfolios`, 입력 길이 검증           | Data API insert                   | server API/service 테스트      |  PASS   |
| Express 목록·상세 API     | 목록 표시·불러오기                                     | `GET /api/portfolios`, `GET /api/portfolios/:id` | created_at 최신순 select          | server API/service 테스트      |  PASS   |
| Supabase 한 테이블        | secret은 클라이언트에 없음                             | 서버 환경 변수만 사용                            | migration, 제약, index, RLS, 권한 | SQL 정적 검토                  |  PASS   |
| mock 화면 흐름            | `VITE_USE_MOCK_PORTFOLIOS=true`                        | 서버 불필요                                      | 메모리 저장소                     | mock 저장→목록→상세 테스트     |  PASS   |
| 실제 FE→BE→DB→FE          | 구현 연결 완료                                         | API 계약 완료                                    | 실제 프로젝트 미설정              | `server/.env` 없음             | BLOCKED |
| 브라우저 클릭 검증        | 로컬 서버 기동                                         | 해당 없음                                        | mock 사용                         | 인앱 브라우저 런타임 권한 오류 | BLOCKED |
| 계획·검증 Agent           | `feature-slice`, `feature-verifier`                    | 계층별 검증 절차                                 | 실제 행 검증 절차                 | 공식 validator                 |  PASS   |

## 실행 결과

```text
feature-verifier validator: Skill is valid!
client: 4 tests passed
server: 7 tests passed
lint: client/server passed
build: Vite production build passed
```

실행 명령:

```bash
npm test
npm run lint
npm run build
```

## 실패·차단 항목

### 실제 Supabase smoke test — BLOCKED

원인: `server/.env`에 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`가 없고 migration을 적용할 대상
Supabase 프로젝트가 지정되지 않았다.

해제 절차:

1. Supabase SQL Editor에서 `supabase/migrations/202607140001_create_portfolios.sql` 실행
2. `server/.env`에 URL과 서버 전용 secret key 설정
3. `/api/health`에서 `databaseConfigured=true` 확인
4. 고유한 테스트 이름으로 `POST /api/portfolios`
5. 반환된 ID로 `GET /api/portfolios/:id` 후 HTML 일치 확인

### 브라우저 클릭 검증 — BLOCKED

원인: 로컬 Vite mock 서버는 기동했지만 인앱 브라우저 런타임이 Windows `EPERM` 오류로
시작되지 않았다. 별도 브라우저 자동화로 우회하지 않고 mock API 테스트를 증거로 남겼다.

## 최종 판정

코드·자동 테스트 기준 수직 슬라이스는 완성됐다. 과제의 “실제로 DB에 저장·조회” 완료 판정은
Supabase 프로젝트에 migration과 환경 변수를 적용하고 smoke test를 통과한 뒤 내릴 수 있다.
