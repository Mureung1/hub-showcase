# 📄 05_CODE_SCANNER_SCORER.md

# Portfolio Zero-to-One Builder

---

# 0. 변경 배경

기존 GitHub Analyzer는 README/docs/Wiki/설정 파일을 종합 분석해 Project Metadata를 생성하고 이를 Project Library에 저장해 재사용하는 것을 목표로 했다.

피봇 이후에는 JD 매칭이 없어 분석 결과를 재사용할 필요가 없고, 핵심 목적이 "인터뷰 질문을 던질 코드 파일 선정"으로 좁혀졌다. 이에 따라 본 문서는 **Code Scanner & Scorer**의 역할, 즉 단순 가중치 기반 파일 스코어링으로 재작성되었다. 상세 배경은 [[01_PRD]] 0장 참고.

---

# 1. 문서 목적

본 문서는 Code Scanner & Scorer Agent의 역할, 스코어링 방식, 데이터 처리 과정, 출력 데이터 구조를 정의한다.

Code Scanner & Scorer는 GitHub Repository의 소스 파일 중 인터뷰 질문을 던질 가치가 있는 핵심 파일을 선정하는 역할을 담당한다.

---

# 2. 목표

Code Scanner & Scorer의 목표는 코드를 모두 이해하는 것이 아니다.

```
GitHub Repository

↓

소스 파일 필터링

↓

단순 가중치 스코어링

↓

인터뷰 후보 파일 선정
```

즉, "이 파일이 프로젝트에서 핵심적인 역할을 하는가"를 저비용으로 판단할 수 있는 최소한의 신호만 사용하는 것이 목표다.

---

# 3. 커밋 횟수를 지표로 사용하지 않는 이유

원래 기획에서는 "커밋 빈도 × 코드 복잡도 × Git Diff 시맨틱 점수"로 가중치를 계산하는 방안을 검토했다.

그러나 타겟 유저(신입/부트캠프 수료생/취준생)의 실제 레포지토리는 다음과 같은 특징을 갖는 경우가 많다.

```
initial commit

↓

(중간 커밋 거의 없음)

↓

final submit / 제출용 커밋
```

이 경우 대부분의 파일이 커밋 횟수 1~2 수준으로 동일해져서, 커밋 빈도가 파일 간 변별력을 거의 만들어내지 못한다. 즉 정교한 공식을 만들어도 타겟 유저 데이터에서는 신호로 작동하지 않을 가능성이 크다.

따라서 MVP 단계에서는 커밋 횟수를 가중치 계산에서 제외하고, 파일 크기와 이름 패턴만으로 스코어링한다. 유저 풀이 커밋 히스토리가 풍부한 실무 프로젝트로 확장되면 Phase 2에서 재도입을 검토한다.

---

# 4. 전체 스코어링 Pipeline

```
Repository URL

↓

Repository 접근 확인

↓

파일 목록 수집

↓

확장자 필터링

↓

단순 가중치 스코어링

↓

상위 N개 후보 파일 선정

↓

대표 코드 스니펫 추출
```

---

# 5. 파일 필터링

## 포함 대상 (Candidate File)

소스 코드 확장자만 포함한다.

```
.js / .jsx / .ts / .tsx
.py
.java
```

MVP에서는 언어 1개(예: JS/TS)부터 지원하고 이후 확장한다.

이 파일들은 인터뷰 질문(Question Generator)의 대상이 되는 **Candidate File**이다.

## 완전 제외 대상

```
node_modules/
dist/
build/
.env
binary file
```

인터뷰뿐 아니라 어떤 단계에서도 사용하지 않는다.

## 제외되지만 별도로 재사용되는 대상 (Context File)

```
README.md
package.json / requirements.txt / pom.xml / build.gradle
docker-compose.yml / Dockerfile
```

이 파일들은 스코어링/인터뷰 대상(Candidate File)에서는 제외하지만, 완전히 버리지 않는다. **Context File**로 분류하여 별도 파이프라인으로 파싱한다.

---

# 5.1 Candidate File과 Context File을 나누는 이유

포트폴리오에서 실제로 필요한 정보는 두 종류로 나뉜다.

