# 📄 06_INTERVIEW_WRITER.md

# Portfolio Zero-to-One Builder

---

# 0. 변경 배경

기존 Portfolio Generator는 Project Metadata + Resume + JD 분석 결과를 조합해 기업 맞춤형 슬라이드를 구성하고 Marp 포맷으로 PDF/PPT까지 변환하는 것을 목표로 했다.

피봇 이후에는 JD/이력서 조합이 없고, 대신 인터뷰 answer를 실시간으로 마크다운에 반영하는 것이 핵심이 되었다. 본 문서는 인터뷰 기반 **Writer / Tone Agent**의 동작으로 재작성되었다. 상세 배경은 [[01_PRD]] 0장 참고.

---

# 1. 문서 목적

본 문서는 Writer / Tone Agent가 유저 답변을 포트폴리오 마크다운으로 변환하는 전체 과정을 정의한다.

모든 생성 결과는 유저의 실제 답변을 근거로 작성되어야 하며, 답변에 없는 내용은 추가하지 않는다.

---

# 2. Writer / Tone Agent의 목표

1. 유저 답변만을 근거로 작성한다.
2. AI 특유의 문체를 최소화하고 개발자가 직접 쓴 것처럼 서술한다.
3. 유저의 이해도에 따라 서술 수위를 조정한다.
4. 이해도가 낮은 부분은 면접 방어용 코멘트로 위험을 알린다.

---

# 3. 입력 데이터

```text
Question (인용된 코드 포함)
        +
User Answer
        +
Ambiguity Judgement (SUFFICIENT | AMBIGUOUS | LOW_UNDERSTANDING)
        +
Content Type (PROBLEM_SOLVING | IMPLEMENTATION_INTRO)
        +
Portfolio History (지금까지의 인터뷰 turn 전체)
        +
Context (Code Scanner & Scorer가 추출한 project_overview / tech_stack)
```

Judgement와 Content Type은 서로 다른 축이다. **Content Type은 이 답변이 어떤 섹션(Key Implementation vs Trouble Shooting)에 들어갈지를 결정**하고, **Judgement는 그 섹션 안에서 서술을 얼마나 자신있게 쓸지, 방어 코멘트를 붙일지를 결정**한다. 둘 다 유저의 답변 내용을 보고 Ambiguity Checker 단계에서 함께 판정한다([[10_PROMPT_SPEC]] 7장 참고). 예를 들어 "동시성 문제 때문에 재시도 로직을 넣었다"는 답변은 Content Type=PROBLEM_SOLVING(→Trouble Shooting)이면서 Judgement=SUFFICIENT(→자신있는 서술)일 수 있다.

Context는 인터뷰 turn과 무관하게 세션 시작 시 한 번 채워지며, Writer / Tone Agent는 이를 그대로 Project Overview / Tech Stack 섹션에 반영한다. 인터뷰로 얻는 내용과 달리 Context는 유저 답변 없이도 채워지는 정적 사실 정보다. 구분 기준은 [[05_CODE_SCANNER_SCORER]] 5.1장 참고.

---

# 4. 내부 생성 Pipeline

```text
Input

↓

서술 수위 결정 (Judgement 기반)

↓

문장 교정 (Tone Correction)

↓

방어 코멘트 삽입 (LOW_UNDERSTANDING인 경우)

↓

전체 마크다운 재생성 (Full Regeneration)

↓

Output
```

---

# 5. 왜 부분 업데이트가 아니라 전체 재생성인가

턴마다 특정 섹션만 부분 patch하는 방식은 섹션 매칭, diff 병합, 상태 동기화 같은 엔지니어링 복잡도를 크게 늘린다. 반면 인터뷰 turn 히스토리를 구조화된 상태로 유지하고 매 턴 전체 마크다운을 처음부터 다시 생성하면, 유저 입장에서는 "바로 반영되네"로 동일하게 느껴지면서도 diff 로직 관련 버그 유발 지점을 제거할 수 있다.

