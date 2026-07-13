# 라인업 (Lineup)

취준생을 위한 AI 직무 추천 서비스.

기존 취업 사이트는 관심 직무를 **직접 골라 필터를 켜야** 합니다.
라인업은 포트폴리오·자격증·학교·전공을 종합해 **지금의 커리어와 잘 맞는 순서로 공고를 줄 세우고**,
각 공고마다 어떻게 지원하면 유리한지 점수 근거와 함께 알려줍니다.

지원 자체는 대행하지 않습니다. 기업 채용 페이지로 연결합니다.

```
내 프로필  ──▶  적합도 순 랭킹  ──▶  지원 전략  ──▶  기업 채용 페이지
(포트폴리오/자격증/전공)   (가중치 근거 공개)   (강조할 것 / 보완할 것)
```

## 기술 스택

| 영역 | 스택 |
|---|---|
| 백엔드 | Java 21, Spring Boot, JPA |
| DB | MySQL 8, Flyway |
| 프론트엔드 | React, Vite, styled-components |

---

## 설계의 핵심: 사람과 공고를 같은 좌표계에 올린다

이 프로젝트에서 가장 중요한 결정은 **스킬 정규화**입니다.

유저 포트폴리오에는 "스프링부트", 공고에는 "Spring Boot"라고 적혀 있습니다.
문자열 비교로는 영원히 매칭되지 않습니다.

그래서 모든 표기를 `skill_aliases`로 흡수해 하나의 `skill_id`로 정규화하고,
**유저 쪽(`user_skills`)과 공고 쪽(`posting_skills`)이 같은 ID를 참조**하게 했습니다.
그 결과 매칭이 조인 한 번으로 끝납니다.

```
skill_aliases        skills           posting_skills
"스프링부트"    ──▶   id: 2       ◀──   posting 1 requires skill 2
"SpringBoot"   ──▶   Spring Boot  ◀──   user_skills: user 1 has skill 2
"spring-boot"  ──▶                                     └─▶ 교집합 = 매칭
```

---

## 가중치를 손으로 적지 않는다

가장 흔한 실수는 `Java = 0.9, Git = 0.5` 식으로 가중치를 손으로 적는 것입니다.
확장이 안 되고, 무엇보다 **틀립니다.**

**거의 모든 백엔드 공고가 Git을 요구합니다. 그래서 Git을 아는 건 아무 정보도 주지 않습니다.**
반면 Kafka를 요구하는 공고는 5%뿐이고, 그 5%에 내가 Kafka를 안다면 강한 신호입니다.

그래서 정보검색의 IDF를 씁니다.

```
idf(skill) = ln( 전체_활성공고수 / (1 + 그_스킬_요구공고수) )
```

| 스킬 | 요구 공고 수 (10,000건 기준) | IDF | 의미 |
|---|---|---|---|
| Git | 9,500 | 0.05 | 거의 무의미 |
| Spring Boot | 2,000 | 1.61 | 보통 |
| Kafka | 500 | 3.00 | 강한 변별 신호 |

야간 배치로 계산해 `skills.idf_score`에 캐싱합니다.
**사람의 손이 닿지 않고, 공고 풀이 바뀌면 자동으로 따라 움직입니다.**

### 최종 스코어링

```
                 Σ(매칭된 스킬의 idf × 요구가중 × 내 confidence)
skill_coverage = ───────────────────────────────────────────────
                    Σ(공고가 요구한 전체 스킬의 idf)

final = ( 0.55·skill + 0.15·career + 0.10·major
        + 0.10·cert  + 0.10·location ) × gate
```

**분모 정규화가 핵심입니다.** 빼먹으면 "Java만 요구하는 공고"가 100% 매칭이 되어
요구사항이 적은 공고가 무조건 상위권을 먹습니다.

### 게이트는 더하지 않고 곱한다

경력 5년 필수 공고에 신입이 뜨는 문제는 **감점(-20점)으로 못 막습니다.**
다른 항목 점수가 높으면 그대로 뚫고 올라옵니다.

```java
double gate = 1.0;
if (요구경력 > 내연차 + 1)        gate *= 0.20 ~ 0.45;
if (필수스킬_커버리지 < 0.4)      gate *= 0.5;
if (시니어_공고 && 신입)          gate *= 0.25;
```

곱셈이라 뚫을 수 없습니다.

---

## 지원 전략: 갭 분석은 스코어링의 역함수다

지원을 대행하지 않는 대신, 각 공고에 "어떻게 쓰면 유리한지"를 알려줍니다.
**여기에 새로운 AI 호출이 필요 없습니다.** 이미 계산한 값에서 전부 나옵니다.

