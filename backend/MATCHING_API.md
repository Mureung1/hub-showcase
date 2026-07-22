# 적합도 매칭 API

> 대응 설계: `docs/적합도_계산_설계.md`
> 대응 기능: F4 (매칭·랭킹), F5 (근거·방향 제시)
> 스택: Spring Boot 3 / Java 21 / PostgreSQL + pgvector

---

## 1. 파일 구조

```
hub/backend/
├── MATCHING_API.md
└── src/main/
    ├── java/com/hub/matching/
    │   ├── domain/                        # 순수 도메인 — 프레임워크 의존 최소
    │   │   ├── RequirementType.java        # 6개 타입 (SOFT 만 LLM 판정)
    │   │   ├── Necessity.java              # REQUIRED 1.0 / PREFERRED 0.4, 게이트 여부
    │   │   ├── SourcePosition.java         # 상단 1.2 / 하단 1.0 가중치 보정
    │   │   ├── Depth.java                  # 0.3 / 0.7 / 1.0
    │   │   ├── CredentialType.java
    │   │   ├── JobRequirement.java         # LLM 추출 결과 (점수 없음)
    │   │   ├── Credential.java             # 사용자 이력
    │   │   └── MatchScore.java             # 총점 + breakdown(JSONB)
    │   │
    │   ├── engine/                        # 결정론적 계산 — 여기엔 LLM 호출이 없다
    │   │   ├── FulfillmentEvaluator.java   # 전략 패턴 인터페이스
    │   │   ├── FulfillmentResult.java      # 근거 없으면 0.3 자동 캡
    │   │   ├── EvaluationContext.java      # 이력 스냅샷 (불변)
    │   │   ├── EvaluatorRegistry.java      # 타입 → evaluator, 누락 시 기동 실패
    │   │   ├── WeightEstimator.java        # w_raw → Σw=1 정규화
    │   │   ├── ScoreCalculator.java        # 가중합 × 게이트
    │   │   ├── ScoreCalibrator.java        # 퍼센타일 보정 + 구간표시 판단
    │   │   ├── Contribution.java           # breakdown 한 줄 + gapPriority()
    │   │   ├── ScoreResult.java            # topGaps(n) → F5 방향 제시
    │   │   ├── evaluator/
    │   │   │   ├── ExperienceYearsEvaluator.java   # clamp(years/threshold)
    │   │   │   ├── SkillUseEvaluator.java          # sim × depth × recency
    │   │   │   ├── CertificationEvaluator.java     # 조회 + 상위대체
    │   │   │   ├── EducationEvaluator.java
    │   │   │   ├── DomainEvaluator.java
    │   │   │   └── SoftEvaluator.java              # 유일한 LLM 경로
    │   │   └── support/
    │   │       ├── Years.java              # 기간 중복 제거 합산
    │   │       ├── Recency.java            # exp(-0.15 × 년)
    │   │       ├── SubjectNormalizer.java  # 사전 → 임베딩 → 미분류 큐
    │   │       ├── SubstitutionTable.java  # 상위 자격 대체
    │   │       └── EmbeddingPort.java      # pgvector 코사인
    │   │
    │   ├── llm/                           # LLM 경계 — 포트만 두고 어댑터는 교체 가능
    │   │   ├── RequirementExtractor.java   # 공고 → 구조체 (posting당 1회)
    │   │   ├── SoftJudge.java              # 서술형 판정
    │   │   ├── SoftGrade.java              # 이산 등급 4단계
    │   │   └── SoftJudgement.java
    │   │
    │   ├── job/                           # LLM 개입 연산은 전부 비동기
    │   │   ├── JobStatus.java
    │   │   ├── MatchJobService.java        # 202 + jobId 반환
    │   │   └── MatchingService.java        # 캐시 확인 후 재계산
    │   │
    │   ├── api/
    │   │   ├── MatchController.java
    │   │   ├── MatchQueryService.java      # 조회 전용 (계산 안 함)
    │   │   └── dto/
    │   │       ├── MatchItemResponse.java
    │   │       ├── MatchDetailResponse.java
    │   │       └── JobResponse.java
    │   │
    │   ├── repository/
    │   │   ├── JobRequirementRepository.java
    │   │   ├── CredentialRepository.java
    │   │   ├── JobPostingRepository.java
    │   │   └── MatchScoreRepository.java   # JSONB 때문에 JdbcTemplate 구현 필요
    │   │
    │   └── config/AsyncConfig.java
    │
    └── resources/db/migration/V2__matching.sql
```

