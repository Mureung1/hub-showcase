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
