# PRD: 홈택스 사용 유도형 크롬 확장 프로그램 (환급금 조회 가이드)

> 상태: 2026-07-10 방향 전환 초안. `NAVER_AIchallenge_hub.wiki/Tax-Invoice-Agent-Proposal.md`(2026-07-08, 사업자 세금계산서 발급 완전자동화안)를 대체한다. `tax-agent/PLAN.md`(매출/매입 불일치 탐지안)는 여전히 보류 상태로 별도 논의 대상.

## 1. 배경 및 방향 전환 이유

- 기존 방향(Playwright + 금융인증서로 홈택스를 **대신** 조작하는 완전 자동화)은 개인 계정 기준 "환급금 조회" 1건만 end-to-end 자동화에 성공했고, 나머지(현금영수증 조회, 국세증명 발급)는 부분 매핑에 그침.
- 2026-07-09 멘토 피드백 이후, 완전 자동화 방향을 폐기하고 **"사용자가 홈택스를 직접, 더 쉽게 쓰도록 유도"**하는 방향으로 전환.
- 이 전환의 부가 이점:
  - 국세청의 스크래핑 단속 기조(`tax-agent-research.md` §2)에서 완전히 벗어남 — 확장 프로그램은 자동 클릭/자동 조회를 하지 않고, 사용자 본인이 평소처럼 로그인하고 클릭하는 것을 화면 위에서 강조만 함.
  - 기존에 문제였던 storageState 세션 충돌·만료·크로스 머신 재사용 불확실성 문제가 전부 무관해짐 (사용자의 실제 로그인 세션을 그대로 사용).
  - 자격증명(금융인증서 PIN 등)을 프로그램이 다룰 필요가 원천적으로 없음.

## 2. 목표 (Goals)

사용자가 홈택스에서 **"환급금 조회"**를 스스로 완료하도록, 다음에 눌러야 할 버튼/메뉴를 화면 위에 색상 강조 오버레이로 표시하고, 조회 완료 시 결과를 LLM이 쉬운 말로 설명해준다.

## 3. 비목표 (Non-Goals)

- 어떤 형태로든 자동 클릭·자동 입력·자동 제출을 하지 않는다.
- 로그인/인증서 관련 자동화를 하지 않는다 (사용자가 직접 로그인).
- 환급금 조회 외 다른 플로우(현금영수증 조회, 국세증명 발급, 세금계산서 발급)는 이번 MVP 범위 밖.
- 사용자의 실제 조회 결과 데이터(계좌번호, 정확한 환급액 등)를 서버에 저장하거나 로깅하지 않는다.

## 4. 사용자 플로우

1. 사용자가 `hometax.go.kr`에 접속해 **본인이 직접** 금융인증서로 로그인한다 (확장 프로그램 관여 없음).
2. 확장 프로그램 아이콘(팝업)에서 "환급금 조회 가이드 시작" 버튼을 누른다.
3. 콘텐츠 스크립트가 활성화되어, 현재 화면에서 다음에 눌러야 할 요소를 찾아 **색상 오버레이 박스 + 짧은 안내 라벨**로 강조한다.
4. 사용자가 강조된 요소를 실제로 클릭하면, 확장 프로그램이 이를 감지하고 다음 스텝으로 자동 진행한다 (클릭은 항상 사용자가 함 — 확장 프로그램은 감지만 함).
5. "조회" 버튼 클릭 후 결과 화면이 뜨면, 확장 프로그램이 결과의 **구조적 요약**(예: 건수, 상태)만 프록시 서버로 보내고, LLM이 생성한 쉬운 설명을 팝업/사이드 패널에 보여준다.
6. 끝. (엑셀 다운로드 등은 이번 MVP에서 강조 대상에서 제외 가능 — 시간 되면 스텝 5로 추가)

## 5. 기능 요구사항

### 5-1. 스텝 정의 (Step Definition)

`refund-check.mjs`에서 이미 검증된 시퀀스를 그대로 이식한다:

```js
const REFUND_LOOKUP_FLOW = [
  { id: 'open-all-menu',     label: '전체메뉴 열기',            matchText: '전체메뉴' },
  { id: 'open-category',     label: '"납부·고지·환급" 탭 열기',  matchText: '납부·고지·환급' },
  { id: 'click-refund-link', label: '"환급금" 메뉴 클릭',        matchTextOptions: ['환급금 조회', '환급금'] },
  { id: 'click-query-button',label: '"조회" 버튼 클릭',          matchText: '조회', role: 'button', exact: true },
  { id: 'view-result',       label: '결과 확인',                 terminal: true },
];
```

각 스텝은 `matchText`(또는 `matchTextOptions`) 하나만 가지며, 확장 프로그램은 이 텍스트를 가진 요소 중 "실제로 클릭 가능한 것"을 찾아 강조한다.

### 5-2. 요소 탐색 + Occlusion 체크 (핵심 이식 로직)

`personal-tax-explore.mjs`/`refund-check.mjs`의 `findVisibleByText` 헬퍼를 콘텐츠 스크립트용 순수 DOM 함수로 포팅한다. 이 로직은 Playwright 전용이 아니라 `getBoundingClientRect` + `getComputedStyle` + `document.elementFromPoint`만 쓰는 **순수 브라우저 API**라 그대로 재사용 가능:

