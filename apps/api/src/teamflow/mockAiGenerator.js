const MAX_ITEMS_PER_COLLECTION = 50
const MAX_CHARACTERS_PER_FIELD = 2_000
const MAX_SNAPSHOT_CHARACTERS = 100_000
const MAX_LIVE_SNAPSHOT_CHARACTERS = 40_000
const CONTEXT_KEYS = Object.freeze(['project', 'notes', 'tasks', 'team', 'resources'])
const COLLECTION_KEYS = Object.freeze(['notes', 'tasks', 'team', 'resources'])

function compareText(left, right) {
  if (left < right) {
    return -1
  }

  if (left > right) {
    return 1
  }

  return 0
}

function normalizeWhitespace(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim().replace(/[ \t]+/g, ' '))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function createTextNormalizer(truncatedFields) {
  return (value, path) => {
    const normalized = normalizeWhitespace(value)

    if (normalized.length > MAX_CHARACTERS_PER_FIELD) {
      truncatedFields.push(path)
      return normalized.slice(0, MAX_CHARACTERS_PER_FIELD)
    }

    return normalized
  }
}

function compareRecords(...fields) {
  return (left, right) => {
    for (const field of fields) {
      const comparison = compareText(left[field], right[field])

      if (comparison !== 0) {
        return comparison
      }
    }

    return compareText(JSON.stringify(left), JSON.stringify(right))
  }
}

function normalizeContextConfig(contextConfig) {
  return Object.fromEntries(
    CONTEXT_KEYS.map((key) => [key, contextConfig?.[key] === true]),
  )
}

function normalizeTask(task, text, prefix = 'task') {
  return {
    id: text(task?.id, `${prefix}.id`),
    title: text(task?.title, `${prefix}.title`),
    description: text(task?.description, `${prefix}.description`),
    dueDate: text(task?.dueDate, `${prefix}.dueDate`),
    status: text(task?.status, `${prefix}.status`),
    assigneeId: text(task?.assigneeId, `${prefix}.assigneeId`),
  }
}

function normalizeCollection(items, normalizeItem, compare, collectionKey) {
  const normalized = (Array.isArray(items) ? items : []).map(normalizeItem).sort(compare)
  const limited = normalized.slice(0, MAX_ITEMS_PER_COLLECTION)

  return {
    items: limited,
    omittedByCollectionLimit: Math.max(0, normalized.length - limited.length),
    collectionKey,
  }
}

function createCollectionData(input, text) {
  const notes = normalizeCollection(
    input.notes,
    (note) => ({
      id: text(note?.id, `notes.${note?.id ?? 'unknown'}.id`),
      title: text(note?.title, `notes.${note?.id ?? 'unknown'}.title`),
      content: text(note?.content, `notes.${note?.id ?? 'unknown'}.content`),
    }),
    compareRecords('title', 'id'),
    'notes',
  )

  const tasks = normalizeCollection(
    input.tasks,
    (task) => normalizeTask(task, text, `tasks.${task?.id ?? 'unknown'}`),
    compareRecords('dueDate', 'title', 'id'),
    'tasks',
  )

  const team = normalizeCollection(
    input.members,
    (member) => ({
      id: text(member?.id, `team.${member?.id ?? 'unknown'}.id`),
      name: text(member?.name, `team.${member?.id ?? 'unknown'}.name`),
      role: text(member?.role, `team.${member?.id ?? 'unknown'}.role`),
      kind: text(member?.kind, `team.${member?.id ?? 'unknown'}.kind`),
    }),
    compareRecords('name', 'id'),
    'team',
  )

  const readyResources = (Array.isArray(input.resources) ? input.resources : []).filter(
    (resource) => resource?.uploadStatus !== 'pending',
  )
  const resources = normalizeCollection(
    readyResources,
    (resource) => ({
      id: text(resource?.id, `resources.${resource?.id ?? 'unknown'}.id`),
      name: text(resource?.name, `resources.${resource?.id ?? 'unknown'}.name`),
      description: text(
        resource?.description,
        `resources.${resource?.id ?? 'unknown'}.description`,
      ),
      type: text(resource?.type, `resources.${resource?.id ?? 'unknown'}.type`),
    }),
    compareRecords('name', 'id'),
    'resources',
  )

  return { notes, tasks, team, resources }
}

