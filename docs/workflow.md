# 나만의 AI 협업 워크플로우

4주 동안 SpendMate를 만들며 Claude Code와 실제로 어떻게 일했는지, 17개 PR([connect-AIAgentChallenge-26-1/hub](https://github.com/connect-AIAgentChallenge-26-1/hub/pulls?q=is%3Apr+author%3Ajsoyeonj))을 다시 돌아보며 정리한 문서.

## 1. 기본 원칙

- **커밋은 항상 내가 직접 한다.** AI가 코드를 써줘도 최종적으로 "이걸 내 작업으로 남긴다"는 판단과 실행은 내가 한다.
- **새로 배우는 코드는 손코딩, 이미 아는 패턴의 반복이나 버그 수정·문서 갱신은 위임한다.** 매번 "텍스트로 줘" / "네가 해줘"를 작업 단위로 정하면서 진행했다 — 위임 여부를 프로젝트 전체가 아니라 이슈 단위로 판단하는 게 핵심.
- **기획서(`plan.md`)와 체크리스트(`checklist.md`)를 항상 기준점으로 삼는다.** 새 기능을 시작하기 전엔 이 문서들과 맞는 방향인지 먼저 확인한다.

## 2. 반복되는 작업 순서

17개 PR을 순서대로 다시 읽으면서 찾은, 매번 비슷하게 반복된 흐름.

1. `plan.md`/`checklist.md`에서 오늘 할 항목 확인 (또는 어제 PR의 "아직 이해 못한 부분"을 오늘 이어서 배움 — 예: [#1759](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1759) "Claude tool-use 흐름 감이 없음, 내일 F16 시작하며 배워야" → [#1892](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1892)에서 실제로 구현하고 "내가 설명할 수 있는 부분"으로 승격)
2. 범위가 애매하면 `feature-planner`로 쪼갬
3. 구현 (Controller→Service→Repository 패턴을 반복 재사용 — [#1163](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1163), [#1469](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1469)에서 명시적으로 언급)
4. 실제 값 대조 검증 — [#1163](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1163) 이후로 이 습관이 점점 강해짐 (초반 PR엔 없다가, 이후 거의 매번 "실제 API 응답/DB 대조" 등장)
5. `progress-checker`로 방향 점검 ([#803](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/803), [#1163](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1163), [#1281](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1281), [#1759](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1759)에 반복 등장)
6. `code-reviewer`/`env-guard`로 커밋 전 검증 ([#1608](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1608)부터 등장, [#1978](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1978)에서 실제로 크래시 버그를 잡아냄)
7. 커밋 → PR 작성(4칸 채우기)

## 3. 반복되는 문제 해결 패턴

- 사람이 짠 규칙 기반 로직이 예외 케이스에서 깨짐 → LLM에게 판단을 넘기는 방향으로 전환 ([#1281](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1281) 좌표 기반 영수증 파싱이 매장마다 깨져서 Claude 파싱으로 교체)
- 프로덕션/배포 환경 문제는 재현부터 한다 ([#2395](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/2395) CORS 403, [#1978](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1978) JS Date 오버플로)
- "아직 이해 못한 부분"이 다음 PR의 "내가 설명할 수 있는 부분"으로 이어지는 게 거의 매주 반복됨 — 배우는 속도가 아니라 "다음 날 이어받는 습관"이 쌓인 결과에 가까움

## 4. 이슈 하나를 처리할 때 — 입력 / 작업 순서 / 확인 기준 / 결과물

| 구분 | 내용 |
|---|---|
| **입력** | `plan.md`/`checklist.md`의 관련 섹션, GitHub Issue, (있다면) 직전 PR의 "아직 이해 못한 부분" |
| **작업 순서** | 요구사항 확인 → (필요시 `feature-planner`로 쪼개기) → 구현(손코딩 vs 위임 판단) → 검증 → (하루 마무리 시 `progress-checker`로 방향 점검) → `checklist.md`/Issue 정리 → 커밋 |
| **확인 기준** | 컴파일/테스트 통과 + 실제 API 응답·DB 값을 curl/psql/브라우저로 직접 대조 + (배포 환경 관련이면) 배포 URL에서 직접 재현·재검증 |
| **결과물** | 커밋, PR(주요 작업 리스트 + 내가 설명할 수 있는 부분 + 아직 이해 못한 부분 + 새로 알게 된 것), `checklist.md` 갱신, (해당하면) GitHub Issue close |

## 5. 문제가 생겼을 때 다시 확인하는 단계

3번(반복되는 문제 해결 패턴)이 "과거에 이랬다"는 사례라면, 이건 실제로 뭔가 안 맞을 때 밟는 절차.

1. **재현 가능한가?** — 같은 요청/같은 입력으로 다시 실행했을 때 항상 같은 결과가 나오는지 먼저 확인한다. (LLM 판단처럼 비결정적인 부분은 여기서 걸러진다)
2. **실제 값을 직접 찍어본다** — 코드를 눈으로 읽고 추측하지 말고, curl/psql/브라우저 콘솔로 실제 요청·응답·DB 값을 직접 확인한다.
3. **어디서부터 어긋났는지 역추적한다** — 프론트가 보낸 값 → 백엔드가 받은 값 → DB에 저장된 값 → 응답으로 나간 값, 이 순서로 하나씩 짚어가며 예상과 다른 지점을 찾는다.
4. **환경 차이를 의심한다** — 로컬에서만 되거나 배포 환경에서만 안 되면, 환경변수·CORS·시간대·세션(재배포 시 초기화됨) 같은 "코드는 안 바뀌었는데 환경이 다른" 원인을 먼저 체크한다.
5. **고치고 나서 원래 시나리오로 다시 검증한다** — 에러 메시지가 사라진 것만 보고 끝내지 않고, 애초에 하려던 동작(로그인 → 지출 등록 → 화면 반영 등)이 처음부터 끝까지 되는지 다시 확인한다.

## 6. 사용한 Skill / Agent

| 이름 | 종류 | 용도 |
|---|---|---|
| `feature-planner` | Agent | 기능을 하루 단위 작업으로 쪼개고 P0/P1/P2 우선순위 정리 |
| `progress-checker` | Agent | 이미 한 작업(또는 하려는 작업)이 기획서 방향과 맞는지 사후 검증 — 예: `get_budget` Tool을 새로 추가해도 되는지 이걸로 먼저 확인받고 진행 |
| `backend-test-scaffold` | Skill (프로젝트 전용) | `@SpringBootTest` + `@Transactional`, 한글 테스트명 등 이 프로젝트 컨벤션에 맞는 테스트 스캐폴드 생성 — TDD로 F6(소진 예측) 계산 로직을 만들 때 사용 |
| `spendmate-design-rules` | Skill (프론트 전용) | 색상/radius/shadow/카피 톤 등 기존 5개 화면과 어긋나지 않게 새 UI 작업 시 참고 |
| `code-reviewer` / `code-analyzer` / `env-guard` | Agent | 커밋 전 리뷰, 코드 흐름 설명, `.env` 노출 점검용 |

## 7. 실제 사례로 보는 위임 판단

**목요일 F16 Tool 3종(#38/#39/#55) 예시**
- #38(`get_expense_summary`)은 텍스트로 받아 직접 타이핑 — Tool 인터페이스 패턴을 처음 배우는 단계라 손으로 익힘
- #39/#55(`get_subscriptions`/`get_budget`)는 같은 패턴이 이미 손에 익은 뒤라 AI에게 위임 — 반복 구현까지 손코딩할 필요는 없다고 판단

**F6 TDD(#51) 예시**
- 처음엔 테스트 코드를 직접 작성하다 스텁을 잘못된 파일에 붙여넣는 실수가 발생 → "TDD 흐름은 이해했으니 이제부턴 AI가 진행" 하고 위임으로 전환
- 위임하더라도 Red(실패하는 테스트) 단계는 직접 커밋해서, 최소한 "실패를 내가 확인했다"는 지점은 스스로 남김

## 8. 3주차에서 배운 것

- **잘한 점**: 매 기능마다 실제 DB 값·API 응답을 수동으로 대조 검증하는 습관이 생김 (curl + psql 조합) — AI가 만든 코드를 그냥 믿지 않고 숫자를 직접 확인
- **아쉬운 점**: 커밋을 몰아뒀다가 한 번에 정리하려니 git 인덱스가 꼬이는 일이 있었음 — 이슈 하나 끝날 때마다 바로 커밋하는 습관이 필요
- **4주차 목표로 남긴 것**: `code-reviewer` 에이전트를 매 커밋 전 습관적으로 사용, 회원가입/로그인부터 시작해 F16 나머지(#40~47)를 이어감

## 9. 4주차 — 배포/QA/데모 준비에서 추가된 패턴

3주차까지는 "기능 구현" 중심이었다면, 4주차는 "이미 만든 걸 실제로 믿을 수 있는지 확인하고 남에게 보여줄 수 있는 상태로 만드는" 단계였다.

- **배포 환경 버그는 배포 환경에서 재현한다.** 로컬에서 멀쩡해도 배포 서버(Render)에서 지출 수정이 실패하는 버그가 있었는데, 로그만 보고 추측하지 않고 배포된 URL에 직접 `fetch`를 날려 재현한 뒤에야 진짜 원인(환경변수로 넣은 API 키 손상)을 찾았다.
- **QA는 실제 계정 + 실제 API 호출로 한다.** "Agent가 상황에 따라 다르게 판단하는지" 같은 건 코드만 읽어서는 확인이 안 되고, 실제 Claude API를 호출해서 눈으로 결과를 봐야 확인된다. 대신 같은 호출을 반복하면 비용이 드니, 리허설은 최소 횟수로 하고 본 실행에 집중한다.
- **테스트/데모 데이터는 "실제로 말이 되는 숫자인지"부터 검증한다.** 데모 계정 예산을 처음에 너무 넉넉하게 잡았다가, Agent 개입을 보여주려면 비현실적으로 큰 금액을 넣어야 하는 상황이 됐다.
- **로컬 개발 서버를 다른 기기(폰)에서 열 때 생기는 문제는 별도 카테고리다.** 데스크톱 미리보기 전제로 만든 고정 크기 프레임이 실제 폰에서는 레터박싱을 만들고, CORS 허용 origin이 `localhost`로 고정돼 있으면 같은 네트워크의 다른 기기에서는 아예 요청이 막힌다.
- **배포 서버의 시간대(timezone)는 로컬과 다를 수 있다.** 배포 서버(Render) JVM이 기본 UTC로 떠서, 실제 한국시간 기준 지출이 "이번 달 집계"에서 계속 빠지는 문제가 있었다 — 로컬에서만 QA하면 절대 못 잡는 버그였다.