```js
function findVisibleTarget(text, { role, exact } = {}) {
  const candidates = Array.from(document.querySelectorAll('button, a, [role=button], [role=tab], *'))
    .filter(el => exact ? el.textContent.trim() === text : el.textContent.includes(text));

  for (const el of candidates) {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const visible = rect.width > 0 && rect.height > 0
      && style.visibility !== 'hidden' && style.display !== 'none';
    if (!visible) continue;

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const topEl = document.elementFromPoint(cx, cy);
    // 홈택스는 겹친 팝업/즐겨찾기 패널 뒤에 동일 텍스트 요소가 숨어있는 경우가 있음(§1-6 occlusion 이슈).
    // 실제로 맨 위에 있는 요소인지 반드시 확인.
    if (topEl && (el.contains(topEl) || topEl.contains(el))) return el;
  }
  return null;
}
```

- 홈택스는 WebSquare 기반이라 DOM이 `domcontentloaded` 이후에도 계속 렌더링된다. 스텝 전환 시 대상 요소가 아직 없을 수 있으므로, `MutationObserver` + 짧은 폴링(예: 300ms 간격, 최대 몇 초)으로 재시도한다.
- id 기반 셀렉터는 쓰지 않는다 (WebSquare 자동생성 id는 불안정 — 스파이크에서 이미 확인된 원칙).

### 5-3. 오버레이 렌더링

- 대상 요소의 `getBoundingClientRect()`를 기준으로 `position: fixed`인 강조 박스(테두리 + 반투명 색상 배경)를 그린다.
- 스크롤/리사이즈 시 위치 재계산 (`scroll`/`resize` 리스너 또는 `requestAnimationFrame` 루프).
- 다른 사이트 CSS와 충돌하지 않도록 **Shadow DOM**에 오버레이를 렌더링.
- 강조 박스 옆에 짧은 안내 라벨(`label` 필드 텍스트)을 말풍선 형태로 표시.

### 5-4. 스텝 진행 감지

- 현재 강조된 요소에 캡처 단계 `click` 리스너를 1회성으로 건다.
- 클릭 감지 시: 현재 오버레이 제거 → 다음 스텝 대상 탐색(5-2) → 못 찾으면 폴링 재시도 → 찾으면 강조.
- 안전장치: 리스너가 WebSquare 내부 이벤트 처리로 인해 못 잡을 경우를 대비해, 500ms 주기로 "현재 스텝이 이미 완료된 것으로 보이는 DOM 상태(다음 스텝 대상이 이미 나타남)"를 함께 감시.

### 5-5. LLM 설명 보조 (프록시 서버 경유)

- **콘텐츠 스크립트 → 백그라운드 서비스 워커 → 프록시 서버 → Claude API** 순으로 호출.
- 프록시 서버: 최소 스펙의 Node/Express 서버 1개, 엔드포인트 1개.

  ```
  POST /api/explain
  Request:  { stepId: string, resultSummary: { rowCount: number, hasError: boolean } }
  Response: { explanation: string }
  ```

  - `resultSummary`에는 **계좌번호, 정확한 환급액, 세무서명 등 PII/민감정보를 절대 포함하지 않는다** — 건수/상태 같은 구조적 신호만 전달.
  - 서버는 `.env`의 `ANTHROPIC_API_KEY`로 Claude API 호출, 응답 텍스트만 그대로 반환. 요청/응답 로깅 금지(또는 PII 제외 후 최소 로깅).
  - 상태 저장 없음 (DB 불필요, 완전 stateless relay).

- 프론트(확장)는 받은 `explanation` 텍스트를 패널에 표시.

## 6. 안전/프라이버시 원칙 (기존 원칙 계승 + 확장)

기존 저장소 전역 안전 규칙(CLAUDE.md) 계승:
- 자격증명(PIN 등)은 확장 프로그램이 절대 다루지 않는다 (애초에 로그인 자체를 안 하므로 자동 해당 없음).
- 어떤 실제 제출/발급 액션도 자동 실행하지 않는다 — 사용자가 직접 클릭.

이번 기능(LLM 설명) 때문에 새로 추가되는 원칙:
- **사용자의 실제 조회 결과 데이터는 브라우저 밖으로 나가지 않는다** — 프록시 서버에는 PII를 제거한 구조적 신호(건수/상태)만 전송.
- 프록시 서버는 무상태(stateless)이며 사용자 데이터를 저장/로깅하지 않는다.

## 7. 오늘 데모 기준 MVP 완료 조건 (Acceptance Criteria)

- [ ] `hometax.go.kr`에서 (발표자가 이미 로그인한 상태로) 확장 프로그램 팝업에서 가이드 시작 가능
- [ ] 오버레이가 순서대로 강조: 전체메뉴 → 납부·고지·환급 탭 → 환급금 메뉴 → 조회 버튼
- [ ] 각 단계, 사용자의 실제 클릭에 반응해 다음 단계로 자동 전환
- [ ] 조회 완료 후, LLM이 생성한 설명 텍스트가 패널에 표시됨 (결과 0건이어도 자연스러운 설명)
- [ ] 실제 사이트 대상 라이브 데모 가능 (조회는 읽기 전용이라 리스크 없음)

## 8. 이번 범위 밖 (Out of Scope, 추후 논의)

- 현금영수증 사용내역 조회, 국세증명/소득금액증명 발급 가이드 추가
- 특정 플로우에 묶이지 않는 범용 스텝 정의 프레임워크로 일반화
- 엑셀 다운로드 스텝 강조
- Chrome 외 브라우저 지원
- `NAVER_AIchallenge_hub.wiki`의 기존 제안서 갱신 (별도 저장소, 별도 커밋 필요 — 오늘 데모와 무관하므로 후속 작업)
