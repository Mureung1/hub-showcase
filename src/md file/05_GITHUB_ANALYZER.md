# 📄 05_GITHUB_ANALYZER.md

# AI Portfolio Agent

---

# 1. 문서 목적

본 문서는 AI Portfolio Agent의 핵심 Agent인 **GitHub Analyzer**의 역할, 분석 범위, 데이터 처리 과정, 출력 데이터 구조를 정의한다.

GitHub Analyzer는 사용자의 GitHub Repository를 분석하여 AI Agent가 프로젝트를 이해할 수 있는 구조화된 데이터(Project Metadata)를 생성하는 역할을 담당한다.

---

# 2. GitHub Analyzer의 목표

GitHub Analyzer의 목표는 코드를 모두 이해하는 것이 아니다.

목표는 다음과 같다.

```
GitHub Repository

↓

프로젝트 정보 추출

↓

구조화된 Metadata 생성

↓

AI Agent 활용
```

즉,

"이 프로젝트가 무엇인지"

"어떤 기술을 사용했는지"

"어떤 문제를 해결했는지"

"어떤 경험으로 표현할 수 있는지"

를 판단할 수 있는 데이터를 만드는 것이 핵심이다.

---

# 3. 설계 원칙

---

# 3.1 Evidence 기반 분석

AI가 생성하는 모든 정보는 실제 Repository 내부 데이터와 연결되어야 한다.

예:

잘못된 방식

```
Spring Batch 기반 대용량 데이터 처리 구현
```

근거 없음

↓

생성 금지

---

올바른 방식

```
Spring Batch 기반 데이터 처리 기능 구현
```

Evidence:

```
build.gradle

batch package

README.md
```

---

# 3.2 분석 결과 재사용

GitHub 분석은 매번 수행하지 않는다.

최초 분석:

```
GitHub

↓

Analyzer

↓

Project Metadata 저장
```

이후:

```
JD 입력

↓

Project Library 조회

↓

Matching
```

방식을 사용한다.

---

# 3.3 점진적 분석

분석 우선순위:

```
문서

↓

설정 파일

↓

구조 분석

↓

코드 분석
```

순서로 진행한다.

이유:

프로젝트 의도를 파악하는 데 문서와 설정 정보가 가장 효율적이기 때문이다.

---

# 4. 전체 분석 Pipeline

```
Repository URL

↓

Repository Clone

↓

File Scanner

↓

Document Analyzer

↓

Configuration Analyzer

↓

Directory Analyzer

↓

Code Sample Analyzer

↓

Metadata Generator

↓

Project Library 저장
```

---

# 5. Repository 수집 단계

## Input

```json
{
 "repository_url":
 "https://github.com/user/project"
}
```

---

## 처리 내용

Repository 접근 확인

↓

Clone 수행

↓

Local Workspace 생성

---

## 결과

```
repository/

├── README.md

├── src/

├── package.json

├── Dockerfile

└── docs/
```

형태의 분석 대상 확보

---

# 6. File Scanner

## 목적

Repository 내부 파일 구조를 파악한다.

---

## 분석 대상

### 우선 분석 파일

```
README.md

docs/

package.json

requirements.txt

pom.xml

build.gradle

Dockerfile

docker-compose.yml
```

---

### 제외 대상

분석 효율을 위해 제외한다.

예:

```
node_modules/

dist/

build/

.env

binary file
```

---

# 7. Documentation Analyzer

## 목적

프로젝트의 목적과 기능을 파악한다.

---

## 분석 대상

## README.md

가장 높은 우선순위를 가진다.

추출 정보:

* 프로젝트 목적
* 주요 기능
* 기술 스택
* 실행 방법
* 아키텍처 설명
* 성능 개선 내용

---

## docs/

분석 대상:

```
docs/

├── architecture.md

├── api.md

├── performance.md

├── trouble-shooting.md
```

---

추출 정보:

* 설계 의도
* 문제 해결 과정
* 기술 선택 이유

---

## GitHub Wiki

선택적으로 분석한다.

조건:

```
Wiki 존재 여부 확인

↓

존재 시 분석

↓

없으면 Skip
```

---

# 8. Configuration Analyzer

## 목적

프로젝트 기술 스택과 실행 환경을 파악한다.

---

# 분석 파일

## package.json

추출:

