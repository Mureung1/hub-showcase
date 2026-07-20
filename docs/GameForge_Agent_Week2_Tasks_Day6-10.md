# GameForge Agent — 2주차 작업 세분화 (Day 6~10)

> 남은 일수 자체에 마감 압박을 걸지 않는다 — 어차피 이후에도 계속 이어서 개발할 프로젝트이기 때문. 대신 이번 스프린트가 끝나는 시점(Day 10)에는 **"로그인 → 저장소 선택 → 분석 리포트 → 워크스페이스에서 Agent와 대화 → 문서 승인"까지 한 바퀴가 실제로 돌아가는 데모**가 가능해야 한다는 목표는 유지한다.
> `docs/GameForge_Agent_Week1_Tasks.md`와 같은 형식으로, 하루 작업이 반나절을 넘지 않도록 세분화했다.

---

## Day 6 — Roslyn 분석기: 실제 파싱 로직 구현

### 분석 엔진 (`tools/analyzer/`)
- 1주차 Day 5에 만든 더미 로직(파일 개수만 세는 것)을 실제 파싱 로직으로 교체
- `CSharpSyntaxTree.ParseText()`로 대상 저장소의 `**/*.cs` 파일 순회
- 각 `ClassDeclarationSyntax`에서 추출:
  - 클래스명, 파일 경로
  - 상속 목록 (`BaseList.Types`)
  - 클래스 본문 내 `IdentifierNameSyntax`로 언급된 타입 이름 (의존성 근사치)
  - 메서드 개수 (`MethodDeclarationSyntax` 카운트)
- 출력 JSON 스키마 확정: `{ classes: [{ name, filePath, baseTypes, referencedTypes, methodCount }] }`
- `Console.WriteLine(JsonSerializer.Serialize(...))`로 stdout 출력

### 백엔드 연동 재확인
- Express의 `child_process.spawn` 호출부가 실제 JSON 스키마를 파싱하도록 업데이트 (1주차엔 더미 스키마였음)
- 로컬의 작은 테스트용 C# 파일 몇 개(2~3개 클래스, 상속 관계 있는 것)로 직접 실행해서 결과 검증
- 분석기가 빈 결과/파싱 에러를 냈을 때 Express가 죽지 않고 에러를 잡아서 반환하는지 최소 확인 (데모 중 저장소에 이상한 파일이 섞여 있어도 안 죽게)

**Day 6 완료 기준**: 실제 `.cs` 파일 몇 개를 분석기에 넣으면, 클래스명/상속관계/참조타입/메서드수가 정확히 담긴 JSON이 출력된다.

---

## Day 7 — 중복 코드 탐지 + 리포트 생성 파이프라인

