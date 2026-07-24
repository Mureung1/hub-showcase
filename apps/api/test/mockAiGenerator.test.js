import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildMockAiContext,
  generateMockAiResult,
} from '../src/teamflow/mockAiGenerator.js'

const enabledContext = Object.freeze({
  project: true,
  notes: true,
  tasks: true,
  team: true,
  resources: true,
})

function createInput(overrides = {}) {
  return {
    instructions: ' 근거를 먼저 정리하고   다음 행동을 제안하세요. ',
    contextConfig: enabledContext,
    task: {
      id: 'task-main',
      title: ' 시장 조사 ',
      description: '경쟁 서비스를\r\n  비교합니다.',
      dueDate: '2026-07-31',
      status: 'in_progress',
      assigneeId: 'ai-1',
    },
    project: {
      id: 'project-1',
      name: 'TeamFlow',
      description: '대학생 팀 프로젝트를   관리합니다.',
    },
    notes: [
      { id: 'note-b', title: 'B 노트', content: '두 번째' },
      { id: 'note-a', title: 'A 노트', content: '첫 번째' },
    ],
    tasks: [
      {
        id: 'task-b',
        title: 'B 작업',
        description: '두 번째',
        dueDate: '2026-08-01',
        status: 'not_started',
        assigneeId: 'user-1',
      },
      {
        id: 'task-a',
        title: 'A 작업',
        description: '첫 번째',
        dueDate: '2026-07-30',
        status: 'in_progress',
        assigneeId: 'ai-1',
      },
    ],
    members: [
      { id: 'member-b', name: '홍길동', role: '개발', kind: 'user' },
      { id: 'member-a', name: '자료조사 AI', role: '자료 조사', kind: 'ai' },
    ],
    resources: [
      {
        id: 'resource-b',
        name: 'B 자료',
        description: '두 번째',
        type: 'link',
        url: 'https://example.com/private',
        body: '읽으면 안 되는 본문',
        uploadStatus: 'ready',
      },
      {
        id: 'resource-a',
        name: 'A 자료',
        description: '첫 번째',
        type: 'document',
        storagePath: 'private/file.pdf',
        uploadStatus: 'ready',
      },
    ],
    ...overrides,
  }
}

test('generateMockAiResult is byte-identical for normalized and reordered equivalent input', () => {
  const original = createInput()
  const equivalent = createInput({
    instructions: '근거를 먼저 정리하고 다음 행동을 제안하세요.',
    task: {
      ...original.task,
      title: '시장 조사',
      description: ' 경쟁 서비스를\n비교합니다. ',
    },
    project: {
      ...original.project,
      description: '대학생 팀 프로젝트를 관리합니다.',
    },
    notes: [...original.notes].reverse(),
    tasks: [...original.tasks].reverse(),
    members: [...original.members].reverse(),
    resources: [...original.resources].reverse(),
  })

  const first = generateMockAiResult(original)
  const second = generateMockAiResult(equivalent)

  assert.deepEqual(first, second)
  assert.deepEqual(first.contextSnapshot.context.notes.map((note) => note.id), [
    'note-a',
    'note-b',
  ])
  assert.deepEqual(first.contextSnapshot.context.tasks.map((task) => task.id), [
    'task-a',
    'task-b',
  ])
  assert.deepEqual(first.contextSnapshot.context.team.map((member) => member.id), [
    'member-a',
    'member-b',
  ])
  assert.deepEqual(first.contextSnapshot.context.resources.map((resource) => resource.id), [
    'resource-a',
    'resource-b',
  ])
  assert.match(first.resultMarkdown, /^# 모의 실행 결과/)
  assert.ok(
    first.resultMarkdown.indexOf('## 작업 요청 요약') <
      first.resultMarkdown.indexOf('## 참고한 컨텍스트'),
  )
  assert.ok(
    first.resultMarkdown.indexOf('## 참고한 컨텍스트') <
      first.resultMarkdown.indexOf('## Mock 작업 결과'),
  )
  assert.ok(
    first.resultMarkdown.indexOf('## Mock 작업 결과') <
      first.resultMarkdown.indexOf('## 제안하는 다음 행동'),
  )
})

test('buildMockAiContext excludes disabled context and resource URLs or bodies', () => {
  const contextSnapshot = buildMockAiContext(
    createInput({
      contextConfig: {
        project: true,
        notes: false,
        tasks: false,
        team: false,
        resources: true,
      },
    }),
  )
  const serialized = JSON.stringify(contextSnapshot)

  assert.deepEqual(Object.keys(contextSnapshot.context), ['project', 'resources'])
  assert.equal(serialized.includes('B 노트'), false)
  assert.equal(serialized.includes('B 작업'), false)
  assert.equal(serialized.includes('홍길동'), false)
  assert.equal(serialized.includes('https://example.com/private'), false)
  assert.equal(serialized.includes('읽으면 안 되는 본문'), false)
  assert.equal(serialized.includes('private/file.pdf'), false)
})

test('buildMockAiContext enforces collection, field, and total snapshot limits with metadata', () => {
  const longText = '가'.repeat(2_500)
  const notes = Array.from({ length: 80 }, (_, index) => ({
    id: `note-${String(index).padStart(3, '0')}`,
    title: `노트 ${index}`,
    content: longText,
  }))
  const tasks = Array.from({ length: 80 }, (_, index) => ({
    id: `task-${String(index).padStart(3, '0')}`,
    title: `할 일 ${index}`,
    description: longText,
    dueDate: `2026-08-${String((index % 28) + 1).padStart(2, '0')}`,
    status: 'not_started',
    assigneeId: 'ai-1',
  }))

  const contextSnapshot = buildMockAiContext(
    createInput({
      instructions: longText,
      notes,
      tasks,
      members: [],
      resources: [],
    }),
  )
  const serialized = JSON.stringify(contextSnapshot)

  assert.equal(contextSnapshot.instructions.length, 2_000)
  assert.ok(contextSnapshot.context.notes.length <= 50)
  assert.ok(contextSnapshot.context.tasks.length <= 50)
  assert.ok(serialized.length <= 100_000)
  assert.equal(contextSnapshot.truncation.limits.itemsPerCollection, 50)
  assert.equal(contextSnapshot.truncation.limits.charactersPerField, 2_000)
  assert.equal(contextSnapshot.truncation.limits.snapshotCharacters, 100_000)
  assert.ok(contextSnapshot.truncation.fields.includes('instructions'))
  assert.ok(contextSnapshot.truncation.collections.notes >= 30)
  assert.ok(contextSnapshot.truncation.collections.tasks >= 30)
  assert.equal(contextSnapshot.truncation.snapshot.truncated, true)
  assert.ok(
    contextSnapshot.truncation.snapshot.omitted.notes +
      contextSnapshot.truncation.snapshot.omitted.tasks >
      0,
  )
})

test('generateMockAiResult does not depend on time and reflects only the normalized snapshot', () => {
  const input = createInput({
    generatedAt: '2026-01-01T00:00:00.000Z',
    randomSeed: 1,
  })
  const first = generateMockAiResult(input)
  const second = generateMockAiResult({
    ...input,
    generatedAt: '2099-12-31T23:59:59.999Z',
    randomSeed: 999,
  })

  assert.deepEqual(first, second)
  assert.equal(first.resultMarkdown.includes('2026-01-01'), false)
  assert.equal(first.resultMarkdown.includes('2099-12-31'), false)
})
