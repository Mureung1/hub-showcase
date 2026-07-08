# 📄 02_USER_FLOW.md

# AI Portfolio Agent

---

# 1. 문서 목적

본 문서는 사용자가 AI Portfolio Agent 서비스를 이용하는 전체 과정을 정의한다.

각 단계에서

* 사용자의 행동(User Action)
* 시스템의 동작(System Action)
* AI Agent의 동작(AI Action)

을 명확하게 정의하여 이후 UI/UX 설계, API 설계, 데이터베이스 설계의 기준으로 활용한다.

---

# 2. 사용자 여정(User Journey)

사용자는 다음 순서로 서비스를 이용한다.

```text
Landing

↓

회원가입 / 로그인

↓

Dashboard

↓

GitHub 연결 / Project Library 생성

↓

Project Library 관리

↓

이력서 업로드

↓

채용공고 입력

↓

AI 분석

↓

프로젝트 매칭

↓

포트폴리오 생성

↓

미리보기

↓

수정

↓

다운로드

↓

히스토리 관리
```

---

# 3. 상세 사용자 시나리오

## Step 1. Landing Page

### User Action

사용자는 서비스에 접속한다.

### System Action

서비스 소개

핵심 기능 소개

시작하기 버튼 제공

로그인 버튼 제공

---

## Step 2. 회원가입 / 로그인

### User Action

회원가입

또는

로그인

### System Action

사용자 인증

Dashboard 이동

---

## Step 3. Dashboard

Dashboard는 사용자의 작업 공간이다.

### 표시 정보

최근 생성한 Portfolio

생성 기록

Project Library

새 포트폴리오 생성 버튼

GitHub 연결 / 동기화 버튼

---

### User Action

"새 포트폴리오 생성"

버튼 클릭

또는

"GitHub 연결 / 동기화"

버튼 클릭

---

# 4. GitHub 연결 및 Project Library 생성

사용자는 자신의 GitHub 계정을 연결하거나 Repository URL을 입력하여 프로젝트를 등록한다.

이 단계는 최초 1회 또는 GitHub 동기화가 필요할 때 수행된다.

---

### 등록 방법 1

GitHub 계정 연결

연결 후 사용자의 Repository 목록을 불러온다.

---

### 등록 방법 2

GitHub Repository URL 입력

예)

```text
https://github.com/user/project
```

---

### System Action

Repository 접근 여부 확인

Repository 목록 수집

Repository Clone 또는 메타데이터 수집

분석 대상 프로젝트 식별

Project Library 생성

Project Library 상태를 "활성"으로 변경

---

### AI Action

각 프로젝트에 대해 다음 정보를 추출한다.

* 프로젝트 목적
* 핵심 기능
* 사용 기술 스택
* 프로젝트 구조
* 주요 코드 영역
* 문제 해결 방식
* 성과 및 결과
* 직무 관련 태그
* 프로젝트 난이도
* 재사용 가능성

---

### 결과

분석이 완료되면 사용자의 Project Library가 생성된다.

Project Library는 이후 JD마다 재분석하지 않고 재사용할 수 있는 프로젝트 저장소 역할을 한다.

---

# 5. Project Library 관리

Project Library는 사용자가 보유한 프로젝트를 한눈에 확인하고 관리하는 공간이다.

---

### 표시 정보

프로젝트명

Repository 주소

기술 스택

태그

최근 분석일

활성 상태

추천 점수

대표 프로젝트 여부

---

### User Action

사용자는 다음 작업을 수행할 수 있다.

* 프로젝트 목록 확인
* 프로젝트 검색
* 프로젝트 필터링
* 프로젝트 태그 수정
* 프로젝트 숨김 처리
* 프로젝트 삭제
* 대표 프로젝트 지정
* 프로젝트 재분석 요청
* 프로젝트 선택 후 포트폴리오 생성

---

### System Action

Project Library 업데이트

선택된 프로젝트 상태 반영

대표 프로젝트 저장

재분석 요청 시 GitHub 데이터 재수집

---

### AI Action

Project Library 내 프로젝트를 비교하여

* 중복 프로젝트 정리
* 유사 프로젝트 그룹화
* 추천 우선순위 계산
* JD별 적합도 점수 사전 계산

을 수행할 수 있다.

---

# 6. 이력서 업로드

### User Action

이력서를 업로드한다.

지원 형식

* PDF
* DOCX
* TXT

---

### System Action

텍스트 추출

프로젝트 정보 추출

기술 스택 추출

역할 추출

성과 추출

---

### 참고

이력서는 선택 사항이지만, 업로드하면 프로젝트 역할과 성과 추출 정확도가 높아진다.

---

# 7. 채용공고 입력

사용자는 지원하려는 기업의 JD를 입력한다.

입력 방식

### 방법 1

텍스트 붙여넣기

