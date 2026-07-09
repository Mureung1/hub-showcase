# 📄 03_SYSTEM_ARCHITECTURE.md

# AI Portfolio Agent

---

# 1. 문서 목적

본 문서는 AI Portfolio Agent 시스템의 전체 구조와 데이터 흐름을 정의한다.

시스템 내부의 주요 구성 요소와 AI Agent 간의 관계를 명확하게 정의하여 이후

* Backend 설계
* Database 설계
* API 설계
* AI Agent 설계
* 개발 환경 구성

의 기준 문서로 활용한다.

---

# 2. 시스템 설계 방향

AI Portfolio Agent는 AI 텍스트 생성 서비스가 아니라,

사용자의 실제 개발 경험 데이터를 분석하고 저장한 뒤,

채용공고에 맞는 프로젝트를 선택하여 포트폴리오를 생성하는

**Evidence 기반 AI Agent 시스템**을 목표로 한다.

---

# 3. 핵심 아키텍처 원칙

## 3.1 Project First Architecture

기존 방식:

```
JD 입력

↓

GitHub 분석

↓

포트폴리오 생성
```

문제:

* 매번 GitHub 분석 필요
* 비용 증가
* 응답 시간 증가

개선 방식:

```
GitHub 연결

↓

Project Library 생성

↓

프로젝트 데이터 저장

↓

JD 입력

↓

Project Library 검색

↓

포트폴리오 생성
```

장점:

* 분석 결과 재사용
* 빠른 생성
* 비용 절감

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

        ┌────────────┼────────────┐

        ▼            ▼            ▼

 Project Library   Resume      JD Manager

        │            │            │

        └────────────┼────────────┘

                     │

                     ▼

              AI Agent System

                     │

        ┌────────────┼────────────┐

        ▼            ▼            ▼

 GitHub Analyzer  Matching   Generator

                     │

                     ▼

             Portfolio Output

                     │

                     ▼

              PDF / PPT / MD
```

---

# 5. 주요 시스템 컴포넌트

---

# 5.1 User Application

## 역할

사용자가 서비스를 이용하는 인터페이스 제공

---

## 주요 기능

* 회원 관리
* GitHub 연결
* Project Library 관리
* Resume 업로드
* JD 입력
* AI 생성 상태 확인
* Portfolio Preview
* 다운로드

---

# 5.2 Project Library

## 역할

사용자의 프로젝트 정보를 저장하고 관리하는 핵심 영역

---

## 목적

한 번 분석한 프로젝트 정보를 재사용한다.

JD가 변경될 때마다 GitHub를 다시 분석하지 않는다.

---

## 저장 정보

### 기본 정보

* 프로젝트명
* Repository 주소
* 생성일
* 마지막 분석일

### 기술 정보

* Programming Language
* Framework
* Database
* Infrastructure
* Library

### 프로젝트 이해 정보

* 프로젝트 목적
* 핵심 기능
* 해결하려던 문제
* 구현 과정에서 발생한 문제와 해결법
* 주요 구현 내용
* 예상 성과

### AI 분석 정보

* 프로젝트 태그
* 직무 관련성
* 난이도
* 추천 점수

### Evidence 정보

분석 근거 저장

예:

```
README.md

requirements.txt

package.json

docs/performance.md
```

---

# 5.3 GitHub Analyzer

## 역할

GitHub Repository를 분석하여 Project Metadata를 생성한다.

---

## 입력

```
GitHub Repository URL

또는

GitHub Account Connection
```

---

## 분석 데이터

### Documentation

* README.md
* docs/
* GitHub Wiki (존재 시)

### Configuration

* package.json
* requirements.txt
* pom.xml
* build.gradle
* Dockerfile
* docker-compose.yml

### Structure

* Directory Tree
* 주요 폴더 구조

### Code Sample

필요한 경우 대표 코드 일부 분석

---

## 출력

Project Metadata

예:

```json
{
 "project_name": "",
 "purpose": "",
 "features": [],
 "tech_stack": [],
 "architecture": "",
 "evidence": []
}
```

---

# 5.4 Resume Analyzer

## 역할

사용자의 이력서를 분석하여 경험 정보를 구조화한다.

---

## 입력

* PDF
* DOCX
* TXT

---

## 출력

```
Project Experience

Role

Technology

Achievement

Period
```

형태의 구조화 데이터 생성

---

# 5.5 JD Analyzer

## 역할

채용공고를 분석하여 기업 요구사항을 구조화한다.

---

## 입력

JD Text

---

## 출력

```
Required Skill

Preferred Skill

Job Keyword

Role Requirement

Company Preference
```

---

# 5.6 Project Library Retriever

## 역할

JD와 가장 관련성이 높은 프로젝트 후보를 찾는다.

---

## 동작 방식

```
JD

↓

Requirement 분석

↓

Project Library 검색

↓

Similarity 비교

↓

Candidate Project 생성
```

---

## 출력

```
Project A

Score: 92%

Reason:

Redis 경험이
JD 요구사항과 일치
```

---

# 5.7 Matching Agent

## 역할

최종 포트폴리오 대상 프로젝트를 결정한다.

---

## 판단 기준

* 기술 스택 일치
* 프로젝트 목적 일치
* 직무 관련성
* 경험 강도
* 성과 존재 여부

---

## 출력

```
Selected Project

Matching Reason

Highlight Point
```

---

# 5.8 Portfolio Generator

## 역할

선택된 프로젝트와 JD를 기반으로 포트폴리오를 생성한다.

---

## 입력

```
Project Metadata

+

Resume Data

+

JD Analysis
```

---

## 출력

```
Portfolio Content

Slide Structure

Markdown

PDF/PPT
```

---

# 6. AI Agent Workflow

전체 AI 흐름은 다음과 같다.

```
User Input

↓

GitHub Analyzer

↓

Project Library 생성

↓

Resume Analyzer

↓

JD Analyzer

↓

Project Library Retrieval

↓

Matching Agent

↓

Portfolio Generator

↓

Reviewer

↓

Output
```

---

# 7. 데이터 흐름

## 7.1 최초 GitHub 연결

```
GitHub

↓

Repository Scanner

↓

Metadata Extraction

↓

AI Analysis

↓

Project Library 저장
```

---

## 7.2 포트폴리오 생성

```
JD 입력

↓

JD Analysis

↓

Project Library 검색

↓

Project 선택

↓

Portfolio 생성

↓

저장

↓

다운로드
```

---

# 8. Evidence 기반 구조

AI 생성 결과는 반드시 근거와 연결된다.

예:

생성 문장:

```
Redis 캐싱 적용으로
상품 조회 성능 개선
```

근거:

```
README.md

docs/performance.md

Cache 관련 코드
```

---

목표:

AI Hallucination 최소화

사용자가 결과를 검증 가능하도록 지원

---

# 9. 확장 가능 구조

현재:

```
Portfolio Agent
```

향후:

```
Career Platform

├── Portfolio Agent

├── Resume Agent

├── Interview Agent

├── Career Analysis Agent

└── Skill Growth Agent
```

형태로 확장 가능하도록 설계한다.

---

# 10. 시스템 설계 핵심 요약

AI Portfolio Agent의 핵심 구조는 다음과 같다.

```
GitHub 분석

↓

Project Library 구축

↓

사용자 경험 데이터 축적

↓

JD 분석

↓

적합 프로젝트 검색

↓

AI 기반 스토리 생성

↓

제출 가능한 Portfolio 생성
```

본 시스템은

**개발자의 실제 경험 데이터를 이해하고 활용하는 개인 Career Agent 플랫폼을 목표로 한다.**
