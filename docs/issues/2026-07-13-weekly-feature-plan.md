# ICU 이번 주 기능 작업 목록

## Summary

이번 주 목표는 사용자가 프로필을 만들고, Today Hub에서 학습 목표를 확인하거나 AI 커리큘럼을 생성한 뒤, Workspace로 들어가 실제 학습 흐름을 이어가는 React mock product flow를 완성하는 것입니다.

현재는 React 화면, Zustand/localStorage 상태, Express mock backend, JSON/JSONL 학습 데이터 연결까지 구현된 상태입니다.

## 목표 흐름

```txt
/ 온보딩
-> /profile 학습 프로필 설정
-> /today 오늘 학습 허브
-> 커리큘럼 생성 또는 오늘 미션 선택
-> /workspace?mission=generated-first-mission
-> 학습 진행, 힌트, 코드 리뷰 mock, 실행 결과 확인
```

## 현재 완료된 기능

| 기능 | URL | 상태 | 설명 |
| --- | --- | --- | --- |
| 온보딩 화면 | `/` | 완료 | ICU 소개/시작 화면 |
| 학습 프로필 설정 | `/profile` | 완료 | 이름, 목표, 트랙, 학습 시간, 수준 설정 |
| 프로필 저장 상태 | localStorage | 완료 | Zustand store 기반 저장/초기화 |
| Today Learning Hub | `/today` | 완료 | 오늘 학습, 커리큘럼 생성, 큐, 학습 목록, 오답 요약 |
| 생성 커리큘럼 저장 | `icu.generatedCurriculum` | 완료 | AI/mock 추천 결과를 Workspace와 공유 |
| 추천 미션 시작 CTA | `/today -> /workspace` | 완료 | 생성 커리큘럼 요약에서 Workspace로 이동 |
| Learning Workspace | `/workspace` | 완료 | 미션, 단계, 튜터 설명, 코드 preview, 테스트 결과 |
| Workspace 생성 플랜 표시 | `/workspace?mission=generated-first-mission` | 완료 | 생성 플랜 요약, 단계 목록, 추천 근거/출처 표시 |
| Workspace 패널 스크롤 | `/workspace` | 완료 | 긴 단계/출처/활동 기록을 패널 내부 스크롤 처리 |
| Git Branching Lab | `/git-lab` | 완료 | Pro Git 기반 명령 시뮬레이터 |
| Git Lab 오답노트 연결 | `/git-lab -> /mistake-notes` | 완료 | 실패 명령 자동 기록 및 복습 이동 |
| Mistake Notes | `/mistake-notes` | 완료 | 오답 목록 확인과 상태 관리 |
| Express backend | `backend/http/server.mjs` | 완료 | 커리큘럼/진행/오답/Git Lab attempt API |
| JSONL knowledge loader | `backend/modules/knowledge` | 완료 | React/Docker 공식 문서 chunk 로드 |

## 이번 주 남은 작업

| 우선순위 | 작업 | 상태 | 설명 |
| --- | --- | --- | --- |
| 1 | 문서와 issue 동기화 | 진행 중 | 구현된 Today/Workspace/Agent/API 상태를 문서에 반영 |
| 2 | Git Lab 주석/문구 정리 | 대기 | 불필요하거나 설명만 반복하는 주석 제거, 깨진 문구 점검 |
| 3 | Workspace QA | 대기 | 생성 커리큘럼이 Today Hub에서 Workspace까지 자연스럽게 이어지는지 확인 |
| 4 | 커밋 정리 | 대기 | 코드 변경과 문서 변경을 의도별로 분리할지 결정 |

## 완료 기준

| 완료 기준 | 상태 |
| --- | --- |
| `/today`에서 커리큘럼 생성 결과를 확인할 수 있다 | 완료 |
| 생성된 커리큘럼에서 Workspace로 이동할 수 있다 | 완료 |
| `/workspace`에서 생성 플랜의 목표, 미션, 단계, 출처를 볼 수 있다 | 완료 |
| 긴 목록이 화면을 밀어내지 않고 내부 스크롤된다 | 완료 |
| Git Lab 실패 명령이 오답노트로 이어진다 | 완료 |
| 구현 상태가 docs/features, docs/plan, docs/issues에 반영된다 | 진행 중 |
| `npm test`, `npm run build`, `npm run lint`가 통과한다 | 완료 |

## 제외 범위

| 제외 항목 | 이유 |
| --- | --- |
| Monaco Editor | Workspace mock 안정화 후 도입 |
| 실제 코드 실행 | backend code runner 또는 Electron IPC 설계 이후 진행 |
| full RAG | JSONL knowledge context 검증 후 embedding/search store 도입 |
| Notion API | 로컬 학습 데이터와 사용자 저장 구조 확정 후 진행 |
| Electron packaging | React product flow 안정화 이후 진행 |

## 커밋 전 확인

```bash
git status -sb
git diff --cached --name-status
git diff --check
npm test
npm run build
npm run lint
```

주의:

- untracked 산출물은 요청 없이는 stage하지 않습니다.
- `data/`, `docs/design/screenshots/`, 임시 이미지, 개인 작업 로그는 커밋 전에 반드시 확인합니다.