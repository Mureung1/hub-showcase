# Curriculum Agent RAG Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the curriculum-generation agent's knowledge grounding (RAG) track-aware and extend it so every one of the 5 curriculum tracks (`frontend`, `backend`, `fullstack`, `devops`, `software-engineer`) can be backed by official-doc chunks, instead of only `frontend`/`devops` today.

**Architecture:** Add a pure keyword→topic inference module in the curriculum domain layer, thread an optional `preferredTopics` relevance boost through the existing `searchKnowledgeChunks` scorer, wire it into `recommendCurriculum`, extend the knowledge loader's default file list and topic inference for two new source files (`backend`, `software-engineer`), and ship a schema validator + docs so a content curator can safely add the missing `backend-docs-chunks.jsonl` / `software-engineer-docs-chunks.jsonl` (and later `fullstack`, which reuses `react` + `backend` topics — no separate file needed) without breaking the pipeline.

**Tech Stack:** Node.js (ESM, `.mjs`), Vitest for tests. No new dependencies.

## Global Constraints

- No new npm dependencies — reuse `node:fs`, `node:path`, `node:url` (AGENTS.md: "Do not add ... other new dependencies unless the user explicitly asks or the task requires it").
- Tests colocate as `*.test.mjs` next to the unit under test (AGENTS.md File Convention).
- `npm test` (vitest run) must stay green after every task.
- Commit messages use Korean Conventional Commits (`feat:`, `test:`, `docs:`, `chore:`) per AGENTS.md Commit Convention. Before running `git commit`, report the changed files and the core change to the user first (AGENTS.md Pre-Commit Report Rule) — the steps below stage and describe the diff for that purpose; actually invoking `git commit` still requires that report to have been given.
- Reuse existing patterns before adding new structures (AGENTS.md Ponytail Working Principle) — this plan reuses the exact keyword table already proven in `src/features/curriculum/model/curriculumGenerator.ts` and the exact "run as CLI" idiom already used in `backend/http/server.mjs`.
- Do not fabricate or bulk-copy large verbatim documentation text into the repository as part of this plan. Task 6 explicitly hands content curation to a separate, human-reviewed step with a validator — no `data/backend-docs-chunks.jsonl` or `data/software-engineer-docs-chunks.jsonl` content is authored by this plan.

---

### Task 1: Track-topic keyword inference (domain layer)

**Files:**
- Create: `backend/modules/curriculum/domain/trackTopicKeywords.mjs`
- Test: `backend/modules/curriculum/domain/trackTopicKeywords.test.mjs`

**Interfaces:**
- Produces: `inferTrackTopics(goal: string): string[]` — returns the knowledge-chunk `topic` values relevant to a free-text goal, or `[]` if no track keywords match. Consumed by Task 4.
- Produces: `trackTopicKeywords: Record<string, { topics: string[], keywords: RegExp }>` — exported for direct testing/inspection.

- [ ] **Step 1: Write the failing test**

```js
// backend/modules/curriculum/domain/trackTopicKeywords.test.mjs
import { describe, expect, it } from 'vitest'
import { inferTrackTopics } from './trackTopicKeywords.mjs'

describe('inferTrackTopics', () => {
  it('maps a frontend-flavored goal to the react topic', () => {
    expect(inferTrackTopics('React state와 이벤트 이해하기')).toEqual(['react'])
  })

  it('maps a backend-flavored goal to the backend topic', () => {
    expect(inferTrackTopics('FastAPI로 백엔드 API 서버 만들기')).toEqual(['backend'])
  })

  it('maps a fullstack-flavored goal to both react and backend topics', () => {
    expect(inferTrackTopics('풀스택 개발자가 되고 싶어요')).toEqual(['react', 'backend'])
  })

  it('maps a devops-flavored goal to the docker topic', () => {
    expect(inferTrackTopics('Docker와 인프라 배포 배우기')).toEqual(['docker'])
  })

  it('maps a CS-flavored goal to the software-engineer topic', () => {
    expect(inferTrackTopics('자료구조와 알고리즘 기초 다지기')).toEqual(['software-engineer'])
  })

  it('returns an empty array when no keyword matches', () => {
    expect(inferTrackTopics('오늘 기분이 좋다')).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run backend/modules/curriculum/domain/trackTopicKeywords.test.mjs`
