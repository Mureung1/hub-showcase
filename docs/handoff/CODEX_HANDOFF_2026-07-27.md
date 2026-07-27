# Codex 인수인계 — 2026-07-27 배포 검증 마무리 + Agent 협업 산출물 정리

> 이전 인수인계: [CODEX_HANDOFF_2026-07-23.md](./CODEX_HANDOFF_2026-07-23.md).

이번 주 미션(주간목표 "서비스 배포와 Agent 협업 과정 발표") 중 **배포 축은 이미 끝난 상태에서 시작**했다. 오늘은 남아 있던 **검증·문서·시각 자료·showcase**를 채웠다.

## 0. 저번 이후 달라진 점 (핵심 차이)

- **배포가 라이브로 살아 있다.** 오전 세션에서 Supabase 7일 미사용 일시정지 → Render 백엔드 `Exited with status 1` → 502를 복구했다(Supabase Resume + Render Manual Deploy). 이후 `/api/health`가 `backend:"supabase"`로 응답한다.
- **오늘 세션에서 배포 환경 QA 3건을 실제로 돌려서 닫았다** — 공식 MBTI 입력 경로, baseline 비교 표시, localStorage 저장·복구·삭제.
- **워크플로우 문서가 "하루 개발 루프"만 다루던 상태에서 배포·안전장치·재사용까지 포함하는 문서로 확장**됐다.
- **showcase 대표 이미지가 히어로 일러스트에서 실제 서비스 화면으로 바뀌었다.** 쇼케이스 사이트에서 다른 참가자 카드는 사이트 화면이 뜨는데 우리만 그림이 떠서 눈에 띄던 문제.
- 열린 이슈 26개 → **19개**. 7개를 근거 코멘트와 함께 닫고, 새 이슈 1개를 등록했다.

## 1. 오늘 만든 커밋 (work 브랜치)

- `fb9470761` docs: Agent 협업 워크플로우 완성(배포 루프·읽기 경로·안전장치) + 데모 시나리오 신설 + README 기술 선택 근거 + showcase 대표 이미지를 실제 서비스 화면으로 교체

변경 파일: `docs/ai-workflow.md`(대폭 보강), `docs/demo-scenario.md`(신설), `README.md`, `showcase/showcase.json`, `showcase/thumbnail.webp`(신규), `showcase/screenshots/*.webp`(3장 신규), 기존 `thumbnail.jpg`·`screenshots/home.webp` 삭제.

## 2. 오늘 실제로 검증한 것

### 배포 환경 E2E (공개 URL, 로컬 아님)

`https://hub-theta-brown.vercel.app`에서 브라우저로 전 구간 완주. 콘솔 에러 0건.

| 검증 | 결과 |
|---|---|
| 공식 MBTI 결과 입력 경로 | INTJ 선택 → 결과에 `사용자가 입력한 공식 MBTI 결과: INTJ` 표기, `INTJ · 분석형(NT) 맞춤 매칭` 연결 확인 |
| 4축 탐색 신호 하드룰 | "공부습관 문항에서 관찰된 탐색 신호이며 공식 MBTI 평가 결과가 아닙니다" 고지 표시 확인 |
| baseline 비교 | `행동·상태 기반 기준` / `MBTI 힌트 추가` 두 카드가 나란히 표시. 이번 응답에서는 순위 변화 없음이 문장으로 안내됨 |
| localStorage 저장 | 결과 도달 시 `-result`·`-task-state`·`-essential-hours` 생성, `기록 저장` 시 `-records` 추가 |
| localStorage 복구 | 새로고침 후 `이전 결과 이어보기` → 직전 상태 복원, 회고 리포트에 저장 기록 표시 |
| localStorage 삭제 | 앱 데이터 키 전부 제거, `이전 결과 이어보기` 버튼 사라짐 |
| 백엔드 헬스 | `{"status":"ok","backend":"supabase","storedCount":4}` — in-memory 폴백 아님 |

### 로컬 검증

- `npm run build` 통과
- `npm run lint` 통과 (경고 없음)
- `npm --prefix frontend test` → **22개 통과**
- `showcase/showcase.json`을 업스트림 `dashboard-page` 브랜치의 `showcase.schema.json`과 필드별로 대조 → 통과 + 이미지 파일 존재 확인
- 문서 내부 링크 검사 → 깨진 링크 없음

### 스크린샷 촬영 방법 (다음에 다시 필요하면)

