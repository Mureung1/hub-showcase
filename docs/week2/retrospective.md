# Week 2 전체 회고 (수~금, #3·#4·#6·#7·#8·#9)

소상공인 정부지원금 큐레이터 · N106_신서연

> [`day1-presentation.md`](day1-presentation.md)에서 분리된 문서 (이슈 #10 학습 회고 요구에 맞춰
> 원래 그 파일 안에 "Week 2 전체 회고"로 붙어 있던 걸 이동, `week3/retrospective.md`와 대칭 구조로
> 맞춤). 이슈별 진행 현황표는 [`week2_plan.md`](../week2_plan.md)가 유일한 소스이니 거기를 참고.

## 무엇을 완성했나 — 수직 슬라이스 한 바퀴

```
온보딩 4단계 입력 → POST /api/match → Supabase 조회(정렬) + 저장(match_requests)
   → 응답을 React Query가 받아 홈 화면 갱신 → 완료 화면은 성공/실패 관계없이 /home 이동
```

이슈별로 무엇을 했는지는 [`week2_plan.md`의 진행 현황 요약](../week2_plan.md#진행-현황-요약-2026-07-16)
참고. 여기서는 그 과정에서 얻은 것 위주로 정리한다.

## Agent 활용 방식

`docs/week2/day6-remaining-work-plan.md`에 남은 이슈(#7~#10)를 **묶음(bundle) 단위**로 쪼갠
계획을 먼저 쓰고, 그 계획을 `.cursor/skills/issue-workflow/` 스킬로 구조화된 흐름을 따라
진행했다:

```
계획 문서화 → 묶음별 요약 → 승인 → 구현 → build/lint/test → curl·DB로 실제 동작 확인
   → 계획 문서 체크 갱신 → 관련 파일만 커밋 → PR(Closes #N) → 머지 확인 → main 동기화 → 다음 이슈
```

이슈 하나(#7)도 스키마 → 서버 쓰기 경로 → FE 연결 → 검증+PR의 4개 하위 묶음으로 더 쪼개서,
매번 "이 묶음에서 뭘 바꿀지" 3~5줄로 요약하고 승인받은 뒤에만 코드를 건드리는 방식으로 진행했다.
이슈 하나가 끝날 때마다 PR을 올리고 머지를 확인한 뒤에야 다음 이슈로 넘어갔다 — 중간에 실패해도
되돌릴 범위가 이슈 단위로 작아서 안전했다.

**실수하고 복구한 사례**: CLAUDE.md를 정리하던 중 `git checkout main -- CLAUDE.md`를 잘못
실행해 방금 만든 편집 내용(+ 내가 직접 고친 PR 타이틀 문구)이 통째로 날아간 적이 있다. 다행히
직전에 `git diff`를 파일로 저장해뒀던 게 있어서 `git apply`로 그대로 복구했다. 이후로는 브랜치를
옮기기 전엔 항상 uncommitted diff를 먼저 저장해두는 습관이 생겼다.

## 설명할 수 있는 부분

- **레포지토리 패턴**: `subsidies-repo.ts`/`match-requests-repo.ts`가 Supabase 접근·정렬·fallback을
  전담하고, 라우트는 `findAll`/`match`/`insertMatchRequest` 같은 함수만 호출한다. 라우트 테스트에서
  `vi.mock('../db/subsidies-repo.js', ...)`로 이 레이어 전체를 교체하면, 실제 Supabase 클라이언트를
  생성하지 않고도(= env var 없어도) HTTP 응답 로직만 독립적으로 검증할 수 있다.
- **fallback, 근데 두 가지 다른 의미로**: `client.ts`의 `getSubsidy`/`submitProfile`은 "실패해도
  화면엔 뭔가 보여줘야 한다"는 이유로 mock 데이터로 대체한다(UX 연속성). 반대로
  `insertMatchRequest`(#7)는 "로그성 저장이 실패해도 핵심 응답(조회 결과)을 막으면 안 된다"는
  이유로 에러를 삼키고 로그만 남긴다(best-effort). 같은 "실패해도 계속 진행" 패턴이지만 목적이
  다르다는 걸 이번에 구분하게 됐다.
- **`vi.mock`**: 모킹 안 하면 `match.ts`가 `match-requests-repo.js`를 import하고, 그게 다시
  `supabase.ts`를 import해서 `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`가 없으면 모듈 로드
  시점에 바로 throw한다. `vi.mock`은 이 import 체인 자체를 가짜 모듈로 바꿔치기해서 문제를 원천
  차단한다.
- **`zod`**: `matchRequestSchema.safeParse(req.body)`는 예외를 던지는 대신 `{ success, data }` 또는
  `{ success: false, error }`를 반환해서, 400 응답 분기를 try/catch 없이 if문으로 처리할 수 있게
  해준다. `creditScore`/`businessYears`처럼 `OnboardingProfile` 쪽에서 optional인 필드는 스키마에서도
  `.optional()`로 대응시켰다.
- **`as` 캐스팅**: `mappers.ts`의 `(data as SubsidyRow[]).map(rowToSubsidy)`처럼, Supabase 클라이언트가
  반환하는 타입을 우리가 정의한 Row 타입으로 강제로 좁힌다. 컴파일러가 실제 DB 컬럼까지는 확인 못 하기
  때문에 필요한 단언이지만, 스키마(`supabase/schema.sql`)와 타입(`mappers.ts`)이 어긋나도 컴파일
  타임엔 안 잡힌다는 리스크가 있다는 것도 같이 이해하게 됐다.

## 아직 이해 못 한 부분

- `insertMatchRequest`를 레포 내부(try/catch)와 라우트(또 다른 try/catch) 두 군데서 이중으로
  감쌌는데, 이게 "테스트 가능성을 위한 합리적 방어"인지 "같은 걸 두 번 하는 과한 코드"인지 아직
  판단이 명확하지 않다. 지금은 라우트 테스트에서 repo mock이 reject하는 상황까지 커버하려고
  일부러 그렇게 했다.
- `subsidies`/`match_requests` 모두 RLS는 켜뒀지만 정책(policy)은 하나도 안 만들었다 — service_role
  키로만 접근하니 지금은 막혀 있는 게 맞다고 이해하는데, 나중에 anon key를 쓰는 경로(예: 클라이언트
  직접 접근)가 생기면 뭐가 어떻게 뚫리는지는 아직 실감 나게 이해하지 못했다.
- `.order()` 없이 Supabase가 반환하는 순서가 정확히 어떤 규칙(인덱스 스캔 순서? 실행 계획?)을
  따르는지는 여전히 모른다 — "보장되지 않는다"까지만 확인했고, 왜 매번 같은 비-id 순서로 나왔는지는
  더 들여다봐야 한다.

## 새로 알게 된 것

- Supabase 응답 순서는 "랜덤"이 아니라 "보장되지 않음"이다 — `sort=new`를 3번 반복 호출해도 항상
  같은 순서(`['5','6','1',...]`)가 나왔는데, 이게 무작위였다면 오히려 버그를 늦게 발견했을 것 같다.
- 브라우저 자동화 도구가 없어도 상당 부분은 검증할 수 있다: `curl`로 API 응답, 임시 스크립트로 DB
  row 증감, 서버 프로세스를 직접 죽였다 살려서 프록시 502 → fallback 트리거 조건까지 재현했다.
  다만 버튼 클릭·화면 전환 같은 순수 UI 상호작용은 결국 사람이 봐야 한다는 한계도 명확해졌다.
- "관련 파일만 커밋"이라는 원칙을 지키려면, 같은 작업 세션에서 나온 무관한 변경(예: CLAUDE.md
  오탈자 정리)은 진행 중인 이슈 브랜치가 아니라 완전히 별도 브랜치로 분리해야 한다 — 안 그러면
  PR 하나의 "Closes #N"이 실제로는 관련 없는 변경까지 같이 머지시킨다.