### 중복 코드 탐지
- `jscpd` npm 패키지 설치 및 연동 (C# 지원 옵션 확인)
- 대상 저장소 경로를 넘겨 중복 블록 목록(JSON) 받기

### 리팩토링 대상 판별 (룰 기반, AI 판단 아님)
- God Class 기준: 메서드 수 > 30 → 플래그
- 순환 의존성 간단 체크 (시간이 부족하면 다음으로 미뤄도 되지만, 우선 시도)

### 리포트 텍스트화
- Roslyn 결과 JSON + jscpd 결과 JSON을 하나로 합쳐 Claude API에 전달
- 프롬프트에 "정적 분석 기반 추정치이며 완전한 컴파일 분석이 아니다"라는 문구를 리포트에 포함하도록 명시
- 응답을 `00_Analysis_Report.md` 형식(통계 요약 + 상세 목록)으로 저장

**Day 7 완료 기준**: 분석 시작 요청을 curl/Postman으로 직접 호출했을 때, 완전한 형태의 Markdown 리포트 텍스트가 반환된다.

---

## Day 8 — 분석 리포트 화면 (프론트 연동 + 최소 에러 처리)

### 컴포넌트
- `AnalysisReportCard` — 통계 3종(의존성 수/중복 블록 수/리팩토링 대상 수) 카드 + Markdown 미리보기
- 4.5의 `MarkdownViewer`/`MarkdownEditor` 공용 컴포넌트 재사용 (원문 수정 가능하게)

### 연동
- `GET /api/analysis/{id}/report` 프론트 연동
- 로딩 상태 처리 (분석에 시간이 걸릴 수 있음 — 스피너 + "분석 중…" 텍스트)
- **최소 에러 상태 처리**: 분석 실패 시 빈 화면 대신 "분석에 실패했습니다, 다시 시도해주세요" 정도의 사용자용 메시지 표시 (데모 중 네트워크 이슈 등으로 죽는 모습을 안 보여주기 위함 — 정교한 에러 분기까지는 아직 아님)
- Approve 버튼 → `Step[1]`(요구사항 분석)을 `active`로 전환 + 워크스페이스 화면으로 라우팅

**Day 8 완료 기준**: 분석 리포트 화면에서 실제 통계와 Markdown이 뜨고, Approve를 누르면 워크스페이스로 정상 진입한다. 분석이 실패해도 화면이 깨지지 않는다.

---

## Day 9 — 사이드바 Step 상태 관리 + 채팅 백엔드 뼈대

### 사이드바 (프론트+백엔드)
- `GET /api/steps` 구현 — 9단계 상태/진행률 조회
- `progress_pct` 계산 로직 — 해당 Step 문서의 체크리스트 완료 비율로 자동 계산
- `StepSidebar` / `StepRow` 컴포넌트 — 프로토타입 마크업·로직 그대로 이식
- 완료/진행중 단계만 클릭 가능, pending은 `disabled` + 툴팁
- Step 클릭 시 해당 Step의 `Document`/`Message` 로드해서 메인 패널 갱신

### 채팅 백엔드 뼈대 (Planning Agent 대상)
- `POST /api/chat/{step_id}/message` 구현 — 우선 단발 요청/응답 (스트리밍은 여유 되면 추가)
- Planning Agent system prompt 1차 버전 작성 (이전 단계 문서 + 대화 이력을 입력으로 받는 구조)
- `messages/{step_id}.json`에 대화 저장

**Day 9 완료 기준**: 사이드바가 실제 상태값대로 렌더되고 클릭 이동이 되며, 채팅 API를 curl로 직접 호출하면 Claude 응답이 정상적으로 온다.

---

## Day 10 — 채팅 → 문서 자동 생성 → 승인까지, 한 바퀴 완성 (데모 목표 지점)

> 이 날의 목표는 **"로그인부터 문서 승인까지 실제로 시연 가능한 상태"**를 만드는 것. Planning Agent 하나만 대상으로 하되, 이 하나는 끝까지 완성한다.

### 프론트엔드 — 채팅 UI 실연동
- `ChatThread` / `ChatInput` 컴포넌트 — 프로토타입의 mock 데이터를 실제 fetch 호출로 교체
- "입력 중…" 표시를 실제 API 응답 대기 시간에 맞춰 표시

### 질문 큐 자동 진행 + 문서 자동 생성
- Planning Agent가 몇 차례 대화 후 "충분한 정보가 모였다"고 판단하면, 대화 내용을 바탕으로 `02_Game_Design.md` 초안을 자동 생성하도록 프롬프트/로직 구현
- 문서 초안이 만들어지면 우측 Markdown 미리보기 패널에 자동으로 표시

### 문서 편집 및 승인
- Markdown 원문 직접 수정(저장/취소) — 프로토타입 로직 그대로 이식
- Approve 클릭 → 현재 Step `done` 처리, 다음 Step `active`로 전환 (아직 실제 GitHub 커밋까지는 하지 않아도 됨 — 로컬 JSON 상태 전환까지만)

**Day 10 완료 기준 (= 데모 체크리스트)**: 로그인 → 저장소/Branch 선택 → 분석 시작 → 리포트 Approve → 워크스페이스 진입 → 2단계(게임 기획) 클릭 → Planning Agent와 몇 차례 채팅 → 문서 자동 생성 → 필요 시 직접 수정 → Approve까지, **중간에 새로고침 없이 한 번에 시연 가능하다.**

---

## 이번 스프린트(Day 6~10)에서 아직 하지 않는 것 (마감 때문이 아니라 데모 범위상 자연스럽게 다음으로 미루는 것)

- Planning Agent 외 나머지 Agent(Requirements, System Design, Architecture, Code Generation, Refactoring, Documentation)의 프롬프트 — 데모는 2단계 하나로 스토리를 보여주고, 나머지는 이어서 확장
- 4.6 커밋 리뷰(Diff) 화면 — 코드가 실제로 나오는 7~8단계 작업이라 아직 이르다
- Approve 시 실제 GitHub 커밋 — 이번 스프린트는 로컬 상태 전환까지, 실제 커밋 연동은 다음
- 자동 테스트 스위트 — 수동 확인으로 대체 (다음 스프린트에 도입 검토)
- 정교한 에러 분기 — Day 8에 최소 수준만 넣고, 세밀한 케이스별 처리는 이후

