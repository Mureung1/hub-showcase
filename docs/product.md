# Decision Log 제품 정의

> 제품 목적, 핵심 용어, 사용자 가치, MVP 범위의 기준 문서다.
> 도메인 객체의 상태·전이 규칙은 `docs/domain-policy.md`, 데이터 모델은 `docs/data-model.md`를 따른다.

---

## 1. 서비스 개요

Decision Log는 사용자가 하나의 질문을 여러 AI에게 전달하고, AI별 원답변을 공통 주제인 Agenda 단위로 비교한 뒤, 충돌하는 내용을 직접 판단하여 최종 답변과 결정 기록을 남기는 서비스다.

핵심 흐름은 다음과 같다.

```text
Chat 생성
→ Question 입력
→ Claude·OpenAI·Gemini SourceAnswer 생성
→ Manager AI가 Agenda 생성 및 비교
→ Consensus Agenda 자동 통과
→ Conflict Agenda 사용자 판단
→ 필요 시 Agenda별 1회 재검토
→ 모든 Agenda가 Passed 또는 Rejected
→ FinalAnswer 생성
→ 사용자가 DecisionNote 저장
→ 다음 Question 입력
```

같은 Chat의 다음 Question은 이전에 완료된 Question의 확정 결과를 Context로 활용한다.


---

## 2. 핵심 용어

### 2.1 User

Supabase Auth를 통해 회원가입하고 로그인한 사용자다.

- 인증 정보는 Supabase의 `auth.users`가 관리한다.
- 서비스 데이터는 `auth.users.id`를 사용자 식별자로 사용한다.
- 별도의 Account 테이블에 이메일이나 비밀번호를 중복 저장하지 않는다.
- 표시 이름 등 추가 프로필 정보가 필요해질 때만 `public.profiles` 테이블을 추가한다.
- 이메일·비밀번호 방식으로 회원가입한다.
- 이메일 인증을 완료한 사용자만 로그인 및 서비스 기능을 사용할 수 있다.
- 회원가입 직후에는 인증 안내 화면을 표시하고, 인증 링크 완료 전에는 Chat과 Question을 생성할 수 없다.

### 2.2 Chat

여러 Question이 순서대로 이어지는 하나의 대화 단위다.

- Chat은 한 명의 User가 소유한다.
- Chat 안에서는 한 번에 하나의 Question만 처리할 수 있다.
- 이전에 완료된 Question의 확정 결과를 다음 Question의 Context로 사용할 수 있다.
- Question 목록을 Chat의 배열 필드에 직접 저장하지 않는다.
- 각 Question이 `chat_id`를 통해 Chat을 참조한다.
- Chat의 `title`은 첫 Question의 message를 그대로 사용하며, 100자를 초과하면 앞 100자만 저장한다.
- 새 Chat의 경우 Chat 생성과 첫 Question 생성을 하나의 Transaction으로 처리한다.
- MVP에서는 title 수정 기능을 제공하지 않는다.

### 2.3 Question

사용자가 AI에게 전달하는 질문 단위다.

Question은 다음 데이터를 가진다.

- 사용자가 입력한 질문
- 같은 Chat 안에서의 순서
- 질문 처리 상태
- AI에게 실제로 전달한 이전 대화 Context Snapshot
- 여러 SourceAnswer
- 여러 Agenda
- 하나의 FinalAnswer
- 하나의 DecisionNote

### 2.4 SourceAnswer

하나의 Question을 개별 AI Provider에 전달하여 받은 원본 답변이다.

예:

```text
Question
├── Claude SourceAnswer
├── OpenAI SourceAnswer
└── Gemini SourceAnswer
```

SourceAnswer는 AI Provider 호출 상태, 실제 요청 Snapshot, 원문 응답, 구조화된 응답, 오류 정보를 가진다.

### 2.5 Manager AI

여러 SourceAnswer를 비교하고 다음 작업을 수행하는 Agent다.

1. SourceAnswer를 공통 주제 단위로 분해한다.
2. 공통 주제별 Agenda를 생성한다.
3. Agenda별로 Consensus 또는 Conflict를 판단한다.
4. 사용자가 재검토를 요청한 Agenda를 한 번 더 검토한다.
5. 모든 Agenda의 처리가 끝나면 Passed Agenda를 기반으로 FinalAnswer를 생성한다.

Manager AI가 Consensus로 판단했다는 사실은 외부적으로 검증된 진실을 의미하지 않는다. 여러 AI 응답이 같은 방향을 보였다는 비교 결과를 의미한다.

### 2.6 Agenda

여러 SourceAnswer에서 공통된 주제로 묶인 비교 단위다.

Agenda에는 다음 내용이 포함된다.

- 주제 제목과 요약
- AI별 관련 내용
- 근거가 된 SourceAnswer와 Section 참조
- 현재 처리 상태
- 최종 상태가 된 이유
- 사용자가 선택한 내용 또는 메모
- 1회 재검토 요청과 결과

### 2.7 FinalAnswer

모든 Agenda 처리가 끝난 뒤 Manager AI가 생성하는 종합 답변이다.

- `passed` 상태의 Agenda만 핵심 근거로 사용한다.
- `rejected` 상태의 Agenda는 최종 결론에서 제외한다.
- 생성 주체는 Manager AI다.
- AI가 생성한 결과이므로 사용자의 직접적인 판단 기록과 구분한다.
- MVP에서는 Question당 하나의 FinalAnswer를 생성한다.

### 2.8 DecisionNote

Question의 최종 결론을 요약해 저장하는 결정 기록이다.

