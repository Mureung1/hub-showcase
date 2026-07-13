# AY-PLE Week 1 Demo

AI Agent를 처음 접하는 청중에게 AY-PLE가 어떤 제품인지 설명하기 위한 발표용 artifact다. 1~5장은 학생 문제, Agent가 하는 일, 원본 근거, 사용자 결정과 확인된 학기 정보 반영을 중심으로 구성한다. 6~7장은 Codex·Claude Code 경험자를 위해 App Server primitive와 현재 구현 경계, 두 종류의 승인을 설명하는 선택 심화 자료다.

## 실행

저장소 루트에서 실행한다.

```bash
npm run demo:week1
```

명령을 실행하면 발표 자료가 브라우저에서 자동으로 열린다. 자동으로 열리지 않으면 다음 주소를 사용한다.

- 발표 자료: <http://127.0.0.1:4174/artifacts/week1-demo/>
- 선택 심화 · Runtime 번역: <http://127.0.0.1:4174/artifacts/week1-demo/#slide-6>
- 선택 심화 · 두 승인 경계: <http://127.0.0.1:4174/artifacts/week1-demo/#slide-7>
- 발표용 동적 제품 데모: <http://127.0.0.1:4174/spikes/ay-ple-ui-prototype/guided-demo.html?variant=workspace&step=1&present=1>
- variant 비교용 데모: <http://127.0.0.1:4174/spikes/ay-ple-ui-prototype/guided-demo.html?variant=workspace&step=1>

## 조작

- 발표 자료: `←`, `→`, `Space`, `PageUp`, `PageDown`
- 전체 화면: 오른쪽 아래 `⛶`
- 동적 제품 데모: 화면의 버튼 또는 `←`, `→`
- 사용자 결정 단계: 오른쪽 AY 채팅의 `수락하고 반영` 버튼으로만 다음 단계에 진입
- 동적 제품 데모 초기화: `R`

발표 자료의 네 번째 장에서 `전체 화면 데모 시작`을 누르면 자료 목록, 원본 미리보기, AY 대화를 한 화면에서 잇는 3단 학업 워크스페이스 prototype이 새 탭으로 열린다.

정적 백업 화면도 함께 보관한다.

- [원본 근거 확인](assets/guided-demo-evidence.png)
- [확인된 학기 정보 반영](assets/guided-demo-confirmed.png)

## 발표 전 확인

1. `npm run demo:week1`로 서버를 시작한다.
2. 발표 자료 1~7장을 한 번 순서대로 넘긴다. 기본 발표는 5번에서 마치고 6~7번은 심화 설명이나 Q&A에만 사용한다.
3. 네 번째 장의 `전체 화면 데모 시작`이 새 탭에서 열리는지 확인한다.
4. 동적 데모를 처음부터 수락까지 진행하고 `R`로 초기화한다.
5. 정적 백업 화면 두 장이 열리는지 확인한다.
6. [speaker-notes.md](speaker-notes.md)를 기준으로 기본 발표가 5분 안에 끝나는지 확인한다. 심화 슬라이드를 함께 말하면 약 1분 30초를 추가한다.

제품 데모는 상호작용과 설명을 검증하기 위한 throwaway prototype이다. 실제 파일·Agent·확인된 학기 정보가 연결된 완성 제품으로 설명하지 않는다.