### 레이어 규칙

```
api  →  job  →  engine  →  domain
                  ↓
                 llm (포트)
```

- `engine`은 `llm` **인터페이스만** 알고 구현체는 모른다 → 테스트 시 SoftJudge 를 스텁으로 바꾸면 전체가 결정론적이 된다
- `api`는 계산하지 않는다. 저장된 breakdown 을 변환만 한다
- `domain`은 어떤 상위 레이어도 참조하지 않는다

---

## 2. API 명세

### 2.1 포지션 목록 (F4)

```http
GET /api/v1/matches?page=0&size=20&excludeRequiredGap=false
```

```json
[
  {
    "postingId": 1042,
    "company": "OO테크",
    "title": "백엔드 개발자",
    "displayScore": 87,
    "displayScoreMin": null,
    "displayScoreMax": null,
    "showRange": false,
    "confidence": 0.91,
    "requiredGapExists": false
  },
  {
    "postingId": 1077,
    "company": "XX랩스",
    "title": "서버 엔지니어",
    "displayScore": 62,
    "displayScoreMin": 55,
    "displayScoreMax": 70,
    "showRange": true,
    "confidence": 0.58,
    "requiredGapExists": true
  }
]
```

`showRange`가 true면 프론트는 `62%`가 아니라 `55~70%`로 그린다. confidence 0.7 미만일 때 단정적 수치를 보여주면 신뢰를 잃는다.

### 2.2 포지션 상세 (F5)

```http
GET /api/v1/matches/{postingId}
```

```json
{
  "postingId": 1042,
  "displayScore": 30,
  "rawScore": 0.30,
  "weightedSum": 0.75,
  "confidence": 0.82,
  "breakdown": [
    {
      "requirementId": 101,
      "raw": "Python 개발 경력 3년 이상",
      "type": "EXPERIENCE_YEARS",
      "necessity": "REQUIRED",
      "weight": 0.4,
      "fulfillment": 1.0,
      "contribution": 0.40,
      "gate": 1.0,
      "evidence": "OO사 백엔드 개발 2021.03~현재",
      "note": "경력 4.3년 / 요구 3.0년"
    },
    {
      "requirementId": 104,
      "raw": "팀 리딩 경험",
      "type": "SOFT",
      "necessity": "REQUIRED",
      "weight": 0.1,
      "fulfillment": 0.0,
      "contribution": 0.0,
      "gate": 0.4,
      "evidence": null,
      "note": "관련 근거 없음"
    }
  ],
  "topGaps": [ /* gapPriority 내림차순 상위 3개 */ ]
}
```

`weightedSum` 0.75인데 `rawScore`가 0.30인 이유는 필수 조건 "팀 리딩"의 게이트 0.4가 곱해졌기 때문이다. 이 두 값을 함께 내려주면 프론트에서 **"조건만 보면 75%지만 필수 항목 미충족"** 이라는 설명을 만들 수 있다.

`topGaps`가 곧 "내 이력으로 맞추는 방향"의 데이터 소스다.

### 2.3 재계산 트리거

```http
POST /api/v1/matches/recalculate
→ 202 Accepted
{ "jobId": "e3b0c442-...", "status": "QUEUED", "pollUrl": "/api/v1/jobs/e3b0c442-..." }
```

```http
GET /api/v1/jobs/{jobId}
→ { "jobId": "...", "status": "RUNNING" }
```

LLM 호출이 섞이므로 동기 응답을 하지 않는다. 이력 저장(F2) 성공 직후 프론트가 이 엔드포인트를 호출하고, 목록 화면에서 폴링한다.

