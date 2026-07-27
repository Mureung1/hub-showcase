import assert from 'node:assert/strict'
import test from 'node:test'

import { buildGeminiPrompt } from '../src/teamflow/geminiPrompt.js'

test('Gemini prompt identifies the agent and treats project context as untrusted reference data', () => {
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
  for (const heading of [
    '## 작업 요청 요약',
    '## 참고한 컨텍스트',
    '## 작업 결과',
    '## 제안하는 다음 행동',
  ]) {
    assert.match(prompt.systemInstruction, new RegExp(heading))
  }
  assert.match(prompt.prompt, /경쟁사 조사/)
  assert.match(prompt.prompt, /TeamFlow/)
  assert.equal(prompt.prompt, JSON.stringify(contextSnapshot))
})
