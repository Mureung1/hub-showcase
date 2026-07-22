import { describe, expect, it } from 'vitest'
import {
  EmbeddingProviderError,
  retrievalEmbeddingDimensions,
  validateEmbedding,
} from './embedding.js'

const validEmbedding = () => {
  const embedding = Array.from({ length: retrievalEmbeddingDimensions }, () => 0)
  embedding[0] = 1
  return embedding
}

describe('retrieval embedding validation', () => {
  it('accepts a finite nonzero 1024-dimension vector without sharing the input array', () => {
    const input = validEmbedding()
    const result = validateEmbedding(input)

    expect(result).toEqual(input)
    expect(result).not.toBe(input)
  })

  it.each([
    ['wrong dimensions', [1, 0]],
    ['non-finite value', [...validEmbedding().slice(0, -1), Number.NaN]],
    ['zero norm', Array.from({ length: retrievalEmbeddingDimensions }, () => 0)],
  ])('rejects %s', (_name, input) => {
    expect(() => validateEmbedding(input)).toThrow(EmbeddingProviderError)
  })
})