Expected: FAIL — `Cannot find module './trackTopicKeywords.mjs'`

- [ ] **Step 3: Write minimal implementation**

```js
// backend/modules/curriculum/domain/trackTopicKeywords.mjs
export const trackTopicKeywords = {
  frontend: {
    topics: ['react'],
    keywords: /(frontend|front-end|프론트|react|리액트|html|css|javascript|자바스크립트)/i,
  },
  backend: {
    topics: ['backend'],
    keywords: /(backend|back-end|백엔드|api|server|서버|fastapi|db|database|데이터베이스)/i,
  },
  fullstack: {
    topics: ['react', 'backend'],
    keywords: /(fullstack|full-stack|풀스택)/i,
  },
  devops: {
    topics: ['docker'],
    keywords: /(devops|dev ops|데브옵스|인프라|sre|cloud|클라우드|docker|도커|platform|플랫폼)/i,
  },
  'software-engineer': {
    topics: ['software-engineer'],
    keywords: /(software engineer|소프트웨어|cs|computer science|알고리즘|자료구조|설계|architecture|아키텍처)/i,
  },
}

export function inferTrackTopics(goal) {
  const normalized = String(goal ?? '')
  const matched = Object.values(trackTopicKeywords).find((entry) => entry.keywords.test(normalized))

  return matched ? matched.topics : []
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run backend/modules/curriculum/domain/trackTopicKeywords.test.mjs`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/modules/curriculum/domain/trackTopicKeywords.mjs backend/modules/curriculum/domain/trackTopicKeywords.test.mjs
git commit -m "$(cat <<'EOF'
feat: 커리큘럼 목표 텍스트로 지식 토픽을 추론하는 trackTopicKeywords 추가

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Extend the knowledge loader for `backend` and `software-engineer` source files

**Files:**
- Modify: `backend/modules/knowledge/adapters/jsonlKnowledgeRepository.mjs:1` (export list)
- Modify: `backend/modules/knowledge/adapters/jsonlKnowledgeRepository.mjs:111-116` (`inferTopicFromFileName`)
- Test: `backend/modules/knowledge/adapters/jsonlKnowledgeRepository.test.mjs` (append)

**Interfaces:**
- Consumes: nothing new.
- Produces: `defaultKnowledgeChunkFileNames` now includes `'backend-docs-chunks.jsonl'` and `'software-engineer-docs-chunks.jsonl'`. `inferTopicFromFileName` now maps those file names to topics `'backend'` and `'software-engineer'` — these topic strings are what Task 1's `trackTopicKeywords[...].topics` values must match (they already do).

- [ ] **Step 1: Write the failing test**

Append to `backend/modules/knowledge/adapters/jsonlKnowledgeRepository.test.mjs` (add `defaultKnowledgeChunkFileNames` to the existing top import line, then add these `it` blocks inside the existing `describe` block):

```js
import { describe, expect, it } from 'vitest'
import { defaultKnowledgeChunkFileNames, loadKnowledgeChunks, searchKnowledgeChunks } from './jsonlKnowledgeRepository.mjs'
```

