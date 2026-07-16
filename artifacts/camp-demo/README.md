# AY-PLE 캠프 데모

캠프 기간 동안 유지하는 AY-PLE 발표 모듈이다. 10분 내외의 제품 중심 발표 자료, 결정적으로 동작하는 `product-flow` 시제품, 기술 부록, 발표 대본과 정적 대체 화면을 한 디렉터리에서 관리한다.

이 발표 모듈은 현재 제품·아키텍처의 정본이 아니다. 구현 상태는 코드와 활성 문서를 우선하며, `product-flow`는 실제 파일·Agent·영속 저장이 연결되지 않은 발표용 시제품이다. Runtime Harness와 official SDK 기반 Chat Shell·Server tracer는 각각 구현·검증됐지만 아직 이 시제품의 학업 제품 흐름에는 연결되지 않았다.

## 실행 방법

저장소 루트에서 다음 한 명령을 실행한다.

```bash
npm run demo
```

이 명령은 다음 로컬 실행 대상을 함께 시작한다.

| 표면 | 주소 | 역할 |
| --- | --- | --- |
| 캠프 발표 자료 | <http://127.0.0.1:4174/artifacts/camp-demo/#product-promise> | 8장 본편과 3장 기술 부록 |
| 제품 흐름 | <http://127.0.0.1:4174/artifacts/camp-demo/product-flow/?step=1&present=1> | 빈 대화에서 작업 요청·AY 수정 요청·학생 결정까지 이어지는 결정적 시제품 |
| Runtime Inspector | <http://localhost:5173/> | Server·kernel·SSE·history를 통과하는 개발자용 Runtime Harness의 리허설 표면 |
| Companion Server | <http://localhost:3000> | Runtime Inspector가 사용하는 로컬 API |

`npm run demo`는 결정적인 발표 경로만 시작하며 별도 Codex-native Chat Shell은 실행하지 않는다. Chat Shell·Server route의 현재 구현과 exact-local·manual live T0 증거는 기술 부록에서 설명하고, 라이브 제품 시연처럼 섞지 않는다.

본편의 유일한 라이브 시연은 Product flow다. Runtime Inspector는 본편에서 [완료 화면](assets/runtime-inspector-completed.jpg)을 정적 실행 증거로 사용한다. `npm run demo`가 Inspector와 Server도 시작하는 것은 리허설과 질문 대응을 위한 것이며, 발표자가 본편에서 실행해야 하는 단계가 아니다.

Runtime Inspector는 `.ay-ple/camp-demo/runs`의 데모 전용 진단 기록과 `1200ms` Fake Runtime chunk delay를 사용한다. 실제 Codex 인증이나 외부 모델 호출은 시작하지 않는다. 모든 프로세스는 같은 터미널에서 실행되며 `Ctrl+C`로 함께 종료한다.

## 제출용 PDF 내보내기

저장소 루트에서 다음 명령을 실행한다. 별도의 `npm run demo` 프로세스는 필요하지 않다.

```bash
npm run export:camp-demo
```

Headless Chromium이 현재 Deck의 `data-deck-section="main"` 슬라이드 뒤에 `appendix` 슬라이드를 DOM 순서대로 모은다. 가장 큰 `data-week` 값을 `week-N` slug로 사용해 `output/ay-ple-camp-demo-week-N.pdf`를 만들고 PDF 문서 제목에도 같은 slug를 붙인다. 현재 Deck의 출력은 `output/ay-ple-camp-demo-week-2.pdf`다. Week 번호와 장수는 script에 고정하지 않으며, 각 `data-slide-id`의 중복·누락, 잘못된 `data-week`, 이미지 로딩, 페이지 overflow와 PDF 페이지 수 불일치는 오류 메시지와 실패 종료 코드로 중단한다. Product flow 자체를 PDF에 실행하거나 삽입하지 않고 4번 슬라이드의 정적 화면과 설명만 출력한다.

`output/`의 생성물은 매주 같은 명령으로 다시 만드는 제출 산출물이므로 Git에는 commit하지 않는다. 제출 전에는 다음만 확인한다.

1. 명령 출력의 페이지 수가 현재 본편과 부록의 합계인지 확인한다.
2. PDF를 열어 첫 장, Product flow 정적 화면, 마지막 본편, 각 부록의 crop과 잘림을 육안으로 확인한다.
3. 제출 위치에 PDF를 올린 뒤 공유 범위를 `링크가 있는 모든 사용자 · 뷰어`로 설정하고 로그아웃 상태에서 링크가 열리는지 확인한다.

## 발표 구조와 조작

본편은 다음 8장으로 고정한다.

1. 제품의 약속
2. 학생의 실제 문제
3. AY-PLE가 바꾸는 제품 흐름
4. Product flow 라이브 데모
5. built-in Codex의 의미
6. Week 1
7. Week 2
8. 제품 중심 마무리

기술 부록은 Runtime Harness, SDK pin·ordering, 현재/다음 아키텍처 경계의 3장이다. 본편 마무리에서는 다음 이동이 비활성화되며 `기술 부록 보기`를 눌러야만 부록으로 들어간다. 부록의 `본편` 버튼은 제품 중심 마무리로 돌아간다.

