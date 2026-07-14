# ICU 제품 기획서

작성 기준: GitHub Wiki  
작성일: 2026-07-09  
제품명: `ICU` (`I CODE U`)  
프로젝트명: `DevChat`

## 1. 한 줄 요약

ICU는 새로운 기술을 배워야 하지만 무엇부터 시작해야 할지 막막한 사용자를 위해, 오늘 학습 계획부터 코드 실습, 실행 결과, AI 피드백, 복습 기록까지 한 흐름으로 연결하는 AI 코딩 튜터 데스크탑 앱입니다.

## 2. 제품 배경

개발 학습에서 사용자는 자료 부족보다 학습 흐름의 부재를 더 크게 겪습니다.

- 공식 문서를 열어도 어떤 순서로 읽어야 할지 판단하기 어렵습니다.
- 강의, 문서, 에디터, 문제풀이 사이트가 분리되어 학습 흐름이 끊깁니다.
- AI 챗봇은 편하지만 사용자의 진도, 수준, 오답 맥락을 지속적으로 기억하지 못합니다.
- 개념 학습과 코딩테스트 준비가 분리되어 실전 연결이 어렵습니다.
- 학습 기록과 복습 일정이 남지 않아 회고와 반복 학습이 어렵습니다.

ICU는 대화형 AI 튜터가 학습 순서를 잡아주고, 사용자가 한 화면에서 개념 이해, 코드 실습, 실행 결과 확인, 복습 기록까지 이어갈 수 있게 하는 것을 목표로 합니다.

## 3. 목표 사용자

- 입문 개발자: Python, JavaScript 등을 처음 배우는 학생 또는 부트캠프 수강생
- 취업 준비생: 개념 학습과 코딩테스트 풀이를 함께 준비해야 하는 사용자
- 직장인 사이드러너: 퇴근 후 짧은 시간에 꾸준히 새 기술을 익히고 싶은 사용자
- AI로 공부하는 개발자: ChatGPT식 대화 학습에는 익숙하지만 에디터와 실행 연동이 아쉬운 사용자

## 4. 핵심 방향

- 앱 첫 화면은 채팅이 아니라 오늘 학습을 관리하는 허브입니다.
- 사용자는 오늘 학습, 학습 목록, 복습 항목, 최근 오답을 먼저 확인합니다.
- 학습을 시작하면 선택한 오늘 미션이나 큐 항목이 워크스페이스에 전달되고, IDE형 워크스페이스에서 AI 튜터, 커리큘럼, 코드 에디터, 실행 결과를 함께 사용합니다.
- 공식 문서는 AI 답변의 근거 데이터로 사용하고, 사용자 학습 데이터는 진도, 오답, 복습 관리에 사용합니다.
- 라이트모드와 다크모드를 모두 지원하는 방향으로 설계합니다.

## 5. 사용자 흐름