```js
  it('infers the backend topic for backend-docs-chunks.jsonl', () => {
    const fs = createFs({
      '/repo/data/backend-docs-chunks.jsonl': JSON.stringify({
        docTitle: 'FastAPI Path Parameters',
        chunkText: 'FastAPI path parameters let you capture values from the URL path.',
        url: 'https://fastapi.tiangolo.com/tutorial/path-params/',
      }),
    })

    const chunks = loadKnowledgeChunks({
      fs,
      path,
      repoRoot: '/repo',
      fileNames: ['backend-docs-chunks.jsonl'],
    })

    expect(chunks[0]).toMatchObject({ topic: 'backend' })
  })

  it('infers the software-engineer topic for software-engineer-docs-chunks.jsonl', () => {
    const fs = createFs({
      '/repo/data/software-engineer-docs-chunks.jsonl': JSON.stringify({
        docTitle: 'Data Structures',
        chunkText: 'Lists, tuples, and dictionaries are core Python data structures.',
        url: 'https://docs.python.org/3/tutorial/datastructures.html',
      }),
    })

    const chunks = loadKnowledgeChunks({
      fs,
      path,
      repoRoot: '/repo',
      fileNames: ['software-engineer-docs-chunks.jsonl'],
    })

    expect(chunks[0]).toMatchObject({ topic: 'software-engineer' })
  })

  it('includes the backend and software-engineer files in the default file list', () => {
    expect(defaultKnowledgeChunkFileNames).toEqual([
      'docker-docs-chunks.jsonl',
      'react_docs.jsonl',
      'backend-docs-chunks.jsonl',
      'software-engineer-docs-chunks.jsonl',
    ])
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run backend/modules/knowledge/adapters/jsonlKnowledgeRepository.test.mjs`
Expected: FAIL — the two new `it` blocks report `topic: 'backend-docs-chunks'` / `topic: 'software-engineer-docs-chunks'` (falls through to the filename-minus-extension fallback) instead of `'backend'` / `'software-engineer'`, and the file-list test reports only 2 entries instead of 4.

- [ ] **Step 3: Write minimal implementation**

In `backend/modules/knowledge/adapters/jsonlKnowledgeRepository.mjs`, replace line 1:

```js
export const defaultKnowledgeChunkFileNames = ['docker-docs-chunks.jsonl', 'react_docs.jsonl']
```

with:

```js
export const defaultKnowledgeChunkFileNames = [
  'docker-docs-chunks.jsonl',
  'react_docs.jsonl',
  'backend-docs-chunks.jsonl',
  'software-engineer-docs-chunks.jsonl',
]
```

Replace lines 111-116 (`inferTopicFromFileName`):

```js
function inferTopicFromFileName(fileName) {
  const normalized = fileName.toLowerCase()
  if (normalized.includes('docker')) return 'docker'
  if (normalized.includes('react')) return 'react'
  return normalized.replace(/\.(jsonl|json)$/u, '')
}
```

with:

```js
function inferTopicFromFileName(fileName) {
  const normalized = fileName.toLowerCase()
  if (normalized.includes('docker')) return 'docker'
  if (normalized.includes('react')) return 'react'
  if (normalized.includes('software-engineer')) return 'software-engineer'
  if (normalized.includes('backend')) return 'backend'
  return normalized.replace(/\.(jsonl|json)$/u, '')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run backend/modules/knowledge/adapters/jsonlKnowledgeRepository.test.mjs`
Expected: PASS (all tests in the file, including the pre-existing ones — the "missing source file" test already proves `fs.existsSync` guards the two new, not-yet-populated files safely)

- [ ] **Step 5: Commit**