function serializedLength(value) {
  return JSON.stringify(value).length
}

function enforceSnapshotLimit(snapshot, collectionData, maxSnapshotCharacters) {
  let blocked = false

  for (const key of COLLECTION_KEYS) {
    if (!snapshot.contextConfig[key]) {
      continue
    }

    const source = collectionData[key].items

    for (let index = 0; index < source.length; index += 1) {
      if (blocked) {
        snapshot.truncation.snapshot.omitted[key] += 1
        continue
      }

      snapshot.context[key].push(source[index])

      if (serializedLength(snapshot) > maxSnapshotCharacters) {
        snapshot.context[key].pop()
        snapshot.truncation.snapshot.omitted[key] += 1
        snapshot.truncation.snapshot.truncated = true
        blocked = true
      }
    }
  }

  for (let keyIndex = COLLECTION_KEYS.length - 1; keyIndex >= 0; keyIndex -= 1) {
    const key = COLLECTION_KEYS[keyIndex]

    while (
      serializedLength(snapshot) > maxSnapshotCharacters &&
      Array.isArray(snapshot.context[key]) &&
      snapshot.context[key].length > 0
    ) {
      snapshot.context[key].pop()
      snapshot.truncation.snapshot.omitted[key] += 1
      snapshot.truncation.snapshot.truncated = true
    }
  }

  return snapshot
}

/**
 * Builds the deterministic, bounded context persisted with a mock AI run.
 * @param {object} input
 * @returns {Record<string, unknown>}
 */
function buildAiContext(input, maxSnapshotCharacters) {
  const truncatedFields = []
  const text = createTextNormalizer(truncatedFields)
  const contextConfig = normalizeContextConfig(input.contextConfig)
  const collectionData = createCollectionData(input, text)
  const context = {}

  if (contextConfig.project) {
    context.project = {
      id: text(input.project?.id, 'project.id'),
      name: text(input.project?.name, 'project.name'),
      description: text(input.project?.description, 'project.description'),
    }
  }

  for (const key of COLLECTION_KEYS) {
    if (contextConfig[key]) {
      context[key] = []
    }
  }

  const snapshot = {
    version: 1,
    instructions: text(input.instructions, 'instructions'),
    task: normalizeTask(input.task, text),
    contextConfig,
    context,
    truncation: {
      limits: {
        itemsPerCollection: MAX_ITEMS_PER_COLLECTION,
        charactersPerField: MAX_CHARACTERS_PER_FIELD,
        snapshotCharacters: maxSnapshotCharacters,
      },
      fields: truncatedFields,
      collections: Object.fromEntries(
        COLLECTION_KEYS.map((key) => [
          key,
          contextConfig[key] ? collectionData[key].omittedByCollectionLimit : 0,
        ]),
      ),
      snapshot: {
        truncated: false,
        omitted: Object.fromEntries(COLLECTION_KEYS.map((key) => [key, 0])),
      },
    },
  }

  if (input.agent) {
    snapshot.agent = {
      id: text(input.agent.id, 'agent.id'),
      name: text(input.agent.name, 'agent.name'),
      role: text(input.agent.role, 'agent.role'),
      description: text(input.agent.description, 'agent.description'),
    }
  }

  snapshot.truncation.fields.sort(compareText)

  return enforceSnapshotLimit(snapshot, collectionData, maxSnapshotCharacters)
}

export function buildMockAiContext(input = {}) {
  return buildAiContext(input, MAX_SNAPSHOT_CHARACTERS)
}

export function buildLiveAiContext(input = {}) {
  return buildAiContext(input, MAX_LIVE_SNAPSHOT_CHARACTERS)
}

function inline(value, fallback) {
  return value ? value.replace(/\n+/g, ' / ') : fallback
}