MVP는 이 방식을 채택하고, 인터뷰 세션이 길어져 재생성 비용/속도가 문제가 될 경우에만 부분 업데이트를 재검토한다.

---

# 6. 서술 수위 조정 규칙

## SUFFICIENT

주도적 구현/설계 관점으로 서술한다.

```
좋은 예:
결제 승인 실패 시 재시도가 필요하다고 판단해
지수 백오프 방식의 재시도 로직을 직접 구현했다.
```

## AMBIGUOUS (재질문 이후에도 애매)

LOW_UNDERSTANDING과 동일하게 취급한다.

## LOW_UNDERSTANDING

담백한 수준으로 하향 조정한다.

```
하향 조정 예:
오픈소스 예제를 참고하여 재시도 로직을 구현하고
프로젝트 상황에 맞게 일부 파라미터를 커스텀했다.
```

---

# 7. 면접 방어용 코멘트

LOW_UNDERSTANDING으로 판정된 항목에는 마크다운 내 주석으로 코멘트를 삽입한다.

```markdown
<!-- 💡 면접 대비 가이드:
이 부분은 레퍼런스를 참고했다고 답변하셨습니다.
면접에서 "왜 이 방식을 선택했는지" 질문받을 수 있으니
관련 개념(예: 지수 백오프, 멱등성)을 미리 숙지해두는 것을 권장합니다. -->
```

이 주석은 최종 다운로드본에도 포함되어, 유저가 면접 전 취약 부분을 스스로 점검할 수 있게 한다.

---

# 8. 문장 작성 원칙 (공통)

### 결과 중심

나쁜 예

```
Redis를 사용했습니다.
```

좋은 예

```
조회 성능 개선을 위해 Redis 캐싱을 적용했습니다.
```

---

### 문제 → 해결 → 결과 (유저 답변 범위 내에서만)

```text
문제 (유저가 답한 내용)

↓

선택 (유저가 답한 내용)

↓

구현 (유저가 답한 내용)

↓

결과 (유저가 답한 경우에만 포함, 없으면 생략)
```

---

### 금지 표현

* 열정적인 / 도전적인 등 의미 없는 수식어
* 답변에 없는 수치("성능 40% 향상" 등 근거 없는 성과)
* 과도한 강조(**) 및 문장부호 남용

---

# 9. Evidence 연결

모든 슬라이드/섹션은 근거를 가진다.

```json
{
  "section": "Trouble Shooting",
  "evidence": {
    "code": "PaymentService.js (인용된 스니펫)",
    "user_answer_turn": 3
  }
}
```

Evidence가 없는 내용(코드 근거도, 유저 답변도 없는 내용)은 생성하지 않는다.

---

# 10. 마크다운 구성

```text
1. Project Overview      ← Context (README) 기반, 인터뷰 불필요, 세션 시작 시 즉시 채워짐
                              (프로젝트 동기/한 줄 아이디어는 README에 있으면 포함, 없으면 MVP에서는 생략)

2. Tech Stack             ← Context (package.json 등) 기반, 인터뷰 불필요, 세션 시작 시 즉시 채워짐

3. Key Implementation     ← Content Type == IMPLEMENTATION_INTRO인 turn들

4. Trouble Shooting        ← Content Type == PROBLEM_SOLVING인 turn들
                              (Judgement == LOW_UNDERSTANDING이면 방어 코멘트 동반)

5. Summary                ← 3~4번에 이미 채워진 내용을 기계적으로 재구성 (아래 10.2장 참고)
```

1~2번 섹션은 인터뷰 시작과 동시에 Context 데이터로 채워지고, 3~4번 섹션만 인터뷰가 진행됨에 따라 각 turn이 Content Type에 따라 둘 중 하나로 분류되어 점진적으로 채워진다. 즉 유저는 첫 질문을 받기 전부터 이미 절반가량 채워진 프리뷰를 보게 된다.

