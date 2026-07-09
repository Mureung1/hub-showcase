> 이 문서는 Claude Code 또는 개발 Agent가 Decision Log 프로젝트를 작업할 때 반드시 따라야 하는 기준 문서다.

## 1. 가장 중요한 규칙

개발 환경, 디렉토리 구조, 라이브러리, 실행 방식은 반드시 `docs/dev-setup.md`를 따른다.

Agent는 임의로 기술 스택을 바꾸지 않는다.  
Agent는 임의로 새로운 라이브러리, DB, 인증, 상태 관리 도구를 추가하지 않는다.  
Agent는 `docs/dev-setup.md`와 충돌하는 작업을 제안하거나 수행하지 않는다.

만약 구현 중 `docs/dev-setup.md`와 다른 방식이 필요하다고 판단되면, 먼저 변경 이유를 설명하고 사용자 확인을 받은 뒤 진행한다.

---

## 2. 프로젝트 개요

프로젝트 이름은 **Decision Log**다.

Decision Log는 여러 AI 답변을 문단 단위로 비교하고, 사용자가 채택/검증/폐기한 판단을 Decision Log로 저장하는 Multi-AI 의사결정 도구다.

---

## 3. 핵심 문제

AI로 개발하거나 낯선 기술을 학습하는 사용자는 여러 AI에게 같은 질문을 던진다.  
하지만 답변 형식과 설명 순서가 달라 공통점, 충돌점, 검증할 내용을 비교하기 어렵다.

---

## 4. 핵심 가치

고객은 AI 교차 검증을 통해 신뢰도 높은 지식을 기반으로 결정을 내리고, 이 기록을 분류하여 저장할 수 있다.

---

## 5. MVP 핵심 흐름

Agent는 아래 흐름이 먼저 작동하도록 개발해야 한다.

```text
질문 입력
→ 여러 AI 답변 표시
→ Manager AI 비교 카드 표시
→ 카드 상태 선택
→ Decision Log 저장
→ MD Export
→ Zip 다운로드
```

이 흐름과 직접 관련 없는 기능은 MVP에서 제외한다.

---

## 6. 기준 문서 우선순위

작업 중 판단이 필요하면 아래 순서로 문서를 따른다.

| 우선순위 | 문서 | 역할 |
|---|---|---|
| 1 | `docs/dev-setup.md` | 개발 환경, 기술 스택, 디렉토리 구조, 라이브러리 기준 |
| 2 | `docs/task-list.md` | 실제 구현 Task와 우선순위 기준 |
| 3 | `docs/plan.md` | 서비스 문제 정의, 사용자 시나리오, 화면 구조 |
| 4 | `docs/value-structure.md` | Value, Epic, Story 기준 |
| 5 | `docs/design-system.md` | 색상, 폰트, 간격, 컴포넌트 디자인 기준 |
| 6 | `docs/design-skill.md` | 디자인 점검 기준 |

---

## 7. 반드시 따를 개발 셋업

개발 셋업은 `docs/dev-setup.md`를 철저하게 따른다.

### 고정된 선택

| 항목 | 결정 |
|---|---|
| Frontend | React |
| Build Tool | Vite |
| Backend | Express |
| Language | JavaScript |
| Styling | 일반 CSS |
| 저장 방식 | React state, localStorage |
| Export | JSZip, file-saver |
| 실행 도구 | concurrently |
| 환경변수 | dotenv |

### 금지 사항

- TypeScript로 임의 변경하지 않는다.
- Tailwind를 임의로 추가하지 않는다.
- Redux, Zustand 같은 상태 관리 라이브러리를 임의로 추가하지 않는다.
- DB를 임의로 추가하지 않는다.
- 로그인, 결제, 팀 기능을 임의로 만들지 않는다.
- API Key를 프론트엔드에 작성하지 않는다.
- `.env` 파일을 Git에 올리지 않는다.

