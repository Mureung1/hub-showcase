# 📄 03_SYSTEM_ARCHITECTURE.md

# Portfolio Zero-to-One Builder

---

# 0. 변경 배경

기존 "Project Library 재사용 + JD 매칭" 중심 아키텍처를 폐기하고, 단일 레포에 대한 즉시 인터뷰 흐름으로 단순화했다. 상세 배경은 [[01_PRD]] 0장 참고.

---

# 1. 문서 목적

본 문서는 Portfolio Zero-to-One Builder 시스템의 전체 구조와 데이터 흐름을 정의한다.

---

# 2. 시스템 설계 방향

본 시스템은 JD 맞춤형 텍스트 생성 서비스가 아니라, 유저의 GitHub 코드를 근거로 AI가 질문을 던지고 유저의 답변만으로 포트폴리오를 완성하는 **인터뷰 기반 가이드 시스템**을 목표로 한다.

---

# 3. 핵심 아키텍처 원칙

## 3.1 Interview First, No Library Reuse

기존 방식은 "Project Library"에 분석 결과를 저장해 여러 JD에 재사용하는 구조였다.

본 서비스는 JD 매칭 자체가 없으므로, 레포 분석 결과를 여러 번 재사용할 필요가 없다. 한 번의 세션 안에서:

```
GitHub 레포 입력

↓

코드 스캔 / 후보 파일 선정

↓

인터뷰 세션 진행

↓

마크다운 초안 완성
```

으로 끝나는 단발성 흐름을 기본으로 한다. 세션 결과(인터뷰 히스토리, 마크다운 초안)는 이어서 계속하거나 다시 불러올 수 있도록 저장만 한다.

---

## 3.2 단순 필터링 우선, 고도화는 확장 지점으로

코드 분석 단계에서 AST 분석, Git Diff 시맨틱 분석 같은 정교한 알고리즘은 초기 단계에서 제외한다. 대신 확장자 필터링 + 파일 크기 + 이름 패턴 정도의 단순 스코어링으로 시작하고, 스코어링 로직을 독립된 모듈 경계로 분리하여 이후 AST 기반 분석으로 교체 가능하도록 설계한다. 상세는 [[05_CODE_SCANNER_SCORER]] 참고.

---

# 4. 전체 시스템 구조

```
                    User

                     │

                     ▼

              Web Application

                     │

                     ▼

              Backend API

                     │

                     ▼

           Code Scanner & Scorer

                     │

                     ▼

              Interview Agent

                     │

        ┌────────────┼────────────┐

        ▼            ▼            ▼

 Question         Ambiguity     Writer /
 Generator        Checker       Tone Agent

                     │

                     ▼

           Portfolio Draft (Markdown)

                     │

                     ▼

              Markdown Download
```

---

# 5. 주요 시스템 컴포넌트

---

# 5.1 User Application

## 역할

좌측 채팅(인터뷰), 우측 실시간 마크다운 프리뷰로 구성된 듀얼 레이아웃 인터페이스 제공

## 주요 기능

* GitHub URL 입력
* 인터뷰 채팅
* 실시간 마크다운 프리뷰
* 다운로드

---

# 5.2 Code Scanner & Scorer

## 역할

레포지토리에서 소스 파일을 필터링하고 단순 가중치로 점수를 매겨 인터뷰 후보 파일을 선정한다.

## 저장 정보

* 후보 파일 경로
* 점수 및 점수 산정 근거
* 대표 코드 스니펫

상세는 [[05_CODE_SCANNER_SCORER]] 참고.

---

# 5.3 Question Generator

## 역할

점수가 높은 후보 파일의 원본 코드를 인용하여 핀포인트 질문을 생성한다.

## 입력

```
Candidate File (raw code)
```

## 출력

```
Pinpoint Question (코드 인용 포함)
```

---

# 5.4 Ambiguity Checker

## 역할

유저 답변의 이해도를 판단하여 재질문 여부를 결정한다.

## 판단 결과

```
충분 / 애매(1회 재질문) / 낮음(명시적 모름)
```

상세는 [[06_INTERVIEW_WRITER]] 참고.

---

# 5.5 Writer / Tone Agent

## 역할

유저 답변을 개발자 문체로 교정하고, 이해도에 따라 서술 수위를 조정하며, 면접 방어용 코멘트를 삽입한다.

## 출력

```
Portfolio Markdown (전체 재생성)
```

---

# 6. AI Agent Workflow

```
User Input (GitHub URL)

↓

Code Scanner & Scorer

↓

후보 파일 선정

↓

Question Generator

↓

유저 답변

↓

Ambiguity Checker (필요 시 재질문 1회)

↓

Writer / Tone Agent

↓

Portfolio Draft 갱신

↓

(반복)

↓

Output (Markdown)
```

---

# 7. 데이터 흐름

## 7.1 인터뷰 시작

```
GitHub URL

↓

Repository 접근 확인

↓

소스 파일 스캔

↓

후보 파일 스코어링

↓

Interview Session 생성
```

---

## 7.2 인터뷰 진행

```
Question Generator → 질문

↓

유저 답변

↓

Ambiguity Checker

↓

Writer / Tone Agent

↓

Portfolio Draft 갱신 (전체 재생성)

↓

다음 후보 파일로 반복
```

---

# 8. Evidence 기반 구조

AI 생성 결과는 반드시 유저 답변 및 코드 근거와 연결된다.

예:

생성 문장:

```
결제 승인 실패 시 재시도 로직을 구현했다
```

근거:

```
PaymentService.java (인용된 코드)

유저 답변 (인터뷰 turn #3)
```

목표: AI Hallucination 최소화, 유저가 결과를 검증 가능하도록 지원

---

# 9. 확장 가능 구조

현재:

```
Portfolio Zero-to-One Builder
(단일 세션, 단순 스코어링, 요청/응답 채팅, 전체 재생성 프리뷰)
```

향후:

```
확장 축 1: 스코어링 고도화 (AST / Git Diff 시맨틱)
확장 축 2: 실시간 스트리밍 채팅
확장 축 3: 섹션 단위 부분 업데이트 프리뷰
확장 축 4: 이력서/JD 선택 입력으로 강조점 조정
확장 축 5: 자기소개서 / 면접 준비 Agent로 확장
```

각 확장 축은 기존 아키텍처의 모듈 경계(스코어링, 질문 생성, 답변 처리, 렌더링)를 유지한 채 내부 구현만 교체하는 방식으로 진행한다.

---

# 10. 시스템 설계 핵심 요약

```
GitHub 레포 입력

↓

단순 코드 스코어링

↓

핀포인트 질문 생성

↓

멀티턴 인터뷰 (애매성 판단 포함)

↓

톤 교정 + 서술 수위 조정 + 방어 코멘트

↓

전체 마크다운 재생성

↓

Markdown 다운로드
```

본 시스템은 **AI가 질문의 주도권을 갖고, 서술의 사실 관계는 유저에게 있는 인터뷰 기반 포트폴리오 가이드 에이전트**를 목표로 한다.
