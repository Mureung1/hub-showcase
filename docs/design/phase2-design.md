# Phase 2 설계 — `roles` 테이블 & 2-1 확정 화면(CoordinateConfirm)

> 작성일: 2026-07-22 · 이 문서는 설계 문서다. 코드/마이그레이션은 포함하지 않으며, 다음 작업(확정 API 구현)이 이 문서를 기준으로 진행된다.

## 1. 현행 스키마 요약

마이그레이션 파일은 아직 없고, `server/src/controllers/lettersController.js` / `responsesController.js`의 Supabase 쿼리로부터 역추적한 실제 스키마는 다음과 같다.

| 테이블 | 컬럼 | 비고 |
|---|---|---|
| `letters` | `id, title, host_name, topic, candidate_slots(jsonb[]), candidate_locations(jsonb[]), link_token` | 시간·장소 **후보**가 `letters`에 JSON으로 임베드됨. 각 원소는 `{id, label, votes}` 형태 |
| `participants` | `id, letter_id → letters, name, status` | `status` 예: `'시간대 응답 완료'` |
| `responses` | `id, participant_id → participants, selected_slot_ids[], selected_location_ids[]` | `candidate_slots`/`candidate_locations`의 id를 참조 |

**패턴**: 후보(candidate)는 비정규화된 JSON 배열로, 사람·응답은 정규화된 테이블로 저장하는 혼합 스타일이 이미 쓰이고 있다. 아래 `roles` 설계는 이 중 "정규화" 쪽 스타일을 따른다 (§2 참고).

## 2. `roles` 테이블 — 확정 스키마

역할 배정 후보 3안(정규화 테이블 / JSONB 임베드 / 다대다) 중 **정규화 테이블(assignee_id FK)** 을 채택했다.

```
roles
  id           uuid         pk
  letter_id    uuid         fk → letters.id
  name         text         -- 역할 이름 (예: "자리 세팅")
  reason       text         -- 추천 근거 = AI 에이전트 출력 (예: "가장 먼저 도착 가능한 참가자에게 적합")
  assignee_id  uuid         fk → participants.id, nullable   -- 배정 전에는 null
  source       text         -- 'ai' | 'manual' — 에이전트 추천으로 생성됐는지, 직접 추가했는지
  done         boolean      default false
  position     int          -- 화면 표시 순서
  created_at   timestamptz  default now()
```

### 채택 이유
- **participants/responses와 같은 정규화 스타일**을 유지 — `letters`에만 JSON을 임베드하고 사람·응답은 테이블로 관리하는 기존 패턴과 일관됨.
- **SCR4 진행 화면(ProgressWorkspace/ProgressChecklist)의 역할 단위 체크(done) 토글**이 각 역할 행을 원자적으로 업데이트해야 하는데, 정규화 테이블이면 `UPDATE roles SET done=true WHERE id=...` 한 줄로 끝난다.
- **`assignee_id` FK**로 참여자 삭제/이름 변경 시에도 참조 무결성이 깨지지 않는다 (JSON 임베드였다면 이름 문자열이 어긋날 수 있음).
- 역할 수 카운트(`역할 4명 배정 완료` 등, 확정 화면에서 필요 — §5)가 `COUNT(*) WHERE letter_id=...`로 단순해진다.

### 채택하지 않은 안
| 안 | 요약 | 왜 안 골랐나 |
|---|---|---|
| B. `letters.roles` JSONB 배열 | `candidate_slots`처럼 통째로 임베드, 목업 `ROLES` shape와 완전 동일 | 개별 역할 done 토글마다 배열 전체를 다시 써야 하고, assignee가 이름 문자열이라 드리프트 위험. SCR4가 역할 단위로 자주 갱신하므로 부적합 |
| C. `roles` + `role_assignments`(다대다) | 역할 1개에 담당자 여러 명 지원 | 목업(`ROLES`)은 역할당 담당자 1명 고정. 현재 스코프엔 과설계, 조인만 늘어남 |

### 다음 작업으로 넘기는 것
- 역할별 세부 체크리스트(mock `CHECKLIST`가 role id로 키됨 — 예: `role_tasks(id, role_id → roles, label, done)`)는 오늘 스코프 밖. 확정 API 구현 이후 별도 설계.

## 3. `letters` 확정 상태 필드 (추가)

2-1 확정 화면은 "이미 확정된 시간/장소"를 표시하는 화면이므로, 그 확정 결과를 저장할 자리가 `letters`에 필요하다.

```
letters (추가 컬럼)
  confirmed_slot_id      text          -- candidate_slots 중 확정된 후보의 id
  confirmed_location_id  text          -- candidate_locations 중 확정된 후보의 id
  confirmed_at           timestamptz   -- null이면 미확정
```

- 확정 화면의 "이대로 확정할게요" 버튼이 (다음 작업에서 구현될 확정 API를 통해) 이 세 필드를 채운다.
- `confirmed_at IS NULL` 여부로 화면의 `notConfirmed`/`confirmed` 상태 분기가 그대로 대응된다 (§4).
- 실제 확정 API 엔드포인트·컨트롤러 구현은 오늘 범위 아님 — 다음 작업.

## 4. 2-1 확정 화면 구조 요약 (`templates/coordinate-confirm/CoordinateConfirm.dc.html`)