---

### 방법 2

채용공고 URL 입력

(추후 지원 예정)

---

### System Action

JD 저장

AI 분석 요청

---

# 8. AI 분석

사용자는 진행 상황을 확인할 수 있다.

예시

```text
Project Library 분석

███████□

70%
```

---

## 내부 AI 진행 과정

### Step 1

Project Library 분석 및 갱신

분석 대상

* README
* docs
* GitHub Wiki (존재 시)
* 프로젝트 설정 파일
* 디렉터리 구조
* 대표 코드 샘플

결과

Project Metadata 생성 또는 갱신

---

### Step 2

이력서 분석

추출

* 프로젝트
* 기술
* 역할
* 성과

---

### Step 3

JD 분석

추출

* 요구 기술

* 우대사항

* 핵심 키워드

* 직무 역량

---

### Step 4

Project Library 기반 프로젝트 후보 선정

AI는 Project Library 안에서 JD와 가장 잘 맞는 프로젝트를 찾는다.

필요한 경우 하나의 프로젝트가 아니라 여러 프로젝트 조합을 추천할 수 있다.

---

# 9. 프로젝트 매칭

AI는

GitHub Project Library

*

Resume

*

JD

를 비교한다.

---

### 출력 예시

```text
프로젝트 A

매칭률

94%

선정 이유

Redis 캐싱 경험이
JD 요구사항과 일치
```

---

사용자는

추천 프로젝트를 확인한다.

---

### 선택 방식

사용자는 다음 중 하나를 선택할 수 있다.

* AI가 추천한 프로젝트를 그대로 사용
* 추천 프로젝트 중 일부만 선택
* 직접 프로젝트를 선택
* 프로젝트 조합을 변경

---

# 10. 포트폴리오 생성

AI는

선정된 프로젝트를 기반으로

포트폴리오를 생성한다.

---

### 생성 항목

프로젝트 소개

핵심 기능

기술 스택

문제 해결

성과

프로젝트 선정 이유

---

### 생성 방식

단일 프로젝트 기반 생성

또는

복수 프로젝트 조합 기반 생성

---

# 11. Preview

생성된 결과를 확인한다.

사용자는

슬라이드를 페이지별로 확인할 수 있다.

---

### 제공 기능

미리보기

Markdown 보기

편집

재생성

다운로드

---

# 12. 수정(Edit)

사용자는

생성된 내용을 수정할 수 있다.

예)

프로젝트 설명

성과

기술 스택

프로젝트 선택 변경

순서 변경

슬라이드 삭제

슬라이드 추가

---

# 13. 다운로드

지원 형식

Markdown

PDF

PPT

---

다운로드 이후

History에 자동 저장된다.

---

# 14. History

사용자가 생성한 Portfolio를 관리한다.

기능

조회

검색

삭제

재다운로드

복사 생성

---

# 15. 예외 상황(Exception Flow)

## GitHub 연결 실패

사용자에게

Repository 접근 실패

메시지 출력

---

## Project Library 생성 실패

사용자에게

GitHub 동기화 실패

또는

분석 실패

메시지 출력

재시도 안내

---

## README 없음

README 없이 분석 진행

다른 자료 기반으로 분석

---

## docs 없음

자동 건너뛰기

---

## Wiki 없음

자동 건너뛰기

---

## 이력서 분석 실패

사용자에게

재업로드 요청

---

## JD 분석 실패

입력 확인 요청

---

## AI 생성 실패

자동 재시도

재시도 실패 시

사용자에게 오류 안내

---

# 16. AI 내부 흐름

```text
사용자 입력

↓

GitHub Analyzer

↓

Project Library 생성 / 갱신

↓

Resume Analyzer

↓

JD Analyzer

↓

Project Library Retriever

↓

Matching Agent

↓

Portfolio Generator

↓

Preview

↓

사용자 수정

↓

다운로드
```

---

# 17. UX 원칙

서비스는 최대한 단순한 흐름을 유지한다.

원칙은 다음과 같다.

* 입력은 최소화한다.
* AI 진행 상황을 시각적으로 제공한다.
* 생성 과정은 사용자가 이해할 수 있도록 표시한다.
* Project Library는 1회 구축 후 재사용할 수 있어야 한다.
* 수정은 언제든 가능해야 한다.
* 다운로드 전 미리보기를 제공한다.
* AI 결과를 그대로 제출하기보다 사용자가 검토 후 활용할 수 있도록 한다.

---

# 18. 향후 확장 시나리오

현재 User Flow는 포트폴리오 생성에 초점을 맞춘다.

향후 다음 기능을 동일한 흐름으로 확장할 수 있다.

* 프로젝트 개선 제안
* 기술 역량 분석
* 개인 커리어 리포트
* 자기소개서 생성
* 면접 질문 생성
* 모의 면접