| 스코어링에서 나온 값 | 지원 전략에서의 의미 |
|---|---|
| 매칭된 고IDF 스킬 | **자소서에서 강조할 것** (희소하니 변별력이 큼) |
| 미매칭 REQUIRED 고IDF 스킬 | **보완하거나 우회 서술할 것** |
| 낮은 `career` 게이트 | 경력 부족을 정면으로 다뤄야 함 |
| 낮은 `location` | 지역 이동 의사를 명시해야 함 |

**자소서를 대신 써주지는 않습니다.** 문단 뼈대만 줍니다.
완성된 글을 생성하면 사용자 전원이 똑같은 자소서를 내게 되고,
기업 인사팀은 그걸 즉시 알아봅니다. 서비스가 오히려 사용자를 해치게 됩니다.

---

## DB 스키마

```
skills ──┬── skill_aliases            (표기 정규화)
         ├── user_skills   ─── users  (사람 쪽 좌표)
         └── posting_skills ─── job_postings (공고 쪽 좌표)
                                    │
recommendation_runs ── recommendations ── application_guides
                              └── recommendation_reasons
users ── user_activities ── job_postings   (학습 신호)
```

### 왜 추천 결과를 저장하는가

`recommendation_runs`에 `model_version`과 `profile_hash`를 남깁니다.

1. 프로필이 안 바뀌었으면 **재계산 스킵**
2. "왜 저 공고가 1등이었지?"를 나중에 **재현**
3. 모델 v1 vs v2 **순위 비교**

### `score_breakdown` JSON을 반드시 남기는 이유

```json
{ "skill": 41.2, "career": 9.3, "major": 8.5, "cert": 10.0, "gate": 0.45 }
```

지금 손으로 적은 가중치 0.55는 **나중에 데이터가 대체할 자리표시자**입니다.
`user_activities`가 쌓이면 이 항목별 점수가 그대로 로지스틱 회귀의 피처가 됩니다.

| 단계 | 방법 | 필요 데이터 |
|---|---|---|
| v1 (현재) | 휴리스틱 + IDF | 없음 |
| v1.5 | A/B로 가중치 조합 비교 | 수천 건 클릭 |
| v2 | 로지스틱 회귀 (회귀 계수 = 학습된 가중치) | 수만 건 |
| v3 | Learning-to-Rank | 그 이상 |

---

## 랭킹 품질을 어떻게 검증하는가

**순위별 아웃바운드 CTR**이 유일한 진짜 지표입니다.

```sql
-- db/queries/application_guide.sql
SELECT rank, impressions, outbound, ctr_pct FROM ... ORDER BY rank;
```

상위권 CTR이 하위권보다 유의하게 높지 않다면,
**이 가중치는 무작위 정렬과 다를 바 없습니다.**

---

## 알려진 한계

- **적합도는 합격 확률이 아닙니다.** 가중합을 100 스케일로 옮긴 값입니다.
  캘리브레이션 전까지는 UI에서 `%`를 붙이지 않습니다.
- **의미적 유사성을 잡지 못합니다.** "Java를 잘하면 Kotlin 공고도 어울린다" 같은 관계는
  스킬 교집합으로는 못 잡습니다. 임베딩(벡터) 기반 하이브리드가 v2 과제입니다.
- **지원 여부를 알 수 없습니다.** 아는 건 외부로 나갔다는 것뿐이라,
  이벤트 이름도 `APPLY`가 아니라 `OUTBOUND_CLICK`으로 뒀습니다.
  이걸 지원이라고 부르면 전환율 지표가 전부 거짓말이 됩니다.

---

## 로컬 실행

```bash
# 1. DB 생성
mysql -u root -p -e "CREATE DATABASE lineup CHARACTER SET utf8mb4;"

# 2. 접속 정보 설정
cp src/main/resources/application-local.yml.example \
   src/main/resources/application-local.yml
# → application-local.yml을 열어 password 수정
#   (이 파일은 .gitignore에 있어 커밋되지 않습니다)

# 3. 실행 — Flyway가 마이그레이션을 자동 적용합니다
./gradlew bootRun --args='--spring.profiles.active=local'
```

## 디렉터리

```
src/main/resources/db/
├── migration/                    # Flyway가 순서대로 실행
│   ├── V1__init_schema.sql
│   ├── V2__skill_idf.sql
│   ├── V3__application_guide.sql
│   └── V4__seed_master_data.sql
└── queries/                      # 마이그레이션 아님 — 앱/배치가 실행
    ├── idf_batch.sql             # 매일 새벽 IDF 재계산
    ├── candidate_recall.sql      # 후보군 200개로 축소
    └── application_guide.sql     # 갭/강점 추출, CTR 지표
```

`queries/`를 `migration/` 밖에 둔 이유: Flyway는 `V*` 파일을 **전부 실행하려 듭니다.**
조회 쿼리가 섞이면 마이그레이션이 깨집니다.