---

## 8. MVP 포함 기능

### 기능 1. 여러 AI 답변 비교 기능

- 질문 입력
- AI 모델 선택
- Claude, ChatGPT, Gemini 선택 UI
- 여러 AI 답변 표시
- 동일한 답변 구조 적용
- AI별 답변 카드 표시
- Manager AI 비교 카드 표시

### 기능 2. Decision Log 저장 기능

- Manager AI 카드 상태 선택
- Accepted 저장
- Verify 저장
- Rejected 저장
- Decision Log 패널 표시
- localStorage 저장
- Markdown Export
- Zip 다운로드

---

## 9. MVP 제외 기능

아래 기능은 사용자가 별도로 요청하기 전까지 구현하지 않는다.

- 로그인
- 결제
- 팀 협업
- DB 저장
- 사용자 계정
- 관리자 페이지
- GitHub 연동
- Notion 연동
- 공식 문서 자동 검증
- 웹 검색 기반 검증
- 코드 실행 검증
- 여러 AI 간 토론 기능
- 복잡한 RAG
- 복잡한 설정 화면
- 고급 애니메이션

---

## 10. 개발 순서

Agent는 아래 순서로 작업한다.

1. `docs/dev-setup.md` 기준으로 프로젝트 구조를 만든다.
2. React + Vite 클라이언트를 만든다.
3. Express 서버를 만든다.
4. 정적 3단 레이아웃을 구현한다.
5. mock data로 AI 답변 카드를 표시한다.
6. mock data로 Manager AI 카드를 표시한다.
7. 카드 상태 변경 기능을 구현한다.
8. Decision Log 패널에 상태별로 카드가 쌓이게 만든다.
9. localStorage에 Decision Log를 저장한다.
10. Markdown Export 기능을 구현한다.
11. Zip 다운로드 기능을 구현한다.
12. 모든 mock 흐름이 완성된 뒤 실제 AI API 연결을 검토한다.

---

## 11. Agent 작업 방식

### 1) 작업 전

Agent는 작업을 시작하기 전에 다음을 확인한다.

- 이번 작업이 `docs/task-list.md`의 어떤 Task에 해당하는가
- 이번 작업이 MVP 포함 범위인가
- `docs/dev-setup.md`의 개발 구조를 따르는가
- 새 라이브러리 추가가 필요한가

새 라이브러리가 필요하면 바로 설치하지 말고 먼저 이유를 설명한다.

### 2) 작업 중

- 한 번에 너무 많은 파일을 수정하지 않는다.
- 하나의 Task를 작게 쪼개어 진행한다.
- 컴포넌트는 역할 단위로 분리한다.
- UI와 데이터 변환 로직은 가능하면 분리한다.
- mock data를 먼저 사용한다.
- 실제 API 연결은 mock 흐름 완성 이후로 미룬다.

### 3) 작업 후

작업이 끝나면 다음 내용을 정리한다.

- 수정한 파일
- 구현한 기능
- 확인 방법
- 다음에 이어서 할 작업
- 아직 구현하지 않은 부분

---

## 12. 디자인 및 프로토타입 반복 개선 방식

Decision Log의 디자인과 프로토타입은 한 번에 완성하려 하지 않는다.  
먼저 핵심 화면을 만들고, 정해둔 디자인 기준에 따라 반복적으로 점검하고 수정한다.

### 반복 개선 순서

1. 핵심 화면을 먼저 만든다.
   - 전체 서비스 화면을 모두 만들지 않는다.
   - Main Decision Board 화면을 우선 완성한다.
   - Project Context, Ask, AI Answers, Manager AI Cards, Decision Log 영역이 포함되어야 한다.

2. 디자인 결과를 `docs/design-skill.md` 기준으로 점검한다.
   - 질문 입력창이 바로 보이는지 확인한다.
   - AI별 답변이 구분되는지 확인한다.
   - Manager AI 비교 카드가 중심에 보이는지 확인한다.
   - Decision Log가 오른쪽에서 잘 보이는지 확인한다.
   - Accepted, Verify, Rejected 상태가 명확한지 확인한다.

