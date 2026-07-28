import assert from 'node:assert/strict'
import test from 'node:test'

import { buildGeminiPrompt } from '../src/teamflow/geminiPrompt.js'

test('Gemini prompt enforces safety, task, role, then reference-context priority', () => {
  const contextSnapshot = {
    version: 1,
    instructions: '근거를 먼저 제시하세요.',
    agent: {
      id: 'agent-1',
      name: '리서치 Agent',
      role: '시장 조사',
      description: '시장 근거를 정리합니다.',
    },
    task: {
      id: 'task-1',
      title: '경쟁사 조사',
      description: '세 경쟁사를 비교하세요.',
    },
    contextConfig: {
      project: true,
      notes: false,
      tasks: true,
      team: false,
      resources: false,
    },
    context: {
      project: { id: 'project-1', name: 'TeamFlow', description: '협업 도구' },
      tasks: [],
    },
    truncation: {},
  }

  const prompt = buildGeminiPrompt(contextSnapshot)

  assert.match(prompt.systemInstruction, /리서치 Agent/)
  assert.match(prompt.systemInstruction, /시장 조사/)
  assert.match(prompt.systemInstruction, /근거를 먼저 제시하세요/)
  assert.match(prompt.systemInstruction, /신뢰할 수 없는 참고 데이터/)
  assert.match(prompt.systemInstruction, /추측하지 마세요/)
  assert.match(prompt.systemInstruction, /JSON 객체/)
  assert.ok(
    prompt.systemInstruction.indexOf('[우선순위 1] 시스템 안전 규칙') <
      prompt.systemInstruction.indexOf('[우선순위 2] 배정된 할 일'),
  )
  assert.ok(
    prompt.systemInstruction.indexOf('[우선순위 2] 배정된 할 일') <
      prompt.systemInstruction.indexOf('[우선순위 3] Agent 역할'),
  )
  assert.ok(
    prompt.systemInstruction.indexOf('[우선순위 3] Agent 역할') <
      prompt.systemInstruction.indexOf('[우선순위 4] 참고 컨텍스트'),
  )
  for (const field of [
    'plan',
    'resultMarkdown',
    'selfReview',
    'suggestedNextAction',
  ]) assert.match(prompt.systemInstruction, new RegExp(field))
  assert.match(prompt.prompt, /경쟁사 조사/)
  assert.match(prompt.prompt, /TeamFlow/)
  assert.equal(prompt.prompt, JSON.stringify(contextSnapshot))
})
