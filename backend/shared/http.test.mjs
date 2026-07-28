import { describe, expect, it } from 'vitest'
import { createCorsHeaders } from './http.mjs'

describe('HTTP CORS headers', () => {
  it('restricts browser access to the configured Vercel app origin', () => {
    expect(createCorsHeaders('https://icu.vercel.app')).toMatchObject({
      'Access-Control-Allow-Origin': 'https://icu.vercel.app',
    })
  })

  it('keeps wildcard CORS only when no deployed origin is configured', () => {
    expect(createCorsHeaders()).toMatchObject({
      'Access-Control-Allow-Origin': '*',
    })
  })
})