- 레이아웃: 좌측 공통 사이드바(nav) + 우측 메인. 메인 중앙에 레이스 프레임(`lace-frame-rect.png`) 안에 앉힌 편지 카드 1장.
- 카드는 점선으로 구분된 **4행**: `모임` / `시간` / `장소` / `역할`. 목업 값: "한강 피크닉 모임" / "토 오후 2시" / "🌿 반포한강공원 잔디밭" / "4명 배정 완료".
- 하단 액션: 미확정 상태(`notConfirmed`)에서 primary 버튼 **"이대로 확정할게요"** 1개만 노출.
- 클릭 시(`confirm()`): `confirmed: true`로 상태 전환 → 5장의 꽃잎이 퍼지는 개화 애니메이션(`lco-bloom-petal`) + 텍스트 "모두에게 확정 소식을 전했어요" + ProgressWorkspace로 이동하는 accent 버튼 노출.
- 상태는 컴포넌트 로컬 `state.confirmed` 불리언 하나뿐 — 서버 연동 없이 화면 내 토글만 구현된 상태(실제 확정 API 연동은 다음 작업).

### 불일치 플래그
브리프(요청 문구·`docs/plan.md`)는 "시간·장소·주제를 최종 확정"이라 서술하지만, 현재 템플릿 카드에는 **주제(topic) 행이 없다** — `모임` 행(그룹/모임 이름)이 사실상 그 자리를 대신하고 있다. `letters.topic` 필드는 이미 존재하므로, 화면 구현 시 다음 중 택1이 필요:
- (a) 카드에 `주제` 행을 추가하고 `모임` 행과 분리
- (b) 지금처럼 `모임` 행 하나로 유지(주제는 모임 이름에 흡수된 것으로 간주)

→ **결론: (b) 채택 — `모임` 행 하나로 유지, 주제 행 별도 추가 안 함.** `topic`은 `candidate_slots`/`candidate_locations`처럼 여러 후보 중 골라 확정하는 값이 아니라 모임 생성 시 호스트가 한 번 적는 고정 텍스트이므로, 이 화면에서 별도로 "확정"할 대상이 아니기 때문.

## 5. 2-1 화면 데이터 요구 — 출처 매핑

| 화면 표시값 | 데이터 출처 |
|---|---|
| `모임` (제목) | `letters.title` |
| (보류) `주제` | `letters.topic` — §4 불일치 참고 |
| `시간` | `letters.confirmed_slot_id`로 `candidate_slots`에서 해당 원소의 `label` 조회 |
| `장소` | `letters.confirmed_location_id`로 `candidate_locations`에서 해당 원소의 `name` 조회 |
| `역할` (예: "4명 배정 완료") | `SELECT COUNT(*) FROM roles WHERE letter_id = ?` |
| 확정 여부 (`notConfirmed`/`confirmed`) | `letters.confirmed_at IS NULL` 여부 |
| "이대로 확정할게요" 클릭 동작 | (다음 작업) 확정 API가 `confirmed_slot_id`/`confirmed_location_id`/`confirmed_at`을 기록 |

시간/장소가 "확정된 후보"로 좁혀지는 시점은 이 화면 이전(SCR1 스케줄/장소 화면)의 투표 결과 집계에서 결정되며, 2-1 화면은 그 **승자만 읽어서 표시**한다.

## 6. 추천 AI 에이전트가 이 화면에서 쓰이는 위치

**핵심 결론: 확정 화면(2-1)은 에이전트를 실시간으로 호출하지 않는다.** 에이전트는 이 화면보다 **상류(upstream)** 단계에서 이미 결과를 만들어 놓았고, 확정 화면은 그 결과를 **표시만** 한 뒤 사람이 클릭으로 최종 확정한다.

| 단계 | 에이전트 역할 | 데이터 흔적 |
|---|---|---|
| 시간 조율 (SCR1 CoordinateSchedule) | 겹치는 시간대 자동 취합·추천 | `candidate_slots[].votes` |
| 장소 조율 (SCR1) | 위치 기반 중간지점 장소 후보 추천 | mock `PLACES[].reason` (예: "참가자 절반 이상의 이동 동선 기준 중간지점") |
| 역할 배정 (SCR2 CoordinateRoles) | 역할별 담당자·업무 추천 | mock `ROLES[].reason` (예: "가장 먼저 도착 가능한 참가자에게 적합") → `roles.reason`, `roles.source='ai'`로 저장 |
| **확정 (2-1 CoordinateConfirm)** | **없음 — 표시 전용** | 위 세 결과를 읽어 카드에 나열, 사람이 "이대로 확정할게요" 클릭 |

이는 `CLAUDE.md`의 설계 원칙(자동 확정 UI 금지 — 모든 확정은 사용자 클릭으로 완료)과도 일치한다: 에이전트는 후보/근거를 만들 뿐이고, 확정 화면은 그 산출물에 대해 사람이 마지막 결정을 내리는 **게이트** 역할만 한다.

## 7. 다음 작업으로 넘기는 것 (오늘 범위 아님)

- 확정 API 구현 (`confirmed_slot_id`/`confirmed_location_id`/`confirmed_at` 기록, `roles` 실제 마이그레이션)
- `role_tasks`(역할별 체크리스트) 스키마·구현
- SCR2 역할 배정 화면(`CoordinateRoles`) 실제 구현
- 2-3 확정 안내, 역할 상세 화면
- 공통 에러 처리 미들웨어

## 체크리스트 (요청 문구 기준 자체 점검)

- [x] `roles` 테이블 스키마 후보 중 하나(Option A: 정규화 테이블)를 고르고 이유를 남김 — §2
- [x] 2-1 화면에 추천 AI 에이전트가 어디서 어떻게 쓰이는지 명확화 — §6 (상류에서 생성, 확정 화면은 표시·게이트 전용)
- [x] 오늘은 코드가 아니라 설계 문서만 산출됨 (`docs/design/phase2-design.md` 1개 파일)