```
1. 이미 문서/설정에 사실로 적혀 있는 정보
   예: 사용 기술 스택, 프로젝트 한 줄 소개
   → 유저에게 물어볼 필요 없음, 정적 파일에서 바로 추출 가능

2. 문서/설정만 봐서는 알 수 없는 정보
   예: 왜 이 방식을 선택했는지, 어떤 문제를 겪었는지
   → 코드를 근거로 유저에게 질문해야만 알 수 있음
```

Candidate File(소스 코드)은 2번을 위한 인터뷰 질문 생성에 사용하고, Context File(README/설정 파일)은 1번을 위한 정적 정보 추출에 사용한다. 즉 Context File은 "인터뷰 없이 바로 채워지는 사실 정보 소스"이고, Candidate File은 "인터뷰를 통해서만 채워지는 서술 정보 소스"다.

이 두 파이프라인은 서로 독립적으로 동작하며, Context File 파싱 결과는 [[06_INTERVIEW_WRITER]]의 Project Overview / Tech Stack 섹션을 자동으로 채우는 데 쓰인다.

---

# 6. 단순 가중치 스코어링 (MVP)

```
최종 점수 = 파일 크기 점수 + 이름 패턴 보너스
```

상위 3~5개 파일을 그대로 인터뷰 대상으로 선정한다(점수 내림차순, 동점은 파일 경로 알파벳 순 타이브레이크). 유사한 파일이 몰려 뽑히는 문제(예: 컨트롤러 5개만 선정)를 막는 다양성 로직은 MVP에서는 넣지 않고, 필요성이 확인되면 Phase 2에서 "디렉토리당 최대 N개" 같은 규칙을 추가한다.

## 파일 크기 점수 (줄 수 기준 3단계)

```
15줄 미만              → 0.2  (상수/타입 선언 등 트리비얼 파일)
15줄 이상 300줄 이하    → 1.0  (실제 로직이 담긴 코어 파일)
300줄 초과              → 0.5  (자동 생성 코드/과도하게 큰 파일 가능성)
```

## 이름 패턴 보너스

파일/디렉토리 이름에 핵심 로직을 암시하는 패턴이 있으면 +0.3 보너스를 더한다.

```
service / controller / handler / usecase / core / engine 등
```

두 값은 그대로 더한다(정규화 없음). 이 임계값(15줄/300줄, 보너스 0.3)은 MVP 기본값이며, 실제 유저 레포 데이터를 보고 Phase 2에서 조정 가능하다.

---

# 7. 대표 코드 스니펫 추출

## 목적

Question Generator Agent에 넘길 코드 본문을 준비한다. 파일 전체를 매번 LLM에 넘기면 토큰 비용이 커지고, 흥미로운 부분이 흐릿해져 질문이 "핀포인트"가 아니라 뭉뚱그려질 위험이 있다. 그래서 흥미로운 블록만 미리 추려서 넘긴다.

## 처리 방식 (하이브리드, MVP 기준값)

AST 분석은 Phase 3로 미루므로, 진짜 파서 없이 다음 하이브리드 방식으로 처리한다.