function renderContext(snapshot) {
  const sections = []

  if (snapshot.context.project) {
    sections.push(
      [
        '### 프로젝트',
        `- 이름: ${inline(snapshot.context.project.name, '이름 없음')}`,
        `- 설명: ${inline(snapshot.context.project.description, '설명 없음')}`,
      ].join('\n'),
    )
  }

  if (snapshot.context.notes) {
    sections.push(
      [
        '### 공유 노트',
        snapshot.context.notes.length === 0
          ? '- 참고할 노트가 없습니다.'
          : snapshot.context.notes
              .map(
                (note) =>
                  `- ${inline(note.title, '제목 없음')} (${inline(note.id, 'ID 없음')}): ${inline(note.content, '내용 없음')}`,
              )
              .join('\n'),
      ].join('\n'),
    )
  }

  if (snapshot.context.tasks) {
    sections.push(
      [
        '### 할 일 목록',
        snapshot.context.tasks.length === 0
          ? '- 참고할 할 일이 없습니다.'
          : snapshot.context.tasks
              .map(
                (task) =>
                  `- ${inline(task.dueDate, '마감 없음')} · ${inline(task.title, '제목 없음')} · ${inline(task.status, '상태 없음')}`,
              )
              .join('\n'),
      ].join('\n'),
    )
  }

  if (snapshot.context.team) {
    sections.push(
      [
        '### 팀원 역할',
        snapshot.context.team.length === 0
          ? '- 참고할 팀원 역할이 없습니다.'
          : snapshot.context.team
              .map(
                (member) =>
                  `- ${inline(member.name, '이름 없음')}: ${inline(member.role, '역할 없음')} (${inline(member.kind, '유형 없음')})`,
              )
              .join('\n'),
      ].join('\n'),
    )
  }

  if (snapshot.context.resources) {
    sections.push(
      [
        '### 자료실',
        snapshot.context.resources.length === 0
          ? '- 참고할 자료가 없습니다.'
          : snapshot.context.resources
              .map(
                (resource) =>
                  `- ${inline(resource.name, '이름 없음')} (${inline(resource.type, '유형 없음')}): ${inline(resource.description, '설명 없음')}`,
              )
              .join('\n'),
      ].join('\n'),
    )
  }

  return sections.length > 0 ? sections.join('\n\n') : '- 활성화된 컨텍스트가 없습니다.'
}

function renderMockMarkdown(snapshot) {
  const activeLabels = [
    ['project', '프로젝트 설명'],
    ['notes', '공유 노트'],
    ['tasks', '할 일 목록'],
    ['team', '팀원 역할'],
    ['resources', '자료실 이름과 설명'],
  ]
    .filter(([key]) => snapshot.contextConfig[key])
    .map(([, label]) => label)

  return [
    '# 모의 실행 결과',
    '',
    '> 외부 AI API를 호출하지 않고 TeamFlow 서버가 고정 규칙으로 만든 Mock 결과입니다.',
    '',
    '## 작업 요청 요약',
    `- 할 일: ${inline(snapshot.task.title, '제목 없음')}`,
    `- 설명: ${inline(snapshot.task.description, '설명 없음')}`,
    `- 역할 지시사항: ${inline(snapshot.instructions, '등록된 지시사항 없음')}`,
    '',
    '## 참고한 컨텍스트',
    renderContext(snapshot),
    '',
    '## Mock 작업 결과',
    `- "${inline(snapshot.task.title, '제목 없는 작업')}" 요청을 역할 지시사항에 맞춰 구조화했습니다.`,
    `- 참고 범위: ${activeLabels.length > 0 ? activeLabels.join(', ') : '활성화된 컨텍스트 없음'}`,
    '- 실제 조사나 외부 URL 접근 없이 저장된 프로젝트 정보만 요약했습니다.',
    '',
    '## 제안하는 다음 행동',
    '1. 결과에 빠진 요구사항이 없는지 검토합니다.',
    '2. 필요한 근거와 세부 내용을 협업자가 보완합니다.',
    '3. 유효한 결과만 공유 노트로 반영합니다.',
  ].join('\n')
}

/**
 * Generates a deterministic mock result and the exact context used for it.
 * @param {object} input
 * @returns {{contextSnapshot: Record<string, unknown>, resultMarkdown: string}}
 */
export function generateMockAiResult(input = {}) {
  const contextSnapshot = buildMockAiContext(input)

  return {
    contextSnapshot,
    resultMarkdown: renderMockMarkdown(contextSnapshot),
  }
}
