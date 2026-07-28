# ICU 사용자 흐름

이 문서는 사용자가 ICU를 실행해 프로필을 설정하고, 커리큘럼을 따라 실습한 뒤 오답을 복습하는 현재 제품 흐름을 설명합니다.

Mermaid 원본은 [icu-user-flow.mmd](./design/flows/icu-user-flow.mmd)에서 관리합니다. PNG와 SVG는 저장소에 커밋하지 않습니다.

## 1. 앱 진입과 프로필

```text
/ → /profile → /today
```

1. `/`에서 ICU의 학습 흐름을 확인합니다.
2. `/profile`에서 표시 이름, 학습 목표, 관심 트랙, 하루 학습 시간, 수준을 설정합니다.
3. Profile API가 값을 저장하면 `/today`로 이동합니다.

기본 server mode에서는 `GET/PUT/DELETE /api/profile`을 사용합니다. 저장된 프로필이 없으면 빈 입력 상태로 시작합니다.

## 2. Today Learning Hub

Today Hub는 사용자가 다음 행동을 고르는 중심 화면입니다.

- 현재 학습 목표와 생성 커리큘럼 확인
- 오늘 미션 이어서 학습
- 커리큘럼 새로 만들기
- 커리큘럼 보관함 열기
- 최근 오답과 Git Lab 진행 확인

화면 진입 시 profile, generated curriculum, progress, mistake notes, Git Lab attempts를 서버에서 불러옵니다. 일부 요청이 실패하면 해당 영역의 오류 상태와 재시도 동작을 제공합니다.

## 3. AI 커리큘럼 생성

```text
/today/goal
  → 목표 입력
  → POST /api/curriculum/recommend
  → 생성 결과 확인
  → 후속 요청으로 기간·난이도·구성 조정
  → /today 또는 /workspace
```

사용자는 자연어 목표를 입력하고 생성된 단계, 예상 기간, 오늘 미션, 추천 출처를 확인합니다. 기존 결과에 대해 “3주 과정으로 변경”, “실습 중심으로 구성” 같은 후속 요청을 보낼 수 있습니다.

서버 응답은 `GeneratedCurriculumPlan`으로 정규화되고 configured repository에 snapshot으로 저장됩니다.

## 4. 커리큘럼 보관함

```text
/curriculum/history
```

보관함에서는 다음 동작을 지원합니다.

- 저장된 커리큘럼 검색
- 커리큘럼 상세 단계와 출처 확인
- 선택한 커리큘럼을 활성화하고 이어서 학습
- 개별 삭제
- 같은 목표의 중복 snapshot 일괄 정리

활성화한 계획은 Today Hub와 Workspace가 같은 snapshot을 사용합니다.

## 5. Learning Workspace

```text
/workspace?mission=<missionId>
```

Workspace는 현재 미션, 단계 목록, Tutor 대화, Monaco Editor, React Preview, 실행 결과를 한 화면에 연결합니다.

1. 커리큘럼과 저장된 mission progress를 불러옵니다.
2. 사용자가 코드를 수정합니다.
3. Judge API `POST /api/code/run`으로 실행합니다.
4. 결과와 활동 기록을 화면에 반영합니다.
5. Core API에 attempt, active step, completion 상태를 저장합니다.
6. Tutor 질문은 `POST /api/tutor/ask`로 현재 코드와 대화 맥락을 전달합니다.

실패 기록은 오답노트로 저장할 수 있고, 완료한 미션은 Today Hub 진행률에 반영됩니다.

## 6. Git Branching Lab

```text
/git-lab?lesson=<lessonId>
```

1. Pro Git 커리큘럼에서 레슨을 선택합니다.
2. 터미널에 Git 명령을 입력합니다.
3. in-browser Git engine이 commit graph 상태를 변경합니다.
4. 현재 graph와 레슨 목표를 비교합니다.
5. 성공·실패 시도를 `/api/git-lab/attempts`에 저장합니다.
6. 실패한 명령은 연결된 오답노트로 기록할 수 있습니다.

기존 레거시 레슨 ID는 화면의 숫자형 Pro Git 커리큘럼 ID로 변환해 완료 상태를 표시합니다.

## 7. 오답노트

```text
/mistake-notes
  → 상세 모달
  → 수정 / 상태 변경 / 삭제
  → 다시 풀기
```

오답은 Git Lab과 Workspace에서 자동 생성하거나 `/mistake-notes/new`에서 직접 작성합니다.

- 목록 행을 누르면 상세 모달을 엽니다.
- 상세 모달에서 같은 필드를 인라인으로 수정하고 저장합니다.
- 해결·미해결 상태를 변경합니다.
- `source + lessonId`를 기준으로 원래 학습 화면에 돌아갑니다.

## 8. 저장 방식

기본 server mode에서는 Express API를 통해 profile, curriculum, progress, mistake notes, Git Lab attempts를 저장합니다.

```text
React client
  → Core API
  → repository adapter
  → in-memory | SQLite | Supabase
```

- `in-memory`: 테스트와 일회성 실행
- `sqlite`: 로컬·오프라인 영속 저장
- `supabase`: 배포 환경 영속 저장
- `mock`: API 없이 UI를 확인할 때만 localStorage fallback 사용

## 9. 배포 흐름

```text
Vercel ICU App
  → Render Core API
  → Supabase

Vercel Preview Runtime
  ← Workspace postMessage

Vercel ICU App
  → Render Judge API
```

Core API와 Judge는 허용된 ICU App origin만 CORS로 접근하도록 설정합니다.

## 10. 후속 범위

현재 제품 흐름에 포함되지 않는 항목:

- Notion 자동 동기화
- Electron desktop packaging
- 인증 기반 사용자별 데이터 분리
- full RAG 검색과 vector store
- Python 등 추가 언어 실행
- 강한 프로세스·파일시스템 격리