```
1. 파일 줄 수 확인

2. 200줄 이하 → 자르지 않고 파일 전체를 그대로 사용

3. 200줄 초과 → 정규식/휴리스틱으로 함수 단위 블록을 대략 분리
   (`function foo(...) {`, `const foo = (...) => {` 등 패턴 탐지 +
    중괄호 개수 세기로 블록 끝 추정)

4. 분리된 블록마다 키워드 정규식으로 패턴 매칭
   (try/catch, async/await, useState 등)

5. 패턴이 감지된 블록 중 상위 1~2개만 채택

6. 패턴이 하나도 감지되지 않으면, 가장 큰 블록 1개를 pattern: "none"으로
   대신 채택한다 (파일마다 최소 1개의 질문거리를 보장하기 위함).
   Question Generator는 pattern이 "none"인 chunk에는 일반 질문(모듈 목적을 묻는
   질문)으로 대응한다 ([[10_PROMPT_SPEC]] 6장 참고).
```

이 방식은 진짜 함수 경계를 정확히 인식하지 못하고 대략적으로만 잘라내는 휴리스틱이다. 신입/부트캠프 수준의 비교적 단순한 코드에서는 대체로 작동하지만, 중첩이 복잡한 코드에서는 잘못 잘릴 수 있다. 이 리스크를 감수하고 MVP에서는 이 방식으로 구현하고, 정확도가 문제가 되면 Phase 2/3에서 AST 기반으로 교체한다(200줄 기준값 자체도 조정 가능한 설정값으로 둔다).

## 파일당 질문 개수

한 파일에서 패턴이 여러 개(예: try-catch + async/await) 감지되면 블록별로 각각 질문을 생성한다. 단 파일당 최대 2개 블록(위 5단계에서 상위 1~2개 채택)까지만 질문화하여, 파일 하나 때문에 인터뷰가 과도하게 길어지지 않게 한다.

---

# 8. 출력 스키마

Candidate File 스코어링 결과와 Context File 추출 결과는 별개의 필드로 출력한다.

```json
{
  "candidates": [
    {
      "file_path": "",
      "score": 0.0,
      "reason": "",
      "chunks": [
        { "code_snippet": "", "pattern": "try-catch" },
        { "code_snippet": "", "pattern": "async-await" }
      ]
    }
  ],
  "context": {
    "project_overview": {
      "service_description": "",
      "problem_to_solve": "",
      "duration": "",
      "team_and_role": "",
      "key_features": []
    },
    "tech_stack": {
      "language": [],
      "framework": [],
      "database": [],
      "infra": []
    },
    "sources": []
  }
}
```

`chunks` 배열의 각 항목이 하나의 인터뷰 질문으로 이어진다(파일당 최대 2개, [[05_CODE_SCANNER_SCORER]] 7장 참고).

## project_overview 추출 규칙

README에서 아래 5개 항목을 **각각 독립적으로** 추출 시도한다. 관련 헤더(예: "프로젝트 소개", "개요", "배경", "개발 기간", "팀원", "팀 구성", "역할", "주요 기능", "핵심 기능" 등 한글/영문 키워드)를 찾아 해당 섹션 내용을 추출한다.

```
1. service_description  — 어떤 서비스이고 어떤 문제를 해결하는지, 전체 그림
2. problem_to_solve      — service_description과 겹칠 수 있음, 명시적으로 분리되어 있으면 별도 추출
3. duration              — 개발 기간
4. team_and_role         — 참여 인원 및 본인 역할
5. key_features          — 주요 핵심 기능 목록
```

**항목 단위로 실패를 허용한다.** 5개 중 일부만 README에 있으면 있는 것만 채우고 나머지는 빈 값으로 둔다. 전체를 못 찾았다고 실패 처리하지 않는다. 비어있는 항목은 Phase 2에서 인식 규칙이 개선되면 채워질 수 있다.

## tech_stack 매핑 규칙 (사전 우선 + LLM 보완)

package.json/requirements.txt/docker-compose.yml 등에서 뽑은 의존성 이름을 `language/framework/database/infra` 카테고리로 분류한다.

```
1. 자주 쓰이는 라이브러리(수십~백여 개)는 하드코딩 매핑 사전으로 즉시 분류
   예: express→framework, pg→database, redis→infra, react→framework

2. 사전에 없는 낯선 의존성만 LLM에게 "language/framework/database/infra 중
   어디에 해당하는지" 분류를 맡김 (건별 호출이 아니라 세션당 1회, 미분류
   의존성 목록을 모아서 한 번에 질의)
```

---

# 9. 출력 예시

입력:

```
github.com/user/shop-service
```

출력:

```json
{
  "candidates": [
    {
      "file_path": "src/service/PaymentService.js",
      "score": 1.3,
      "reason": "파일 크기 점수 1.0(120줄) + 'service' 이름 패턴 보너스 0.3",
      "chunks": [
        { "code_snippet": "async function approvePayment(...) { try { ... } catch (e) { ... } }", "pattern": "try-catch" }
      ]
    }
  ],
  "context": {
    "project_overview": {
      "service_description": "온라인 상품 관리 및 주문 서비스",
      "problem_to_solve": "",
      "duration": "2024.01 ~ 2024.03",
      "team_and_role": "",
      "key_features": ["회원 관리", "상품 조회", "주문 처리"]
    },
    "tech_stack": {
      "language": ["JavaScript"],
      "framework": ["Express"],
      "database": ["MySQL"],
      "infra": ["Docker"]
    },
    "sources": ["README.md", "package.json", "docker-compose.yml"]
  }
}
```

(`problem_to_solve`, `team_and_role`은 README에 명시되어 있지 않아 빈 값으로 남은 예시)

---

# 10. Error Handling

## Repository 접근 실패

```
Error 반환

↓

사용자 재입력 요청
```

URL이 `github.com` 호스트가 아니면 스캔을 시작하지 않고 즉시 거부한다(SSRF 방지, [[07_API_SPEC]] 10장 참고).

## 지원 언어가 아님

Candidate File 확장자 필터를 통과하는 파일이 0개이면서, 레포에 다른 언어(Python/Java 등) 소스 파일은 존재하는 경우다. "코드가 없다"와는 다른 메시지를 보여준다.

```
"현재는 JS/TS 프로젝트만 지원합니다. 다른 언어 지원은 준비 중입니다."
```

## 소스 파일 부족 (지원 언어인데 코드 자체가 거의 없음)

```
후보 파일 0개 (지원 언어 소스 파일 자체가 없음)

↓

사용자에게 안내, 인터뷰 시작하지 않음
```

## 레포지토리 규모 초과

파일 개수가 임계값(예: 5,000개)을 넘으면 스캔을 시작하지 않는다.

```
"레포가 너무 커서 분석할 수 없습니다. 더 작은 레포로 시도해주세요."
```

## GitHub API 호출 방식 (MVP 포함)

비인증 호출은 시간당 60회로 제한되어 데모/테스트 중에도 막힐 수 있다. 서버가 보유한 GitHub Personal Access Token(PAT) 하나를 환경변수로 두고, 모든 GitHub API 호출에 `Authorization: token xxx` 헤더를 붙여 시간당 5,000회로 상향한다. 이 토큰은 서버 전용이며 유저가 직접 다루지 않는다(로그인/OAuth 아님).

파일 목록 수집은 Git Trees API(`recursive=1`)를 1회 호출로 사용해 디렉토리를 순회하지 않는다. 파일 내용(raw content)은 최종 후보 3~5개 파일에 대해서만 가져온다(전체 파일 내용을 미리 받지 않음).

---

# 11. MVP 구현 범위

## 필수

* Repository 파일 목록 수집
* 확장자 필터링 (Candidate File / Context File / 완전 제외 대상 분류)
* 파일 크기(3단계) + 이름 패턴 보너스 기반 단순 스코어링, 상위 3~5개 선정 (Candidate File 대상)
* 200줄 기준 하이브리드 청킹으로 파일당 최대 2개 chunk 추출 (Candidate File 대상)
* README 5개 항목(service_description/problem_to_solve/duration/team_and_role/key_features) 항목별 규칙 기반 파싱 (Context File 대상)
* 의존성 이름 → tech_stack 카테고리 매핑 (하드코딩 사전 우선 + 미분류 항목만 LLM 보완)
* 서버 GitHub PAT 설정 및 API 호출 시 인증 헤더 적용 (rate limit 대응)
* 레포 파일 개수 상한선 초과 시 스캔 거부
* GitHub URL 호스트 검증 (SSRF 방지)
* 지원 언어가 아닌 경우와 소스 파일 자체가 없는 경우를 구분한 에러 메시지

## 제외

* 커밋 히스토리 기반 가중치
* AST 분석
* Git Diff 시맨틱 분석
* 다중 언어 동시 지원

---

# 12. 향후 고도화 방향

## Phase 2

```
커밋 빈도 재도입 (단, 타겟 유저 풀 확장 후 재검증)
AST 기반 코드 복잡도 점수
프로젝트 레벨 동기 오프닝 질문
(README에 프로젝트 동기가 없을 경우, 파일 단위 질문과 별도로
"왜 이 프로젝트를 시작했는지"를 인터뷰 시작 시 한 번 물어 Project Overview를 보완)
```

## Phase 3

```
Git Diff 시맨틱 분석 (단순 문자열 수정과 로직 변경 구분)
Design Pattern 추론
```

---

# 13. 최종 역할 정의

Code Scanner & Scorer는 GitHub 크롤러가 아니라, 인터뷰에서 "무엇을 물어볼지"를 결정하기 위한 최소한의 신호를 저비용으로 만들어내는 **1차 필터링 Agent**다.

```
Raw Repository

↓

Scored Candidate Files

↓

Question Generator Agent
```