- MVP에서는 FinalAnswer 확정 직후 자동 요약으로 생성·저장된다.
- 사용자 편집·수정·삭제 기능은 MVP에서 제공하지 않으며, 사용자 입력 기반 작성·수정은 후속 버전에서 추가한다.
- 후속 버전에서 사용자 편집이 추가되면 사용자의 기록 성격을 갖는다.
- Question당 하나의 DecisionNote를 저장한다.
- Question이 이미 Chat을 참조하므로 DecisionNote에 `chat_id`를 중복 저장하지 않는다.


---

## 3. 가치 구조 (Value · Epic · Story)

### 3.1 용어 정의

- Value: 가장 큰 가치 단위. 이번 프로젝트에서 메인으로 전달하고 싶은 가치 문장.
- Epic: Value를 달성하기 위한 세부 가치 단위.
- Story: Epic을 달성하기 위한 세부 가치 단위. Task와 같은 규모로 이루어진다.

### 3.2 Value

고객은 AI 교차 검증을 통해 신뢰도 높은 지식을 기반으로 결정을 내리고, 이 기록을 카드 형태로 분류하여 저장할 수 있다.

### 3.3 Epic & Story

Epic 1. 고객은 하나의 질문을 던졌을 때 여러 개의 AI에게 구조적으로 통일성 있는 답변을 받을 수 있다.

- Story 1-1. 고객은 질문을 시작할 수 있다.
- Story 1-2. 고객은 질문을 입력하면 이를 Claude, ChatGPT, Gemini에 동시에 보낼 수 있다.
- Story 1-3. 고객은 여러 AI가 같은 답변 구조로 응답하도록 만들 수 있다.
- Story 1-4. 고객은 AI별 답변을 한 화면에서 비교할 수 있다.

Epic 2. 고객은 여러 AI에게 받은 답변 중 공통된 소주제에 대한 충돌 내용을 카드 형태로 비교해 볼 수 있다.

- Story 2-1. 고객은 여러 AI 답변을 소주제 단위로 나눠서 비교된 결과를 확인할 수 있다.
- Story 2-2. 고객은 소주제 안에서 충돌 내용이 있는 경우 별도의 리스트로 확인할 수 있다.
- Story 2-3. 고객은 충돌 소주제의 경우 해당 주제에 대한 각 AI의 의견을 비교해서 볼 수 있다.

Epic 3. 고객은 충돌 소주제 카드를 비교하여 채택, 재검증, 폐기하고 이를 기반으로 최종 답변을 받을 수 있다.

- Story 3-1. 고객은 충돌 소주제에 대한 각 AI의 의견 중 하나를 선택해서 채택할 수 있다.
- Story 3-2. 고객은 충돌 소주제에 대해서 Manager AI를 통해 재질문해서 답변을 받을 수 있고 이를 채택할 수 있다.
- Story 3-3. 고객은 충돌 소주제에 대해서 해당 주제를 폐기할 수 있다.
- Story 3-4. 고객은 충돌 소주제에 대해서 사용자가 스스로 채택 내용을 기재하고 채택할 수 있다.
- Story 3-5. 고객은 모든 충돌 소주제에 대해서 채택, 폐기를 진행한 경우 최종 답변을 받을 수 있다.

Epic 4. 고객은 최종 답변에 대한 요약 버전인 Decision Log를 확인하고 개별 MD 파일로 나눠서 다운로드할 수 있다.

- Story 4-1. 고객은 최종 답변을 받은 경우 해당 최종 답변의 요약인 Decision Log를 확인할 수 있다.
- Story 4-2. 고객은 Decision Log를 리스트로 확인할 수 있다.
- Story 4-3. 고객은 Decision Log를 개별 MD 파일로 저장한 Zip 파일을 다운받을 수 있다.
- Story 4-4. 고객은 전체 대화 내용에 대해서 MD 파일로 다운받을 수 있다.

Epic 5. 고객은 기존에 받은 최종 답변들을 기반으로 다음 질문을 이어갈 수 있다.

- Story 5-1. 고객은 기존 최종 답변들을 맥락으로 하여 다음 질문을 이어갈 수 있다.

계정(회원가입·로그인) 관련 Epic과 Story는 추후 추가한다.

---

## 4. 사용자 흐름과 로그인 정책

```text
회원가입 또는 로그인 (이메일 인증 완료)
→ Chat 생성, 기술 질문 입력
→ Claude·OpenAI·Gemini 답변 비교
→ Agenda 충돌 판단 (채택 / 직접 입력 / 재검토 1회 / 제외)
→ FinalAnswer 확인
→ DecisionNote 저장
→ 이전 확정 결과를 Context로 다음 질문
```

- 사용자는 자신의 Decision Note를 계정별로 안전하게 저장하고, 다른 사용자의 기록과 분리하여 관리할 수 있다.
- 로그인과 이메일 인증을 완료하지 않은 사용자는 Chat과 Question을 생성할 수 없다.
- 실제 AI API 실행과 Decision Note 저장은 로그인 사용자만 가능하다.

## 5. MVP 범위

### 5.1 포함

- 이메일·비밀번호 회원가입, 로그인, 로그아웃, 로그인 상태 복원, 인증 필요 화면 보호
- Epic 1~5 전체: 3개 Provider 동시 질문, Agenda 비교·판단·1회 재검토, FinalAnswer, DecisionNote, MD Zip Export, Context 연속 질문

### 5.2 제외

- Chat과 하위 데이터의 삭제·보관 기능 (`docs/domain-policy.md` 삭제 및 보관 정책 참조)
- 비밀번호 재설정(Should), 소셜 로그인, 프로필(`public.profiles`), 회원 탈퇴, 다중 인증
- 비회원 데이터의 회원 이전, 여러 브라우저 sessionId 병합, 게스트 계정 병합
- Agenda 판단 이력·다중 재검토 (`docs/data-model.md` 후속 확장 구조 참조)
- 결제, 팀 협업, 관리자 페이지
