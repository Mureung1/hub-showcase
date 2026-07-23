import { describe, expect, it } from 'vitest'
import { compileTemplateArtifact } from '../src/entities/message/templateCompiler/compiler.js'
import { serializeTemplateArtifact } from '../src/entities/message/templateCompiler/serializer.js'
import { assertTemplateArtifactsCurrent } from './templates-check.js'

describe('templates:check', () => {
  it('현재 산출물은 통과하고 한 바이트 drift도 실패한다', () => {
    const current = serializeTemplateArtifact(compileTemplateArtifact())
    expect(() =>
      assertTemplateArtifactsCurrent(current.templatesTypeScript, current.manifestJson),
    ).not.toThrow()
    expect(() =>
      assertTemplateArtifactsCurrent(`${current.templatesTypeScript} `, current.manifestJson),
    ).toThrowError('Template artifacts are out of date')
    expect(() =>
      assertTemplateArtifactsCurrent(current.templatesTypeScript, `${current.manifestJson} `),
    ).toThrowError('Template artifacts are out of date')
  })
})
