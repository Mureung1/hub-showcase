# 추천 알고리즘 기준

구현 위치: [`frontend/src/algo/recommendTimetable.js`](../frontend/src/algo/recommendTimetable.js)

## 입력 / 출력

```js
recommendTimetable(preferences, subjects) -> results
```

**preferences** (PreferenceScreen `onSubmit`이 넘기는 값)

| 필드 | 타입 | 설명 |
|---|---|---|
| `grade` | `number` | 학생 학년. 전공필수를 "내 학년 이하 누적"으로 필터링하는 데만 쓰임 (교양 등 일반 후보에는 적용 안 됨). 없으면 학년 제한 없이 전공필수 전부 대상 |
| `freeDays` | `string[]` | 공강 희망 요일 (예: `["금"]`). 전공필수가 아닌 과목만 이 요일에 걸리면 제외 |
| `avoidMorning` | `boolean` | true면 전공필수가 아닌 과목 중 오전(12:00 이전 시작) 수업 제외 |
| `targetCredit` | `number` | 목표 총 이수학점 |
| `completedIds` | `(string\|number)[]` | 이미 들은 과목의 lecture id 목록. 내부적으로 과목 "이름"으로 변환해서 선수과목 충족 판정과 재추천 방지에 사용 (분반 id가 달라도 이름만 같으면 동일 과목으로 인식) |
| `teamPreferred` | `boolean` | **알고리즘에서 무시됨** — lecture 스키마에 팀플 여부 필드가 없어 반영 불가 |
| `freeText` | `string` | 자유 텍스트 조건 — 알고리즘 입력이 아니라 백엔드 LLM 파서가 카테고리 조건으로 변환한 뒤 여기 들어와야 함 (LLM 연동 전이라 현재 미반영) |

**subjects**: `lecture` 배열. 각 항목은 `{ id, name, credit, category, department, required, prerequisite, pair_group, tier, grade, times: [{day, start, end}] }` (`GET /api/lectures` 응답 형태). `grade`는 학교 API의 `estblGrade`를 그대로 저장한 값으로 `"1"`~`"4"` 또는 학년 무관인 `"*"`.

**반환값**: 상위 3개 추천 결과 배열. 각 항목은 `{ id, label, lectures, totalCredit }`.

## 처리 단계

0. **분반 중복 제거**
   같은 과목이 분반(같은 이름, 다른 id)별로 여러 행일 수 있다. 학생은 그중 하나만 골라 듣는 것이므로, 추천 후보 풀에는 이름당 한 행만 남긴다 (`dedupeSubjectsByName`). 중복 시 `required=true`인 분반을 대표로 남긴다. 이후 모든 단계는 이 중복 제거된 목록을 기준으로 동작한다.

1. **전공필수 확정**
   `required === true`인 과목 중, ①이미 들은 과목(이름 기준)이 아니고 ②`grade`가 넘어왔다면 학생 학년 이하(누적)인 과목만 조건(공강요일/오전수업/선수과목)과 무관하게 항상 포함한다. 학년 정보가 없는 과목(`grade`가 없거나 `"*"`, 예: 교양)이거나 `preferences.grade`가 안 넘어온 경우는 학년 제한 없이 통과.
   전공필수끼리 시간이 겹치면(커리큘럼 데이터 오류) 먼저 확정된 과목을 우선하고 겹치는 과목은 제외한다 (`resolveRequiredConflicts`, 콘솔 경고 출력).

2. **동시수강 세트 강제 포함**
   전공필수와 `pair_group`을 공유하는 비필수 과목(예: 필수 이론 + 선택 실습)은 "항상 함께" 규칙에 따라 조건 필터와 무관하게 같이 확정 포함한다.

3. **후보 필터링** (확정되지 않은 나머지 과목 대상)
   - 이미 들은 과목(이름 기준)이면 제외 (전공필수뿐 아니라 일반 선택과목도 동일하게 적용)
   - 선수과목(`prerequisite`)이 있으면 전부 `completedIds`가 가리키는 과목 이름에 포함돼야 후보로 인정
   - `freeDays`에 걸리는 요일에 수업이 있으면 제외
   - `avoidMorning`이 true면 12:00 이전 시작 수업 제외

4. **동시수강 세트 단위화**
   남은 후보 중 `pair_group`이 같은 과목들은 하나의 탐색 단위(unit)로 묶는다. `pair_group`이 없으면 단독 단위.

5. **백트래킹 조합 탐색**
   "목표 총 이수학점 − 확정(전공필수+강제세트) 학점"을 채우도록, 시간이 겹치지 않는 단위 조합을 탐색한다.
   - 단위는 학점 큰 순으로 정렬 후 탐색 (가지치기 효율을 위해)
   - 각 단계에서 남은 후보를 모두 더해도 목표 근처(허용오차 이내)에 못 미치면 그 가지를 포기
   - 총 학점이 목표+허용오차를 넘는 단위는 더 이상 추가하지 않음
   - 안전장치: 백트래킹 스텝 수가 `MAX_SEARCH_STEPS`(30만)를 넘으면 강제 종료 (교양 700+건처럼 후보가 많을 때 무한정 돌지 않도록)

6. **허용 오차**
   목표 학점과 정확히 일치하는 조합이 없으면 오차범위 **±3학점** 이내 조합까지 결과 후보로 채택.

7. **정렬 및 반환**
   학점 오차 최소화(1순위) → 등급(`tier`) 평균 점수 높은 순(2순위)으로 정렬해 상위 3개만 반환.

## 상수

| 상수 | 값 | 의미 |
|---|---|---|
| `MORNING_CUTOFF` | `"12:00"` | 이 시각 이전 시작이면 "오전 수업"으로 판정 |
| `CREDIT_TOLERANCE` | `3` | 목표 학점 허용 오차(±) |
| `MAX_SEARCH_STEPS` | `300000` | 백트래킹 최대 탐색 스텝 (성능 안전장치) |

## 알려진 제약

- **`teamPreferred` 미반영**: lecture 스키마에 팀플 여부 필드가 없어 데이터 보강 전까지 알고리즘에서 사용하지 않음.
- **`prerequisite`/`pair_group`/`tier`가 실제 DB에는 전부 NULL**: `backend/src/db/seedLectures.js`가 이 세 필드를 아직 채우지 않기 때문에, 위 2·3·7단계 로직은 코드상으로는 구현돼 있지만 실제 수집 데이터로는 항상 통과(prerequisite 없음)·단독 단위(pair_group 없음)·동점(tier 0) 처리된다. mock 데이터(`frontend/src/data/mockSubjects.js`)에는 이 필드들이 채워져 있어 로직 자체는 검증됨. 수기 큐레이션(CLAUDE.md 로드맵 "5. prerequisite/pair_group 수기 데이터 채우기")이 되어야 실사용 데이터에서도 동작한다.
- **`grade`는 실제 DB에 채워져 있음**: 위 세 필드와 달리 `grade`는 학교 API가 자체적으로 제공해서(`estblGrade`) 수기 큐레이션 없이 실사용 데이터에서도 바로 동작한다.
- **자유 텍스트 조건(`freeText`) 미반영**: 백엔드 LLM 연동 전이라 카테고리 조건으로 변환되지 않음.
