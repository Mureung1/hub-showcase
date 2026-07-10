# 홈택스 AI 가이드 (크롬 확장 프로그램)

`tax-agent/PRD-chrome-extension.md`의 방향을 구현한 것. 홈택스 화면 위에 다음에 눌러야 할 버튼을 강조 표시해, 사용자가 원하는 작업(예: "환급금 조회")을 직접 완료하도록 돕는다. **어떤 클릭도 대신 하지 않는다.**

고정된 스텝 순서를 하드코딩하지 않고, 매 턴마다 **지금 화면에 실제로 보이는 클릭 가능한 요소 목록**을 LLM(Claude)에게 보내 "다음에 뭘 눌러야 하는지" 동적으로 판단받는다. 화면 문구가 바뀌거나 다른 목표를 입력해도 별도 코드 수정 없이 대응 가능하다.

## 실행 방법

### 1. 프록시 서버 실행 (AI 판단용)

```
cd hometax-guide-extension/server
npm install
cp .env.example .env   # ANTHROPIC_API_KEY 값을 채워넣기
npm start
```

`http://localhost:4000`에서 대기. 이 서버가 꺼져 있거나 키가 없으면 팝업/패널에 "AI 서버에 연결할 수 없어요" 안내가 뜨고 가이드가 중단된다 (하이라이트 판단 자체를 AI가 하므로, 서버 없이는 동작하지 않음).

### 2. 확장 프로그램 로드

1. `chrome://extensions` 접속 → 우측 상단 "개발자 모드" 켜기
2. "압축해제된 확장 프로그램을 로드합니다" 클릭 → 이 폴더(`hometax-guide-extension/`) 선택
3. `hometax.go.kr`에 접속해 **본인이 직접** 금융인증서로 로그인
4. 확장 프로그램 아이콘 클릭 → 팝업 텍스트창에 하고 싶은 일을 입력 (예: "환급금 조회하고 싶어") → "가이드 시작하기" 클릭
5. 화면에 강조 표시된 버튼을 AI가 안내하는 순서대로 직접 클릭 (최대 12턴, AI가 "완료"로 판단하면 자동 종료)

> 주의: 같은 로그인 세션을 두 개의 브라우저 탭/창이 동시에 쓰면 홈택스가 강제 로그아웃시킬 수 있다 (실측 확인됨). 테스트 중엔 홈택스 탭을 하나만 열어두는 것을 권장.

## 구조

- `manifest.json` — Manifest V3 설정
- `content-script.js` — 화면 요소 직렬화(`serializeInteractiveElements`, occlusion-safe), Shadow DOM 오버레이 렌더링, 실제 클릭 대기(`waitForRealClick`) 후 다음 턴 진행하는 동적 루프(`startDynamicGuide`)
- `background.js` — 콘텐츠 스크립트 ↔ 프록시 서버 메시지 중계 (API 키를 직접 다루지 않음)
- `popup/` — 목표 입력창 + 가이드 시작 버튼
- `server/` — AI 판단 프록시 서버 (`POST /api/next-step`, stateless)

## `/api/next-step` 계약

```
Request:  { goal, currentUrl, resultRowCount, elements: [{index, text, role}], history: [string] }
Response: { index: number|null, label: string, done: boolean, message: string }
```

## 안전 원칙

- 로그인/인증서 자동화 없음 — 사용자가 직접 로그인.
- 어떤 버튼도 확장 프로그램이 대신 클릭하지 않음 — AI는 "어디를 강조할지"만 고르고, 실제 클릭은 항상 사용자가 함.
- 화면의 표 내용(계좌번호, 정확한 환급액 등)은 프록시 서버로 전송하지 않음 — 클릭 가능한 요소의 텍스트/역할과 결과 행 "개수"만 전송.