```bash
git add backend/modules/knowledge/adapters/jsonlKnowledgeRepository.mjs backend/modules/knowledge/adapters/jsonlKnowledgeRepository.test.mjs
git commit -m "$(cat <<'EOF'
feat: backend/software-engineer 지식 소스 파일명과 토픽 추론 추가

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Add a `preferredTopics` relevance boost to `searchKnowledgeChunks`

**Files:**
- Modify: `backend/modules/knowledge/adapters/jsonlKnowledgeRepository.mjs:20-30` (`searchKnowledgeChunks`)
- Modify: `backend/modules/knowledge/adapters/jsonlKnowledgeRepository.mjs:79-90` (`scoreChunk`)
- Test: `backend/modules/knowledge/adapters/jsonlKnowledgeRepository.test.mjs` (append)

**Interfaces:**
- Consumes: nothing new (does not depend on Task 1 or 2).
- Produces: `searchKnowledgeChunks({ chunks, query, limit = 5, preferredTopics = [] })` — new optional `preferredTopics: string[]` parameter. When a chunk's `topic` is in `preferredTopics`, its score gets a `+8` boost (stronger than any single per-term match), so track-relevant chunks surface even without exact keyword overlap. Consumed by Task 4.

- [ ] **Step 1: Write the failing test**

Append to `backend/modules/knowledge/adapters/jsonlKnowledgeRepository.test.mjs`:

```js
  it('boosts chunks whose topic matches preferredTopics even without a literal query overlap', () => {
    const chunks = [
      {
        id: 'docker-docs-chunks.jsonl:1',
        topic: 'docker',
        docTitle: 'Docker build guide',
        sectionHeading: 'Images',
        chunkText: 'Build and tag container images.',
      },
      {
        id: 'backend-docs-chunks.jsonl:1',
        topic: 'backend',
        docTitle: 'FastAPI Path Parameters',
        sectionHeading: 'Path Parameters',
        chunkText: 'FastAPI path parameters let you capture values from the URL path.',
      },
    ]

    const results = searchKnowledgeChunks({
      chunks,
      query: '실무에 필요한 기술 배우기',
      limit: 1,
      preferredTopics: ['backend'],
    })

    expect(results).toEqual([chunks[1]])
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run backend/modules/knowledge/adapters/jsonlKnowledgeRepository.test.mjs`
Expected: FAIL on the first new test — with no topic boost, both chunks score `0` for the given query (no literal term overlap), so the docker chunk (or neither) is returned instead of `[chunks[1]]`.

- [ ] **Step 3: Write minimal implementation**

Replace lines 20-30 (`searchKnowledgeChunks`):

```js
export function searchKnowledgeChunks({ chunks, query, limit = 5 }) {
  const terms = tokenize(query)
  if (terms.length === 0) return []

  return chunks
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, terms) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id))
    .slice(0, limit)
    .map((result) => result.chunk)
}
```

with:

```js
export function searchKnowledgeChunks({ chunks, query, limit = 5, preferredTopics = [] }) {
  const terms = tokenize(query)
  if (terms.length === 0) return []

  return chunks
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, terms, preferredTopics) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id))
    .slice(0, limit)
    .map((result) => result.chunk)
}
```

Replace lines 79-90 (`scoreChunk`):

```js
function scoreChunk(chunk, terms) {
  const haystack = `${chunk.topic} ${chunk.docTitle} ${chunk.sectionHeading} ${chunk.chunkText}`.toLowerCase()
  const baseScore = terms.reduce((score, term) => {
    if (chunk.topic.toLowerCase() === term) return score + 6
    if (chunk.docTitle.toLowerCase().includes(term)) return score + 4
    if (chunk.sectionHeading.toLowerCase().includes(term)) return score + 3
    if (haystack.includes(term)) return score + 1
    return score
  }, 0)

  return baseScore + scoreSourceQuality(chunk)
}
```

with:

```js
function scoreChunk(chunk, terms, preferredTopics = []) {
  const haystack = `${chunk.topic} ${chunk.docTitle} ${chunk.sectionHeading} ${chunk.chunkText}`.toLowerCase()
  const baseScore = terms.reduce((score, term) => {
    if (chunk.topic.toLowerCase() === term) return score + 6
    if (chunk.docTitle.toLowerCase().includes(term)) return score + 4
    if (chunk.sectionHeading.toLowerCase().includes(term)) return score + 3
    if (haystack.includes(term)) return score + 1
    return score
  }, 0)
  const topicBoost = preferredTopics.includes(chunk.topic) ? 8 : 0

  return baseScore + topicBoost + scoreSourceQuality(chunk)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run backend/modules/knowledge/adapters/jsonlKnowledgeRepository.test.mjs`
Expected: PASS (all tests in the file — including every pre-existing test, since `preferredTopics` defaults to `[]` and `topicBoost` is `0` when omitted, so unrelated call sites are unaffected)

- [ ] **Step 5: Commit**

```bash
git add backend/modules/knowledge/adapters/jsonlKnowledgeRepository.mjs backend/modules/knowledge/adapters/jsonlKnowledgeRepository.test.mjs
git commit -m "$(cat <<'EOF'
feat: searchKnowledgeChunks에 preferredTopics 가중치 부스트 추가

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Wire track-aware search into `recommendCurriculum`

**Files:**
- Modify: `backend/modules/curriculum/application/recommendCurriculum.mjs` (full file, 32 lines)
- Test: `backend/modules/curriculum/application/recommendCurriculum.test.mjs` (append)

**Interfaces:**
- Consumes: `inferTrackTopics(goal: string): string[]` from Task 1 (`../domain/trackTopicKeywords.mjs`); `searchKnowledgeChunks({ chunks, query, limit, preferredTopics })` from Task 3.
- Produces: no external signature change to `recommendCurriculum` itself — same call shape as before. This is the integration point; no later task consumes it.

- [ ] **Step 1: Write the failing test**

Append to `backend/modules/curriculum/application/recommendCurriculum.test.mjs`:

```js
  it('boosts knowledge chunks whose topic matches the inferred track for the goal', async () => {
    const recommendationProvider = vi.fn(async () => recommendation)

    await recommendCurriculum({
      goal: 'FastAPI 백엔드 서버 만들기',
      tracks,
      config: { apiKey: 'test-key' },
      recommendationProvider,
      knowledgeChunks: [
        {
          id: 'react-1',
          sourceType: 'official-doc',
          topic: 'react',
          docTitle: 'React Quick Start',
          sectionHeading: 'Components',
          url: 'https://ko.react.dev/learn',
          chunkText: 'React 컴포넌트를 만들고 중첩하는 방법을 배웁니다.',
        },
        {
          id: 'backend-1',
          sourceType: 'official-doc',
          topic: 'backend',
          docTitle: 'FastAPI Path Parameters',
          sectionHeading: 'Path Parameters',
          url: 'https://fastapi.tiangolo.com/tutorial/path-params/',
          chunkText: 'FastAPI 경로 매개변수를 사용해 URL 경로에서 값을 추출하는 방법을 배웁니다.',
        },
      ],
    })

    expect(recommendationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledgeContext: [expect.objectContaining({ id: 'backend-1' })],
      }),
    )
  })

  it('does not crash when no knowledge chunks exist for the inferred track', async () => {
    const recommendationProvider = vi.fn(async () => recommendation)

    await expect(
      recommendCurriculum({
        goal: '자료구조와 알고리즘 기초 다지기',
        tracks,
        config: { apiKey: 'test-key' },
        recommendationProvider,
        knowledgeChunks: [],
      }),
    ).resolves.toBeDefined()

    expect(recommendationProvider).toHaveBeenCalledWith(
      expect.objectContaining({ knowledgeContext: [] }),
    )
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run backend/modules/curriculum/application/recommendCurriculum.test.mjs`
Expected: FAIL on the first new test — without the topic boost, `react-1` and `backend-1` both score `0` for this query under the current `searchKnowledgeChunks` call (no `preferredTopics` passed), so `knowledgeContext` is `[]` instead of `[backend-1]`. (The second new test already passes today since `knowledgeChunks: []` always yields `[]` — it is included here as a permanent regression guard for this task's change.)

- [ ] **Step 3: Write minimal implementation**

Replace the full contents of `backend/modules/curriculum/application/recommendCurriculum.mjs`:

```js
import { createGeneratedCurriculumPlan } from '../domain/generatedCurriculumPlan.mjs'
import { inferTrackTopics } from '../domain/trackTopicKeywords.mjs'
import { runCurriculumPlannerAgent } from '../adapters/geminiCurriculumRecommendationProvider.mjs'
import { searchKnowledgeChunks } from '../../knowledge/adapters/jsonlKnowledgeRepository.mjs'

export async function recommendCurriculum({
  goal,
  followUpInstruction,
  previousPlan,
  tracks,
  config,
  recommendationProvider = runCurriculumPlannerAgent,
  knowledgeChunks = [],
}) {
  const trimmedGoal = typeof goal === 'string' ? goal.trim() : ''
  if (!trimmedGoal) {
    throw new Error('Curriculum goal is required')
  }

  const trimmedFollowUp = typeof followUpInstruction === 'string' ? followUpInstruction.trim() : undefined
  const searchQuery = trimmedFollowUp ? `${trimmedGoal} ${trimmedFollowUp}` : trimmedGoal
  const preferredTopics = inferTrackTopics(searchQuery)
  const knowledgeContext = searchKnowledgeChunks({
    chunks: knowledgeChunks,
    query: searchQuery,
    limit: 5,
    preferredTopics,
  })
  const recommendation = await recommendationProvider({
    goal: trimmedGoal,
    followUpInstruction: trimmedFollowUp,
    previousPlan,
    tracks,
    config,
    knowledgeContext,
  })

  return createGeneratedCurriculumPlan({ goal: trimmedGoal, recommendation, tracks })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run backend/modules/curriculum/application/recommendCurriculum.test.mjs`
Expected: PASS (all tests in the file, including the 3 pre-existing ones)

- [ ] **Step 5: Run the full backend test suite to confirm no regressions**

Run: `npm test`
Expected: PASS — all suites green, including `geminiCurriculumRecommendationProvider.test.mjs` (unaffected — it tests the provider, not the search step) and `server.test.mjs`.

- [ ] **Step 6: Commit**

```bash
git add backend/modules/curriculum/application/recommendCurriculum.mjs backend/modules/curriculum/application/recommendCurriculum.test.mjs
git commit -m "$(cat <<'EOF'
feat: recommendCurriculum이 목표 텍스트로 지식 검색 토픽을 추론하도록 연결

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Knowledge chunk schema validator (unblocks safe content curation)

**Files:**
- Create: `scripts/validate-knowledge-chunks.mjs`
- Test: `scripts/validate-knowledge-chunks.test.mjs`
- Modify: `package.json` (add `knowledge:validate` script)

**Interfaces:**
- Produces: `validateKnowledgeChunkLines(lines: string[]): Array<{ line: number, message: string }>` — pure function, one entry per schema violation, `[]` when the file is valid. `validateKnowledgeChunkFile(filePath: string): Array<{ line: number, message: string }>` — reads a file and delegates to `validateKnowledgeChunkLines`. Not consumed by any other task in this plan; it is the tool a future content-curation task will run against new `data/*.jsonl` files.

- [ ] **Step 1: Write the failing test**

```js
// scripts/validate-knowledge-chunks.test.mjs
import { describe, expect, it } from 'vitest'
import { validateKnowledgeChunkLines } from './validate-knowledge-chunks.mjs'

describe('validateKnowledgeChunkLines', () => {
  it('accepts a well-formed chunk line', () => {
    const line = JSON.stringify({
      docTitle: 'FastAPI Path Parameters',
      sectionHeading: 'Path Parameters',
      chunkText:
        'FastAPI path parameters let you capture values from the URL path and pass them to your function.',
      url: 'https://fastapi.tiangolo.com/tutorial/path-params/',
    })

    expect(validateKnowledgeChunkLines([line])).toEqual([])
  })

  it('skips blank lines', () => {
    expect(validateKnowledgeChunkLines(['', '   '])).toEqual([])
  })

  it('flags invalid JSON', () => {
    expect(validateKnowledgeChunkLines(['{not json'])).toEqual([{ line: 1, message: 'Invalid JSON' }])
  })

  it('flags a missing docTitle', () => {
    const line = JSON.stringify({
      chunkText: 'Enough text to pass the minimum length check for chunkText validation.',
      url: 'https://fastapi.tiangolo.com/',
    })

    expect(validateKnowledgeChunkLines([line])).toEqual([
      { line: 1, message: 'Missing docTitle/title' },
    ])
  })

  it('flags chunkText that is too short', () => {
    const line = JSON.stringify({
      docTitle: 'Short',
      chunkText: 'Too short',
      url: 'https://fastapi.tiangolo.com/',
    })

    expect(validateKnowledgeChunkLines([line])).toEqual([
      { line: 1, message: 'chunkText is too short (min 20 chars)' },
    ])
  })

  it('flags a missing or non-http url', () => {
    const line = JSON.stringify({
      docTitle: 'Title',
      chunkText: 'Enough text to pass the minimum length check for chunkText validation.',
      url: 'not-a-url',
    })

    expect(validateKnowledgeChunkLines([line])).toEqual([
      { line: 1, message: 'Missing or invalid url (must start with http)' },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/validate-knowledge-chunks.test.mjs`
Expected: FAIL — `Cannot find module './validate-knowledge-chunks.mjs'`

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/validate-knowledge-chunks.mjs
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

export function validateKnowledgeChunkLines(lines) {
  const errors = []

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed) return

    let value
    try {
      value = JSON.parse(trimmed)
    } catch {
      errors.push({ line: index + 1, message: 'Invalid JSON' })
      return
    }

    const docTitle = value.docTitle ?? value.title
    const chunkText = value.chunkText ?? value.content
    const url = value.url

    if (typeof docTitle !== 'string' || docTitle.trim().length === 0) {
      errors.push({ line: index + 1, message: 'Missing docTitle/title' })
    }

    if (typeof chunkText !== 'string' || chunkText.trim().length === 0) {
      errors.push({ line: index + 1, message: 'Missing chunkText/content' })
    } else if (chunkText.length < 20) {
      errors.push({ line: index + 1, message: 'chunkText is too short (min 20 chars)' })
    } else if (chunkText.length > 2000) {
      errors.push({ line: index + 1, message: 'chunkText is too long (max 2000 chars)' })
    }

    if (typeof url !== 'string' || !/^https?:\/\//.test(url)) {
      errors.push({ line: index + 1, message: 'Missing or invalid url (must start with http)' })
    }
  })

  return errors
}

export function validateKnowledgeChunkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  return validateKnowledgeChunkLines(content.split(/\r?\n/))
}

function main() {
  const targetPath = process.argv[2]
  if (!targetPath) {
    console.error('Usage: node scripts/validate-knowledge-chunks.mjs <path-to-jsonl>')
    process.exit(1)
  }

  const resolvedPath = path.resolve(targetPath)
  const errors = validateKnowledgeChunkFile(resolvedPath)

  if (errors.length === 0) {
    console.log(`OK: ${targetPath} has no schema errors.`)
    return
  }

  console.error(`Found ${errors.length} issue(s) in ${targetPath}:`)
  for (const error of errors) {
    console.error(`  line ${error.line}: ${error.message}`)
  }
  process.exit(1)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/validate-knowledge-chunks.test.mjs`
Expected: PASS (6 tests)

- [ ] **Step 5: Wire up the npm script**

In `package.json`, add this entry to `"scripts"` (alongside the existing `"agent:curriculum"` line):

```json
"knowledge:validate": "node scripts/validate-knowledge-chunks.mjs",
```

Verify manually:

Run: `npm run knowledge:validate -- data/react_docs.jsonl`
Expected: `OK: data/react_docs.jsonl has no schema errors.` (confirms the validator accepts the existing, already-shipped file)

- [ ] **Step 6: Commit**

```bash
git add scripts/validate-knowledge-chunks.mjs scripts/validate-knowledge-chunks.test.mjs package.json
git commit -m "$(cat <<'EOF'
feat: 지식 청크 jsonl 스키마 검증 스크립트 추가

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Document the knowledge-source convention and the remaining content gap

**Files:**
- Create: `data/README.md`

**Interfaces:**
- Consumes: nothing (documentation only).
- Produces: nothing consumed by code; this is the handoff doc for whoever curates the `backend` / `software-engineer` content next.

- [ ] **Step 1: Write the doc**

```markdown
# `data/` — Curriculum Agent Knowledge Chunks

This directory holds the official-doc chunks the curriculum agent uses for grounding
(`searchKnowledgeChunks` in `backend/modules/knowledge/adapters/jsonlKnowledgeRepository.mjs`).

## File naming

One `.jsonl` file per knowledge topic. The topic is inferred from the file name in
`inferTopicFromFileName` (same file):

| File name                              | Topic               | Curriculum track(s) it grounds |
| --------------------------------------- | -------------------- | ------------------------------- |
| `react_docs.jsonl`                      | `react`               | `frontend`, `fullstack`         |
| `docker-docs-chunks.jsonl`              | `docker`              | `devops`                        |
| `backend-docs-chunks.jsonl`             | `backend`             | `backend`, `fullstack`          |
| `software-engineer-docs-chunks.jsonl`   | `software-engineer`   | `software-engineer`             |

`fullstack` goals search both the `react` and `backend` topics (see
`backend/modules/curriculum/domain/trackTopicKeywords.mjs`) — it does not need its own file.

New files must be added to `defaultKnowledgeChunkFileNames` in
`jsonlKnowledgeRepository.mjs` and given a branch in `inferTopicFromFileName` if the
file name doesn't already contain the topic string.

## Line schema

Each non-empty line is one JSON object:

```json
{
  "docTitle": "string, required — the source document's title",
  "sectionHeading": "string, optional — defaults to docTitle if omitted",
  "chunkText": "string, required, 20–2000 chars — the excerpt used for grounding",
  "url": "string, required — must start with http:// or https://",
  "sourcePath": "string, optional — defaults to url if omitted"
}
```

`title` and `content` are accepted as aliases for `docTitle` and `chunkText` (see
`normalizeKnowledgeChunkInput` in `jsonlKnowledgeRepository.mjs`) for compatibility with
`react_docs.jsonl`'s existing shape.

## Adding a new source file

1. Create `data/<topic>-docs-chunks.jsonl` with one JSON object per line, per the schema above.
2. Validate it: `npm run knowledge:validate -- data/<topic>-docs-chunks.jsonl`
3. Fix any reported line/message pairs until the validator prints `OK: ...`.
4. Register the file name in `defaultKnowledgeChunkFileNames` and, if needed, a topic
   branch in `inferTopicFromFileName` (both in `jsonlKnowledgeRepository.mjs`).
5. Run `npm test` to confirm nothing regresses.

## Current gap

`backend-docs-chunks.jsonl` and `software-engineer-docs-chunks.jsonl` do not exist yet.
Until they're added, goals classified into the `backend` or `software-engineer` topics
generate a curriculum with `knowledgeContext: []` — the agent still works, it just has no
official-doc grounding for its rationale on those two tracks. This is a known, tracked gap,
not a bug: `recommendCurriculum` and `searchKnowledgeChunks` both handle the empty-chunk
case safely (see the regression test in
`backend/modules/curriculum/application/recommendCurriculum.test.mjs`).

Populating these two files is a content-curation task: pull representative chunks from
each track's official documentation (FastAPI's own docs are a natural fit for `backend`,
given `backend-docs-chunks.jsonl` and the existing `fastapi` keyword already wired into
`trackTopicKeywords.mjs`), keep `chunkText` to a focused single-topic excerpt per line
(20–2000 chars), and validate with `npm run knowledge:validate` before committing.
```

- [ ] **Step 2: Verify Korean/UTF-8 and Markdown table render correctly**

Run: `git diff --check` (confirms no trailing-whitespace/encoding issues)
Expected: no output (clean)

- [ ] **Step 3: Commit**

```bash
git add data/README.md
git commit -m "$(cat <<'EOF'
docs: 지식 청크 소스 규칙과 backend/software-engineer 콘텐츠 공백 문서화

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Post-Plan State

After Task 6:
- `frontend` and `devops` goals are grounded exactly as before (topics `react`/`docker`, scoring unchanged when no track keyword matches).
- `backend` and `fullstack` goals now get a relevance boost toward `backend`/`react` topic chunks once those files exist; today they safely fall back to `knowledgeContext: []`.
- `software-engineer` goals are classified into their own topic and safely fall back to `knowledgeContext: []` until `software-engineer-docs-chunks.jsonl` is curated.
- A validator + documented convention exists so adding the two missing source files is a self-contained, testable content task — not a code task.

**Explicitly out of scope for this plan** (raised during scoping, deferred by user choice): Gemini call timeout/retry, malformed-model-output self-repair, and request caching/rate-limiting on `/api/curriculum/recommend`. These remain open reliability gaps in `backend/modules/curriculum/adapters/geminiCurriculumRecommendationProvider.mjs` and `backend/http/curriculumRoutes.mjs` if the user wants a follow-up plan later.