- 발표 자료 이동: `←`, `→`, `Space`, `PageUp`, `PageDown`
- 전체 화면: 오른쪽 아래 `⛶`
- 안정적인 slide URL: `#product-promise`, `#week-1`, `#appendix-sdk` 같은 `data-slide-id`
- 기존 URL 호환: `#slide-N`은 본편의 N번째 장으로 해석한 뒤 안정적인 hash로 바뀐다.
- 제품 흐름: 화면의 버튼 또는 `←`, `→`
- 사용자 결정 단계: 오른쪽 AY 채팅의 `수락하고 반영` 버튼으로만 다음 단계에 진입
- AY 수정 요청: 6단계에서 `수정 요청` → 카드 안의 prompt 작성 → `AY에게 수정 요청` → AY 응답 확인 → `수락하고 반영`
- 시간 부족 시: 수정 요청을 생략하고 최초 제안을 바로 수락해도 같은 확인 흐름을 유지
- 제품 흐름 초기화: `R` 또는 `처음부터`(항상 1단계)
- 시간 단축용 직접 진입: <http://127.0.0.1:4174/artifacts/camp-demo/product-flow/?step=2&present=1>

## 모듈 구성

| 위치 | 소유하는 내용 |
| --- | --- |
| `index.html`, `presentation.js`, `presentation.css` | 현재 캠프 발표 자료, 본편·부록 이동과 안정된 style entrypoint |
| `export-pdf.mts`, `export-pdf.test.mts` | Week slug 기반 PDF export와 page·order validation |
| `styles/` | deck shell, 제품 서사, 주차 진행·부록과 compact-height 정책 |
| `product-flow/` | 반복 사용하는 결정적 제품 흐름 시제품, 순수 상태 모델과 Review Workspace 화면 판단 기록 |
| `speaker-notes.md` | 10분 내외 가변 속도 대본, 필수·선택 멘트와 fallback |
| `assets/` | 발표 자료와 `product-flow`가 실패했을 때 사용할 정적 증거 |

`product-flow/`가 유일한 제품 UI 데모 진입점이다. 기존 Review Workspace의 3-pane 구조와 원본 검토 판단을 같은 guided flow 안에 흡수했으며, 과거 판단은 [design notes](product-flow/design-notes.md)와 Git history로 보존한다.

## 주차 슬라이드 추가

Week 슬라이드는 `.week-progress-slide`와 `data-week`를 사용하는 전용 section에서만 관리한다. 새 주차를 추가할 때는 다음 절차를 따른다.

1. `index.html`에서 제품 중심 마무리 바로 앞의 기존 `.week-progress-slide` section 하나를 복제한다.
2. `data-slide-id="week-N"`, `data-week="N"`과 heading id를 고유하게 바꾼다.
3. `그 주의 질문 → 확보한 결과 → 실행 증거 → 다음 연결`만 해당 주차 내용으로 교체한다.
4. 발표 순서와 `speaker-notes.md`의 같은 장을 갱신한다.
5. E2E에서 본편 수, stable hash, 질문과 현재/다음 경계를 함께 갱신한다.

주차 표기는 이 전용 section 밖의 공통 shell, 제품 UI와 공통 문구에 넣지 않는다. 발표마다 새 디렉터리를 복사하지 않고 현재 발표 자료를 갱신하며 과거 상태는 Git history로 보존한다.

## 유지보수 규칙

- 제품 문제, `product-flow`와 발표 조작은 안정된 틀로 유지하고 실행 증거와 현재/다음 경계만 갱신한다.
- `product-flow/scenario.mjs`에는 단계 문구, proposal·confirmed state와 결정적인 수정 요청·AY 응답 fixture를, `product-demo-core.mjs`에는 선택·검토·수정 요청·수락 상태 규칙을, `demo.js`에는 DOM·URL·focus·timer 같은 browser adapter 책임만 둔다. 원본·evidence·tool 기록의 고정 markup은 `index.html`이 소유한다. 이 정적 시제품은 원본을 실제로 parse하지 않으므로 input fixture와 정규화된 state 값의 의미상 일치는 명시적인 예외이며, 시나리오를 바꿀 때 둘을 함께 검토한다.
- Chat은 단계 설명을 교체하는 영역이 아니라 `작업 요청 → AY 응답 → 도구 기록 → 제안 → 결정 기록`을 누적하는 transcript다. 제안 정정은 카드 안에서 AY에게 prompt를 보내고 응답을 받는 한 건의 결정적 fixture로 처리하며 임의 자연어 이해나 실제 Agent 연결을 가장하지 않는다.
- `product-flow/demo.css`는 style entrypoint로만 유지하고 공통 shell, document workspace, AY companion style은 `product-flow/styles/`의 책임별 파일에서 수정한다.
- 색상과 component tone은 [AY-PLE Design System Direction](../../docs/product/ay-ple-design-system.md)의 light-first 원칙을 따른다. warm paper와 밝은 source·AY surface를 기본으로 두고, dark IDE chrome이나 terminal/log styling을 기본 화면에 도입하지 않는다.
- deck의 안정된 shell은 `styles/deck-shell.css`, 제품 문제와 flow는 `styles/product-story.css`, 제품 약속·built-in 역할·마무리는 `styles/presentation-arc.css`, 주차 공통 패턴은 `styles/week-progress.css`가 소유한다. 상세 기술 설명은 `styles/runtime-progress.css`, A1의 정적 Runtime 증거는 `styles/appendix-evidence.css`에서 수정한다.
- 실제 구현과 시제품을 한 화면처럼 표현하지 않는다. Inspector는 개발자용 Runtime Harness이고 `product-flow`는 실제 연결 전 시제품이다.
- 실시간 Codex, 환경 인증과 네트워크 provider를 기본 발표 경로에 넣지 않는다.
- 정적 대체 화면은 동적 화면이 열리지 않아도 같은 제품 서사와 구현 경계를 설명할 수 있어야 한다.