3. 부족한 점을 3개 이하로 정리한다.
   - 한 번에 너무 많은 피드백을 반영하지 않는다.
   - 가장 중요한 사용성 문제부터 고친다.
   - 예쁜 디자인보다 핵심 기능 이해도를 우선한다.

4. 수정 작업은 작은 단위로 진행한다.
   - 레이아웃 수정
   - 카드 구조 수정
   - 버튼 상태 수정
   - 색상/간격 수정
   - 문구 수정

5. 수정 후 다시 같은 기준으로 확인한다.
   - 수정 전보다 사용 흐름이 명확해졌는지 본다.
   - Decision Log 서비스의 핵심 가치가 더 잘 보이는지 확인한다.
   - 필요하면 다시 피드백을 정리하고 반복한다.

---

## 13. 디자인 규칙

Agent는 디자인 작업 시 `docs/design-system.md`와 `docs/design-skill.md`를 따른다.

### 지켜야 할 방향

- 화면은 3단 레이아웃을 기본으로 한다.
- 왼쪽은 Project Context다.
- 가운데는 Ask & Multi-AI Compare다.
- 오른쪽은 Decision Log다.
- 카드형 UI를 기본으로 한다.
- Accepted, Verify, Rejected 상태가 명확히 구분되어야 한다.
- 화려한 AI 랜딩페이지처럼 만들지 않는다.
- 실제 작업 도구처럼 보여야 한다.

### 피해야 할 방향

- 보라색 AI 그라데이션 남발
- 의미 없는 로봇 아이콘
- 과한 애니메이션
- 기능보다 홍보 문구가 큰 화면
- Decision Log가 잘 보이지 않는 화면
- 단순 채팅 서비스처럼 보이는 화면

---

## 14. 커밋 메시지 규칙

커밋 메시지는 아래 형식을 따른다.

| 타입 | 의미 | 예시 |
|---|---|---|
| `feat` | 기능 추가 | `feat: 질문 입력 UI 추가` |
| `fix` | 버그 수정 | `fix: 카드 상태 변경 오류 수정` |
| `docs` | 문서 수정 | `docs: 개발 환경 문서 추가` |
| `style` | CSS 또는 UI 수정 | `style: Manager 카드 여백 조정` |
| `refactor` | 구조 개선 | `refactor: DecisionLogPanel 분리` |
| `chore` | 설정 작업 | `chore: Vite 프로젝트 초기 설정` |

---

## 15. 구현 시 주의사항

- 사용자가 요청하지 않은 기능을 추가하지 않는다.
- 구현이 어렵다고 판단되면 범위를 줄여서 MVP 흐름을 먼저 완성한다.
- 복잡한 구조보다 읽기 쉬운 코드를 우선한다.
- 에러 처리는 최소한이라도 포함한다.
- API Key는 반드시 서버 환경변수로 관리한다.
- 프론트엔드에서는 mock data를 먼저 사용한다.
- localStorage 저장은 MVP에서 허용한다.
- DB 저장은 MVP 이후로 미룬다.

---

## 16. 완료 보고 형식

Agent는 작업 완료 후 아래 형식으로 보고한다.

```md
## 작업 완료

### 수정한 파일
- 파일명

### 구현한 내용
- 구현 내용

### 확인 방법
- 실행 명령어
- 확인할 화면 또는 동작

### 다음 작업
- 다음에 이어서 할 Task
```

---

## 17. 핵심 문장

이 프로젝트의 핵심은 여러 AI 답변을 많이 보여주는 것이 아니다.  
여러 AI 답변을 비교 가능한 카드로 바꾸고, 사용자의 판단을 Decision Log로 남기는 것이다.