* Frontend Framework
* Library
* Version

예:

```json
{
 "framework":"Next.js",
 "library":[
  "React",
  "Tailwind"
 ]
}
```

---

## requirements.txt

추출:

* Python Framework
* Package

예:

```json
{
 "framework":"FastAPI",
 "package":[
  "LangChain"
 ]
}
```

---

## pom.xml

추출:

* Java Framework
* Dependency

---

## build.gradle

추출:

* Spring Boot
* Library
* Build 환경

---

## Dockerfile

추출:

* Runtime
* Deployment 방식

---

## docker-compose.yml

추출:

* Database
* External Service
* Infrastructure

---

# 9. Directory Tree Analyzer

## 목적

프로젝트 구조를 파악한다.

---

예:

```
backend

├── controller

├── service

├── repository

└── entity
```

---

AI 판단 정보:

```
Layered Architecture 가능성

confidence: 0.8
```

---

주의:

폴더명만으로 확정하지 않는다.

반드시 confidence 값을 가진다.

---

# 10. Code Sample Analyzer

## 목적

필요한 경우 대표 코드만 분석한다.

---

## MVP 범위

전체 코드 분석 X

대표 파일 분석 O

---

## 대상 예시

Backend:

```
Controller

Service

Repository
```

Frontend:

```
Component

Page

API Client
```

AI 관련:

```
Agent

Prompt

Pipeline
```

---

# 11. Project Metadata Schema

GitHub Analyzer의 최종 결과는 아래 구조를 가진다.

```json
{
 "project_name":"",
 
 "description":"",
 
 "purpose":"",
 
 "features":[
 ],
 
 "technology_stack":{
   "language":[],
   "framework":[],
   "database":[],
   "infra":[]
 },
 
 "architecture":{
   "type":"",
   "confidence":0
 },
 
 "deployment":{
 },
 
 "evidence":[
 ],
 
 "analysis_confidence":0
}
```

---

# 12. Evidence Schema

모든 정보는 근거와 연결한다.

예:

```json
{
 "claim":
 "Redis Cache 적용",
 
 "source":[
   {
    "file":"README.md",
    "line":"20-30"
   },
   {
    "file":"RedisConfig.java"
   }
 ]
}
```

---

# 13. 분석 결과 예시

입력:

```
github.com/user/shop-service
```

---

출력:

```json
{
 "project_name":"Shop Service",

 "purpose":
 "온라인 상품 관리 및 주문 서비스",

 "features":[
  "회원 관리",
  "상품 조회",
  "주문 처리"
 ],

 "technology_stack":{
  "language":[
   "Java"
  ],
  "framework":[
   "Spring Boot"
  ],
  "database":[
   "MySQL"
  ]
 },

 "architecture":{
  "type":
  "Layered Architecture",
  "confidence":0.82
 }
}
```

---

# 14. Error Handling

## Repository 접근 실패

처리:

```
Error 반환

↓

사용자 재입력 요청
```

---

## README 없음

처리:

```
README Skip

↓

설정 파일 분석 진행
```

---

## 분석 가능한 정보 부족

처리:

```
Metadata 생성

confidence 낮게 표시
```

---

# 15. MVP 구현 범위

초기 버전에서는 다음 기능을 구현한다.

## 필수

* Repository Clone
* README 분석
* docs 분석
* GitHub Wiki 분석(선택)
* 주요 설정 파일 분석
* Directory Tree 생성
* Project Metadata 생성

---

## 제외

초기 버전에서는 제외한다.

* AST 분석
* 전체 코드 이해
* Commit History 심층 분석
* 자동 Architecture Diagram 생성

---

# 16. 향후 고도화 방향

## Phase 2

추가 예정:

* Commit 분석
* PR 분석
* Issue 분석
* 코드 변경 패턴 분석

---

## Phase 3

고급 분석:

* AST 기반 코드 이해
* Design Pattern 추론
* Performance Issue 탐색
* Code Quality 평가

---

# 17. 최종 역할 정의

GitHub Analyzer는 단순한 GitHub 크롤러가 아니다.

사용자의 개발 경험을 AI가 이해할 수 있는 형태로 변환하는 **Knowledge Extraction Agent**이다.

최종 목표:

```
Raw Repository

↓

Project Knowledge

↓

AI Portfolio Generation
```

구조를 만드는 것이다.