## 10.1 인터뷰 결과가 적을 때 (Sparse Interview)

선정된 3~5개 파일에서 나온 전체 chunk 중 `pattern: "none"`(패턴 미감지, 일반 질문으로 대체된 항목) 비율이 과반수 이상이면, 프로젝트가 비교적 단순한 구조라 트러블슈팅/구현 포인트가 적게 감지되었다는 뜻이다. 이 경우:

```
1. 질문 개수를 억지로 늘리지 않는다 (가능한 질문까지만 진행)

2. 마크다운 상단(Project Overview 근처)에 다음과 같은 안내를 삽입한다:
   "이 프로젝트는 비교적 단순한 구조로 판단되어
    트러블슈팅/구현 포인트가 적게 발견되었습니다."

3. 인터뷰는 정상적으로 종료하고, 모은 답변만으로 포트폴리오를 생성한다.
```

이 안내는 유저가 "결과물이 왜 이렇게 짧지?"라고 오해하지 않도록 하기 위함이며, 없는 내용을 지어내 채우지 않는다는 Evidence First 원칙과도 일치한다.

## 10.2 Summary 섹션 생성 규칙 (기계적 재구성)

Summary는 새로운 문장을 LLM이 창작하지 않는다. Hallucination 위험을 원천 차단하기 위해, 이미 Key Implementation/Trouble Shooting에 채워진 항목의 제목과 개수만 기계적으로 재구성한다.

```
예:
"핵심 구현 3건 (Payment 재시도 로직, 상품 조회 캐싱, 주문 상태 관리),
트러블슈팅 2건 (동시성 이슈 해결, 캐시 무효화 문제 해결) 정리됨"
```

즉 Summary는 Writer / Tone Agent의 LLM 호출 결과가 아니라, 지금까지 쌓인 섹션 제목 목록을 코드 레벨에서 그대로 나열하는 논-LLM 처리다.

---

# 11. 출력 형식

MVP 출력 형식

* Markdown (.md)

향후 확장

* PDF
* PPT
* Notion Export

---

# 12. 품질 기준

### 정확성

모든 내용은 유저의 실제 답변에 기반한다.

### 정직성

이해도가 낮은 부분을 숨기지 않고 방어 코멘트로 드러낸다.

### 자연스러움

AI 특유의 문체를 최소화한다.

### 검증 가능성

모든 핵심 문장에는 코드 근거 또는 유저 답변 근거가 존재한다.

---

# 13. 실패 처리

### 유저 답변이 비어있거나 무의미함

해당 섹션은 생성하지 않고 다음 질문으로 진행한다.

### 근거 부족

근거 없는 내용은 생성하지 않는다.

---

# 14. MVP 구현 범위

* 서술 수위 조정 (SUFFICIENT / LOW_UNDERSTANDING 2단계)
* 면접 방어용 코멘트 삽입
* 전체 마크다운 재생성
* Markdown 출력

---

# 15. 향후 확장

* 부분 업데이트(섹션 단위 patch) 방식으로 전환
* PDF/PPT 변환
* 이력서/JD 선택 입력을 반영한 강조점 조정
* 발표용 스크립트 자동 생성
* 프로젝트 레벨 동기 오프닝 질문 도입 (README에 프로젝트 동기가 없을 경우, 파일 단위 인터뷰 전에 "왜 이 프로젝트를 시작했는지"를 한 번 물어 Project Overview를 보완. 상세는 [[05_CODE_SCANNER_SCORER]] 12장 참고)

---

# 16. 최종 역할 정의

Writer / Tone Agent는 유저를 대신해 글을 써주는 대필기가 아니라, 유저의 답변을 정제하고 이해도에 따라 정직하게 서술 수위를 조정하는 **가이드 기반 에디터**다.

```text
User Answer

↓

서술 수위 조정

↓

톤 교정

↓

방어 코멘트

↓

전체 마크다운 재생성
```