![ICU 사용자 흐름](https://raw.githubusercontent.com/wiki/xxriny/hub/images/icu-user-flow.png)

기본 흐름:

```text
앱 실행
-> Today Learning Hub
-> 학습 목표 입력 / 이어서 학습 / 오늘 학습 큐 선택 / 오늘 복습
-> AI 커리큘럼 제안
-> 공식 문서 기반 개념 학습
-> 퀴즈 또는 확인 질문
-> Learning Workspace IDE
-> 코드 실습
-> 실행 결과 확인
-> AI 힌트 또는 코드 리뷰
-> 학습 상태 저장
-> 복습 일정 생성
-> Notion 기록
```

대표 시나리오:

1. 사용자가 `React를 처음 배워야 해요`라고 입력합니다.
2. AI 튜터가 `컴포넌트 -> props -> state -> 이벤트` 순서의 커리큘럼을 제안합니다.
3. 사용자는 컴포넌트 설명을 읽고 짧은 퀴즈를 풉니다.
4. 오른쪽 에디터에 Counter 스타터 코드가 열립니다.
5. 사용자는 state와 클릭 이벤트를 추가합니다.
6. 실행 결과에서 테스트 통과 여부를 확인합니다.
7. 실패하면 AI 튜터가 단계별 힌트를 제공합니다.
8. 통과하면 AI 튜터가 코드 리뷰와 다음 학습 주제를 추천합니다.
9. 학습 결과와 복습 일정이 저장됩니다.

## 6. 핵심 화면

### 6.1 Today Learning Hub

Today Learning Hub는 ICU의 첫 화면입니다. 사용자가 앱을 열었을 때 오늘 무엇을 이어서 공부해야 하는지, 어떤 복습이 남았는지, 전체 학습 트랙이 어떤 상태인지 바로 이해하게 합니다.

주요 액션:

- 이어서 학습하기: 현재 생성된 오늘 미션을 워크스페이스로 전달합니다.
- 새 목표 만들기: 배우고 싶은 기술이나 목표를 입력합니다.
- 계획 조정: 오늘의 학습 순서나 난이도를 조정합니다.
- 전체 학습 목록 보기: 모든 학습 트랙 목록으로 이동합니다.
- 오늘 복습 시작: 복습/코드 리뷰 미션을 워크스페이스로 전달합니다.

화면 구성:

- Left Navigation: Today, Learning List, Review, Settings
- Header: 오늘 학습, 날짜, 오늘 예정 요약
- Today's Focus: 진행 중인 트랙, 현재 단계, 오늘 미션, 진행률, 이어서 학습하기
- Today Queue: 개념 설명, 퀴즈, 실습, 실행, 리뷰 순서
- Learning List Preview: 트랙별 상태와 진행률
- Review And Mistakes: 오늘 복습할 항목과 최근 오답

이미지:

![Today Learning Hub Light](https://raw.githubusercontent.com/wiki/xxriny/hub/images/icu-today-light.png)

![Today Learning Hub Dark](https://raw.githubusercontent.com/wiki/xxriny/hub/images/icu-today-dark.png)

### 6.2 Learning Workspace IDE

Learning Workspace IDE는 사용자가 실제 학습을 진행하는 화면입니다. 커리큘럼, AI 튜터 설명, 코드 에디터, 실행 결과를 한 화면에서 연결해 학습 흐름이 끊기지 않게 합니다.

주요 액션:

- 실행: 현재 에디터 코드를 실행하고 테스트 결과를 확인합니다.
- 힌트 보기: 실패 원인을 바탕으로 단계별 힌트를 표시합니다.
- 코드 리뷰 요청: 현재 코드를 AI 튜터에게 리뷰 요청합니다.
- 다음 단계: 현재 단계를 완료하고 다음 커리큘럼 단계로 이동합니다.
- 학습 목록: Today Learning Hub 또는 전체 학습 목록으로 돌아갑니다.
- 미션 진입: Today Learning Hub에서 전달된 미션에 맞춰 현재 학습 내용을 표시합니다.

화면 구성:

- Top Bar: 현재 트랙, 현재 단계, 오늘 진행률
- Curriculum Panel: 오늘 커리큘럼 단계, 현재 미션, 통과 조건
- AI Tutor Panel: 공식 문서 기반 설명, 현재 미션, 힌트, 코드 리뷰, 참고 문서
- Code Editor Panel: 파일 탭, 언어 표시, 실행 버튼, 코드 에디터
- Test Results Panel: 실행 상태, 테스트 결과, 실패 이유, 힌트, 리뷰, 재실행 액션

이미지:

![Learning Workspace IDE Light](https://raw.githubusercontent.com/wiki/xxriny/hub/images/icu-workspace-light.png)

![Learning Workspace IDE Dark](https://raw.githubusercontent.com/wiki/xxriny/hub/images/icu-workspace-dark.png)

## 7. 프로토타입

순수 HTML/CSS로 Today Learning Hub와 Learning Workspace IDE의 핵심 흐름을 확인할 수 있는 정적 프로토타입을 제공합니다.

- 로컬 파일: [prototype.html](../../prototype.html)
- 스타일 파일: [prototype.css](../../prototype.css)
- GitHub에서 확인: https://github.com/xxriny/hub/blob/work/prototype.html

프로토타입에서 확인할 수 있는 것:

- Today Learning Hub에서 오늘 학습 목표, 학습 큐, 학습 목록, 복습 항목을 확인합니다.
- `이어서 학습하기` 또는 `Workspace IDE` 링크로 학습 화면 구조를 확인합니다.
- Learning Workspace IDE에서 커리큘럼, AI 튜터 설명, 코드 에디터, 실행 결과 패널의 배치를 확인합니다.
- JavaScript 없이 HTML 앵커와 CSS만으로 화면 전환 흐름을 표현합니다.
## 8. MVP 핵심 기능

### AI 튜터 채팅

- 현재 학습 주제, 사용자 수준, 최근 오답을 바탕으로 대화 맥락을 유지합니다.
- 커리큘럼 모드와 자유 질문 모드를 함께 지원합니다.
- 공식 문서 기반 RAG 답변으로 신뢰도 높은 설명을 제공합니다.

### 커리큘럼 및 학습 흐름

- 사용자가 주제를 선택하거나 입력하면 AI가 학습 순서를 제안합니다.
- 기본 흐름은 `개념 설명 -> 퀴즈 -> 실습 미션 -> 실행 검증 -> 코드 리뷰 -> 다음 단계 추천`으로 구성합니다.
- 사용자는 중간에 자유 질문을 할 수 있고, AI는 답변 후 다시 학습 흐름으로 복귀를 제안합니다.

### 코드 에디터

- Monaco Editor를 오른쪽 패널에 내장합니다.
- MVP에서는 Python과 JavaScript를 우선 지원합니다.
- 실습 미션 시작 시 스타터 코드를 자동 주입합니다.
- 채팅의 코드 블록을 에디터로 보내거나, 에디터 코드를 채팅에 인용할 수 있게 합니다.

### 코드 실행 및 검증

- Python과 JavaScript 코드를 로컬 서브프로세스로 실행합니다.
- 기본 실행 제한은 timeout 5초로 둡니다.
- 함수형 실습은 assert 기반 테스트를 자동 실행합니다.
- 실행 결과는 오른쪽 하단 패널과 채팅 인라인 요약으로 함께 표시합니다.

### 학습 진도와 복습

- 퀴즈 정답률, 실습 통과율, 자기평가를 바탕으로 mastery_score를 계산합니다.
- 오답은 자동으로 오답노트에 저장합니다.
- 복습 주기는 `1일 -> 3일 -> 7일 -> 14일 -> 30일` 간격 반복을 기본으로 합니다.

### Notion 연동

- 앱 종료 또는 수동 동기화 시 오늘 학습 내용을 Notion에 정리합니다.
- 저장 내용은 학습 개념, 퀴즈 정답률, 실습 통과율, 오답 요약, 다음 복습 일정입니다.
- 같은 날짜의 재동기화는 기존 페이지를 업데이트하는 방식으로 처리합니다.

## 9. 학습 데이터 전략

MVP 학습 데이터는 라이선스와 출처가 명확한 공식 문서만 사용합니다.

- MDN Web Docs
- Python 공식 문서
- React Docs
- FastAPI Docs

수집 문서에는 다음 메타데이터를 저장합니다.

- 문서 제목
- 원본 URL
- 섹션 경로
- 라이선스
- 수집 날짜
- 문서 버전 또는 last updated 정보
- content hash

답변 생성 정책:

- AI 튜터는 검색된 공식 문서 근거가 있을 때만 확정적으로 답변합니다.
- 답변 하단에 참고 문서명, 섹션명, 원본 링크를 표시합니다.
- 검색 결과가 부족하면 추측하지 않고 `현재 공식 문서 기준으로는 확인되지 않습니다`라고 안내합니다.
- 문서 내용과 모델의 일반 지식이 충돌하면 문서 내용을 우선합니다.

## 10. 추천 기술 스택

| 영역 | 기술 | 목적 |
| --- | --- | --- |
| 데스크탑 프레임워크 | Electron | Windows/macOS/Linux 데스크탑 앱 배포 |
| UI | React + TypeScript | 채팅, 에디터, 상태 기반 UI 구현 |
| 스타일링 | CSS Modules + `src/styles` 토큰 | 컴포넌트 단위 스타일링, 라이트/다크모드 토큰 관리 |
| 코드 에디터 | Monaco Editor | VS Code 기반 편집 경험 |
| 상태 관리 | Zustand | 가벼운 전역 상태 관리 |
| 로컬 DB | SQLite, better-sqlite3 | 진도, 오답, 문제, 설정 저장 |
| 벡터 DB | ChromaDB | 공식 문서 RAG 검색 |
| LLM | OpenAI API | 설명, 힌트, 코드 리뷰, 요약 생성 |
| 코드 실행 | Node.js child_process | Python/Node 코드 실행 |
| 외부 연동 | Notion API | 학습 기록 자동 정리 |

## 11. 시스템 구조

DevChat은 Electron의 Renderer Process와 Main Process를 분리해 구성합니다.

Renderer Process:

- React 기반 채팅 UI
- Monaco Editor
- 실행 결과 패널
- 커리큘럼 사이드바와 진도 표시

Main Process:

- Tutor Agent
- RAG Service
- Docs Ingestion
- Code Runner
- Judge Service
- Progress Service
- Notion Sync Service

Renderer와 Main은 IPC로 통신합니다. Renderer는 화면과 사용자 입력을 담당하고, Main은 LLM 호출, 로컬 DB 접근, 코드 실행, 문서 검색, Notion 동기화를 담당합니다.

## 12. 12주 MVP 로드맵

### Phase 1: Electron 기본 앱 + 채팅 UI (1~3주)

- Today Learning Hub React 화면 구현
- Learning Workspace IDE React 화면 구현
- Electron 프로젝트 셋업
- React 기반 채팅 UI 구현
- Monaco Editor 통합
- Renderer/Main IPC 구조 설계
- SQLite 기본 스키마 작성

### Phase 2: AI 튜터 채팅 + RAG (4~6주)

- Tutor Agent 구현
- 커리큘럼 모드와 자유 질문 모드 구현
- 공식 문서 수집 파이프라인 작성
- ChromaDB 또는 SQLite FTS 기반 검색 구성
- 검색된 문서 기반 답변 생성

### Phase 3: 코드 실행 + 실습 (7~9주)

- Python/JavaScript Code Runner 구현
- timeout, 임시 디렉토리, 기본 격리 설정
- Judge Service 구현
- 함수형 실습과 표준입출력 문제 지원
- 실행 결과를 채팅과 결과 패널에 표시

### Phase 4: 고도화 + 연동 (10~12주)

- LLM 기반 문제 생성 및 검증 파이프라인
- 단계별 힌트와 코드 리뷰
- mastery_score 기반 진도 관리
- 오답노트와 복습 스케줄
- Notion 동기화
- `.exe` / `.dmg` 빌드 준비

## 13. MVP 제외 및 2차 확장

- Docker 기반 강한 코드 실행 샌드박스
- TypeScript, Java, C++, Go 코드 실행
- 백준, 프로그래머스 문제 자동 수집
- 음성 입력과 TTS
- GitHub 자동 커밋 연동
- 클라우드 저장과 멀티 디바이스 동기화
- 웹 버전 SaaS
- 팀 기능, 강사 대시보드, 결제 시스템

## 14. 위험 요소와 대응 전략

| 위험 요소 | 영향도 | 대응 방안 |
| --- | --- | --- |
| OpenAI API 비용 증가 | 높음 | gpt-4o-mini 기본 사용, 문제/퀴즈 캐싱, 임베딩 재사용 |
| 코드 실행 보안 | 높음 | timeout, 임시 디렉토리 격리, 메모리 제한, 2차 Docker 샌드박스 |
| LLM 생성 문제 오류 | 중간 | 정답 코드와 테스트케이스 실행 검증 후 공개 |
| Electron 앱 용량 증가 | 중간 | 불필요한 모듈 제거, 지연 로딩, 빌드 최적화 |
| 문서 라이선스 문제 | 높음 | 라이선스가 명확한 공식 문서만 사용하고 출처 표시 |
| 학습 데이터 부정확성 | 높음 | 공식 문서 기반 소스 제한, 출처 표시, 근거 부족 시 불확실성 안내 |
| ChromaDB 통합 복잡도 | 중간 | MVP에서는 SQLite FTS 폴백 허용 |

## 15. 현재 진행 상황

완료된 작업:

- Vite + React 기반 DevChat 소개 화면 구현
- 로컬 커리큘럼 데모 UI 구현
- 사용자 흐름 문서화
- Product Design 기반 화면 방향 구체화
- ICU = I CODE U 이름 확정
- Today Learning Hub와 Learning Workspace IDE 설계
- Today Learning Hub와 Learning Workspace IDE React mock 화면 구현
- Today Hub에서 선택한 미션을 Workspace mock 상태로 연결
- Figma 핵심 프레임 및 ICU 라이트/다크 테마 프레임 생성
- 기능별 설계 문서 작성
- GitHub Wiki 정리
- Notion import용 기획서 작성
- React + TypeScript + TSX 개발 환경 설정
- React Router, Zustand, CSS Modules 기준 확정
- `AGENTS.md` 개발 컨벤션 작성
- `skills/design/SKILL.md` 디자인 작업 가이드 정리

현재 단계:

- 프로젝트는 React mock 제품 화면 구현 단계입니다.
- 기획, 사용자 흐름, 제품 디자인, 기능별 화면 스펙은 정리되었습니다.
- Today Learning Hub와 Learning Workspace IDE가 mock 데이터 기반으로 연결되기 시작했습니다.

다음 작업:

1. Today Learning Hub와 Learning Workspace IDE의 mock 화면 밀도와 반응형을 다듬습니다.
2. mock 학습 데이터와 화면 상태 흐름을 정리합니다.
3. 이후 Monaco Editor, 코드 실행, Electron 구조를 순차적으로 연결합니다.

아직 해결할 문제:

- 공식 문서 데이터를 어떻게 수집하고 청크로 나눌지 결정해야 합니다.
- 공식 문서 RAG 데이터와 사용자 학습 데이터를 분리해서 저장해야 합니다.
- 라이트/다크모드 테마 토큰을 `src/styles`와 CSS Modules 구조로 옮겨야 합니다.
- Figma 디자인과 실제 React 구현 사이의 밀도, 반응형, 접근성을 검증해야 합니다.

## 16. 원본 링크

- GitHub Wiki: https://github.com/xxriny/hub/wiki
- MVP Plan: https://github.com/xxriny/hub/wiki/MVP-Plan
- User Flow: https://github.com/xxriny/hub/wiki/User-Flow
- Design: https://github.com/xxriny/hub/wiki/Design
- Today Learning Hub: https://github.com/xxriny/hub/wiki/Today-Learning-Hub
- Learning Workspace IDE: https://github.com/xxriny/hub/wiki/Learning-Workspace-IDE
- Figma: https://www.figma.com/design/kFVO8cRQPTeJ4DQn8sLY8U
### React Mock 진행 상태 저장

React mock 화면에서는 `icu.learningProgress` localStorage를 사용해 Today Hub와 Learning Workspace 사이의 진행 상태를 유지합니다.

- mission별 실행 결과, 시도 횟수, 현재 단계, 최근 활동 로그를 저장합니다.
- Today Hub는 저장 상태를 반영해 Today Queue와 완료율을 갱신합니다.
- 실제 DB, Electron Main Process, Notion sync는 이후 단계에서 연결합니다.