Chrome을 headless로 띄우고 CDP(WebSocket)로 직접 조작해 `deviceScaleFactor: 2`로 캡처했다. 외부 패키지를 설치하지 않았고(Node 24의 전역 `WebSocket` 사용), 스크립트는 스크래치패드에만 두고 커밋하지 않았다. 결과물은 3200×2000 PNG → PIL로 1600px webp 변환. 브라우저 도구의 스크린샷은 800px로 다운스케일돼 showcase용으로는 해상도가 부족했던 게 이 방법을 쓴 이유다.

## 3. 오늘 정리한 이슈

**닫음(근거 코멘트 포함)**

| 이슈 | 닫은 근거 |
|---|---|
| 공식 MBTI 결과 입력 흐름 E2E | 배포 환경 완주 확인 |
| task/state baseline과 MBTI 힌트 비교 검증 | 결과 화면 BASELINE COMPARISON 블록 확인 |
| localStorage 저장·복구·삭제 회귀 검증 | 키 단위 라운드트립 확인 |
| 아키텍처 mermaid README 추가 | README §아키텍처에 반영됨 |
| vitest 도입 + TDD 단위 테스트 | 22개 통과 |
| LLM 간이 MBTI 추정 채팅 | 구현·배포·동의 문구 확인 |
| 발표용 핵심 데모 시나리오 | `docs/demo-scenario.md` 신설 |
| 나만의 Agent 개발 워크플로우 문서화 | `docs/ai-workflow.md` 완성 |

**새로 등록**

- `[Fix] 로컬 데이터 삭제 시 가명 ID(hub-anon-id) 잔존 — 삭제 범위 정합성` — `clearStoredData()`가 앱 데이터는 지우지만 `frontend/src/lib/api.js`의 `hub-anon-id`는 남긴다. 그냥 지우면 사용자가 서버 익명 기록을 더 이상 못 지우므로(고아 레코드) 선택지 3개를 이슈에 정리해뒀다. **ADR로 결정한 뒤 손대야 한다.**

**현황 코멘트만 남기고 OPEN 유지**

- 제품 내 LLM 설명 에이전트 — ADR-008로 게이트는 통과했지만 **추천 이유를 LLM이 설명하는 기능은 여전히 미구현**. 라벨의 "게이트 후"는 이제 유효하지 않음.
- 하루 스케줄 생성기 + 주간 타임테이블 — 하루 스케줄은 동작, **주간 타임테이블은 표만 있고 칸이 대부분 비어 있음(골격)**.
- 주간 통합 QA 및 완료 보고 — 금요일에 닫는다.

## 4. 남은 것 / 다음 착수점

우선순위 순.

1. **데모 영상(5분 미만)** — 수요일 마감. `docs/demo-scenario.md` §2의 시간 배분표가 그대로 대본이다. 촬영 후 `showcase/showcase.json`에 `demoVideoUrl` 추가(스키마에 이미 있는 선택 필드, `^https://` 패턴).
2. **가명 ID 잔존 건 결정** — 선택지 A(로컬 삭제 시 서버도 함께 삭제)가 유력하나 서버 실패 시 처리 설계가 필요하다. ADR로 남길 것.
3. **모바일·접근성 점검** — 지금까지 전부 데스크톱 1600px 기준으로만 확인했다.
4. **파일럿 관찰 요약(1~2명)** — 서버에 쌓인 데이터가 아직 4건이라 분석 리포트 심화가 막혀 있다.
5. 설문 문항 쉬운 재작성, 판정 근거·한계 신뢰 패널, 스트릭 요약 — 여유 있으면.

## 5. 하드룰 (바뀐 것만)

기존 하드룰은 그대로 유지된다(`AGENTS.md`·`CLAUDE.md` 참조). 이번 세션에서 추가로 확인·명문화한 것:

- **배포 확인 기준 4종**이 `docs/ai-workflow.md` §4에 명시됐다. 특히 `/api/health`가 `backend:"in-memory"`로 오면 **성공이 아니라 실패로 본다** — 앱은 떠 있지만 DB에 못 붙은 상태다.
- **`docs/prompt-guide.md`의 Review Prompt가 여전히 "외부 AI API가 들어가지 않았는지 확인"이라고 되어 있다.** ADR-008 이후 `/api/mbti-chat` + Gemini는 정식 허용된 기능이므로 이 문장을 그대로 따르면 이미 승인된 기능을 위반으로 오판한다. 07-23 핸드오프에서 지적됐고 **오늘도 고치지 않았다** — 다음 세션에서 정정할 것.
- 무료 티어 재휴면(Supabase 7일 / Render 15분) 때문에 **데모·발표 전 워밍업이 필수**다.
