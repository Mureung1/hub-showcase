import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const runtimeGenerationFiles = [
  'api/generate.ts',
  'api/_lib/generation/handler.ts',
  'api/_lib/prompt/buildPrompt.ts',
]

describe('T35 runtime activation boundary', () => {
  it('does not connect retrieval-eval modules or mode to the production generation path', () => {
    const runtimeSource = runtimeGenerationFiles
      .map((path) => readFileSync(join(process.cwd(), path), 'utf8'))
      .join('\n')

    expect(runtimeSource).not.toMatch(/_lib\/retrieval|\.\.\/retrieval|retrieval-eval/u)
    expect(runtimeSource).not.toContain('createReviewedExampleSelector')
  })
})