---

## 3. 계산 흐름

```
POST /matches/recalculate
      │
      ▼
MatchJobService ── 202 즉시 반환
      │ @Async
      ▼
MatchingService.recalculateAll(userId)
      │
      ├─ credentialSetVersion 조회 (트리거로 자동 증가)
      ├─ 포지션별 캐시 확인 → 적중 시 skip
      │
      ▼
ScoreCalculator.calculate(requirements, ctx)
      │
      ├─ WeightEstimator      → Σw = 1
      ├─ EvaluatorRegistry    → 타입별 분기
      │     ├─ EXPERIENCE_YEARS  산술
      │     ├─ SKILL_USE         사전/임베딩 × depth × recency
      │     ├─ CERTIFICATION     조회 + 대체
      │     ├─ EDUCATION         조회 + 대체
      │     ├─ DOMAIN            임베딩 × recency
      │     └─ SOFT              ── LLM 호출 (유일)
      │
      ├─ 필수 조건 게이트 곱산
      └─ confidence = 근거확보_가중치 / 전체_가중치
      │
      ▼
match_score UPSERT (total + breakdown JSONB)
```

---

## 4. 구현 시 확인 사항

**아직 구현체가 없는 인터페이스** (직접 채워야 하는 부분)

| 인터페이스 | 구현 방향 |
|---|---|
| `RequirementExtractor` | LLM 호출 + JSON 스키마 강제. temperature=0 |
| `SoftJudge` | 조건 1개당 독립 호출. 근거 발췌 실패 시 INDIRECT 상한 |
| `EmbeddingPort` | `job_requirement.embedding <=> credential.embedding` |
| `SubjectNormalizer` | `subject_alias` 조회 → 임베딩 최근접 0.85 → 미분류 큐 |
| `SubstitutionTable` | `subject_substitution` 조회 + 캐싱 |
| `MatchScoreRepository` | JdbcTemplate + JSONB. `ON CONFLICT DO UPDATE` |

**의존성 추가**

```gradle
implementation 'io.hypersistence:hypersistence-utils-hibernate-63:3.7.0'  // JsonBinaryType
implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
implementation 'org.flywaydb:flyway-database-postgresql'
```

**튜닝 대상 상수** (골든셋 확보 후 조정)

| 위치 | 값 | 비고 |
|---|---|---|
| `ScoreCalculator.GATE_FLOOR` | 0.4 | 필수 미충족 시 감쇠 폭 |
| `Recency.LAMBDA` | 0.15 | 직군별로 다르게 둘지 미정 |
| `FulfillmentResult.NO_EVIDENCE_CAP` | 0.3 | 근거 없는 판정 상한 |
| `SubjectNormalizer.NEAREST_THRESHOLD` | 0.85 | 오매칭 vs 미분류 트레이드오프 |
| `WeightEstimator.FREQUENCY_BONUS` | 1.15 | |

---

## 5. 테스트 전략

`SoftJudge`를 고정값 스텁으로 바꾸면 `ScoreCalculator` 전체가 결정론적이 된다. 즉 **엔진 테스트에 LLM 이 필요 없다.**

```java
@Test
void 필수조건_미충족시_게이트가_점수를_끌어내린다() {
    var reqs = List.of(
        required(EXPERIENCE_YEARS, "python", 3.0, 0.4),
        preferred(SKILL_USE, "aws", 0.3),
        preferred(CERTIFICATION, "정보처리기사", 0.2),
        required(SOFT, "팀 리딩 경험", 0.1)
    );
    var result = calculator.calculate(reqs, 김서준());

    assertThat(result.weightedSum()).isCloseTo(0.75, within(0.01));
    assertThat(result.total()).isCloseTo(0.30, within(0.01));   // × 0.4 게이트
    assertThat(result.topGaps(1).get(0).raw()).isEqualTo("팀 리딩 경험");
}
```

측정 지표는 절대오차가 아니라 **순위 일치도**(Spearman ρ, NDCG@10)를 쓴다. `golden_label` 테이블이 그 기준선이다.
