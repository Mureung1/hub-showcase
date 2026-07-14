# Codex 실행용 프롬프트

아래 프롬프트를 Copilot/Codex 계열 모델에 그대로 붙여 넣어 실행하세요. 변경사항 요약, 실행/검증 방법, 기대 동작, 제약을 포함합니다.

---
아래는 현재 작업한 리포지토리 상태와 요구사항입니다. 변경 내용 검증과 실행을 자동으로 수행하고 결과(오류 로그, 브라우저 스냅샷/HTML, 필요한 수정 제안)를 보고해 주세요. 절대 기본 브랜치(`main`)를 변경하지 말고 현재 브랜치 `N158_정지웅`을 유지하세요.

1) 목적
- React 기반의 relational AI mock UI(프론트엔드) 실행 및 동작 검증.

2) 변경/추가된 파일
- `frontend/src/App.jsx` — UI/상태/모의 감정분석 로직 구현
- `frontend/src/index.jsx` — React 엔트리
- `frontend/src/index.css` — 스타일
- `index.html` — Vite 엔트리(루트)
- `package.json` — dev script + deps (react, react-dom, vite, @vitejs/plugin-react)
- `docs/test-plan.md` — 수동 테스트 체크리스트

3) 핵심 기능/동작 요약
- 시나리오 버튼: `평소/긴장/피곤` 선택 시 `observation`과 `emotionAnalysis` 갱신
- 메시지 전송: 입력 → `Enter` 또는 버튼으로 전송 → AI 상태 흐름 `thinking` → `speaking` → `waiting` → mock 응답 추가
- `analyzeMockContext()`로 간단 키워드 기반 감정 보정 및 `generateMockResponse()`로 응답 분기
- 접근성: AI 상태에 `role="status"`와 `aria-live="polite"` 적용

4) 실행/검증 절차 (복사해서 사용)
- 복제 또는 브랜치 확인(이미 repo 열려 있다면 생략):
```bash
cd C:\Users\UserK\hub
git checkout N158_정지웅
```
- 의존성 설치 (필요 시):
```bash
npm install
```
- 개발 서버 시작 (Vite):
```bash
npm run dev
```
- 브라우저 접속:
  - http://localhost:5173/
- 간단 연결/상태 확인(터미널에서):
```bash
# 포트 리스닝 확인 (Windows PowerShell)
netstat -ano | findstr :5173

# HTTP 상태 확인
curl -i http://localhost:5173/
# 또는 PowerShell
Test-NetConnection -ComputerName localhost -Port 5173
```

5) 기대되는 확인 포인트 (자동 점검/수동 점검)
- 페이지가 200으로 로드되고 `index.html`에서 `/frontend/src/index.jsx`가 로드되는가.
- 초기 3개의 mock 메시지가 보이는가.
- `평소/긴장/피곤` 버튼 클릭 시 관찰값과 감정분석(사전정의된 mock)이 즉시 업데이트되는가.
- 메시지 전송 시 입력공간 초기화, 상태가 `thinking`→`speaking`→`waiting`으로 변하고 AI 응답이 추가되는가.
- 응답이 키워드/분석에 따라 분기되는가(긍정/걱정/피곤 등).
- 자동 스크롤이 작동하는가(새 메시지 추가 시).
- 접근성: `aria-pressed`(버튼), `aria-live`(상태) 등 적용 확인.
- 개발서버 콘솔에 치명적 에러(런타임 예외/모듈 로드 실패)가 없는가.

6) 문제 발생 시 상세 정보 요청 (응답물)
- 터미널 전체 로그(서버 시작 시 출력 포함).
- 브라우저 콘솔 에러 (JS stack trace).
- 요청한 URL에 대한 HTTP 응답 헤더/바디(예: `curl -i` 출력).
- 문제가 재현되면 수정 제안(간단 패치 또는 파일 변경 내용).

7) 제약 및 주의사항
- Git: 절대 `main` 브랜치 변경 금지. 작업은 `N158_정지웅`에서 수행.
- 백엔드/실서비스 API 연동 금지 — 모든 분석은 mock 데이터로 처리.
- 만약 `node --check` 같은 방식으로 `.jsx`를 직접 검사하려 한다면 실패함(트랜스파일 필요). Vite로 실행하여 확인해야 함.

8) 선택적 추가 작업(가능하면 수행)
- `docs/test-plan.md`의 수동 체크 항목을 자동화된 smoke test(간단한 Playwright/Puppeteer 스크립트)로 구현.
- CSS 미세 조정(파일: `frontend/src/index.css`) 및 반응형 확인.
- 감정분석 로직에 대해 추가 키워드 케이스 보강(예: 더 많은 정규식).

끝 — 요약 결과만 간결하게 보고해 주세요:
- 서버 시작 여부 및 URL
- 주요 오류(있다면) + 원인 추정
- 동작 검증 결과(위 체크리스트 항목별 간단 PASS/FAIL)
- 권장 수정(최대 3개)

---

원하시면 이 프롬프트를 영어로도 변환해 드립니다. 어떤 형식으로 보내시겠습니까?
