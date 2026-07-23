# 예전 코드 기록 (past-notes)

리팩토링으로 삭제/교체된 코드와 그 안에 있던 `// study:` 학습 메모를 보존하는 문서다.
코드베이스에는 더 이상 존재하지 않지만, 학습 기록으로 남긴다.

---

## 2026-07-23 — 결과 집계를 서버(JS) → DB(RPC)로 이관 (리뷰 3번)

`server/src/lib/results.ts`가 `responses` 전체 행을 끌어와 JS로 집계하던 방식을,
`server/db/migrations/0005_add_result_functions.sql`의 DB 함수(RPC) 호출로 바꿨다.

**이유:** Supabase(PostgREST)의 기본 1000행 제한 때문에, 응답이 1000행을 넘으면
에러 없이 조용히 잘려서 집계가 틀어질 수 있었다(참여자 1명이 넓은 범위를 다 선택해도 최대 31일×48=1488행).
집계를 SQL의 `group by`로 옮기고, 함수가 jsonb 한 덩어리를 반환하게 해서 행 제한과 무관하게 만들었다.

아래는 이때 삭제/교체된 함수들의 원본(당시 `// study:` 주석 포함)이다.

### `getAppointmentResponseRows` (삭제됨)

```ts
// claude: responses엔 appointment_id가 없어서, participants로 대상 id를 먼저 구한 뒤 그 id로 responses를 조회하는 2단계 쿼리.
export async function getAppointmentResponseRows(db: SupabaseClient, appointmentId: string): Promise<ResponseRow[] | null> {
  // study: 우선 해당 약속에 속한 참가자들의 id만 뽑아온다.
  const { data: participants, error: participantsError } = await db
    .from('participants') // study: participants 에서,
    .select('id')
    .eq('appointment_id', appointmentId) // study: 이 약속 소속인 id만 남긴다. (그 id들의 response 만 아래에서 가져오기 위함.)

  if (participantsError) return null

  const participantRows = (participants ?? []) as { id: string }[]
  const participantIds = participantRows.map((row) => row.id)
  if (participantIds.length === 0) return []
  // study: id 와 일치하는 response 내용만 가져온다.
  const { data, error } = await db
    .from('responses')
    .select('participant_id, date, time, is_preferred')
    .in('participant_id', participantIds)

  if (error) return null

  return (data ?? []) as ResponseRow[]
}
```

### `aggregateSlotCounts` (삭제됨 — 순수 함수, 이제 SQL의 group by가 대신함)

```ts
// claude: 순수 함수(DB 접근 없음) - 슬롯별 가능/선호 인원 집계. availableCount가 0인 슬롯은 애초에 등장하지 않으므로 결과에 포함되지 않는다.
export function aggregateSlotCounts(rows: ResponseRow[]): SlotResult[] {
  const counts = new Map<string, SlotResult>()

  for (const row of rows) {
    const time = normalizeTime(row.time)
    const key = slotKey({ date: row.date, time })
    const existing = counts.get(key)

    if (existing) {
      existing.availableCount += 1
      if (row.is_preferred) existing.preferredCount += 1
    } else {
      counts.set(key, { date: row.date, time, availableCount: 1, preferredCount: row.is_preferred ? 1 : 0 })
    }
  }

  return [...counts.values()]
}
```

### `countCompletedParticipants` (삭제됨 — 순수 함수, 이제 SQL의 count(distinct)가 대신함)

```ts
// claude: 순수 함수 - 응답을 하나라도 남긴 participant_id의 distinct 개수(= 일정 입력을 완료한 인원).
// study: rows 에서 id만 빼옴 -> Set 으로 만들어서 중복 제거 -> .size로 세어서 반환.
export function countCompletedParticipants(rows: ResponseRow[]): number {
  return new Set(rows.map((row) => row.participant_id)).size
}
```

### `getParticipantsResponseStatus` (교체됨 — 아래는 옛 버전. 현재는 get_participants_status RPC 호출)

```ts
// claude: 관리자 대시보드 하단 "참여자별 응답 상태" 목록용 - 참여자 전체(id+name)에 완료 여부를 붙여서 반환.
// getAppointmentResponseRows는 date/time/is_preferred까지 포함한 상세 행을 돌려주는데 여기선 completed 판단용
// participant_id만 필요해서, participants를 두 번 조회하게 되는 그 함수 대신 필요한 컬럼만 직접 조회한다.
export async function getParticipantsResponseStatus(
  db: SupabaseClient,
  appointmentId: string,
): Promise<ParticipantResponseStatus[] | null> {
  const { data: participants, error: participantsError } = await db
    .from('participants')
    .select('id, name')
    .eq('appointment_id', appointmentId)

  if (participantsError) return null

  const participantRows = (participants ?? []) as { id: string; name: string }[] // study: 참여자 목록. {id: 아이디; name: 이름} 형식.
  const participantIds = participantRows.map((row) => row.id)
  if (participantIds.length === 0) return []

  const { data: responses, error: responsesError } = await db
    .from('responses')
    .select('participant_id')
    .in('participant_id', participantIds)

  if (responsesError) return null

  // study: 응답 완료한 Id set.
  const completedIds = new Set((responses ?? []).map((row) => (row as { participant_id: string }).participant_id))

  return participantRows.map((row) => ({
    id: row.id,
    name: row.name,
    completed: completedIds.has(row.id),
  }))
}
```

### 함께 삭제된 타입

```ts
export type ResponseRow = {
  participant_id: string
  date: string
  time: string
  is_preferred: boolean
}
```