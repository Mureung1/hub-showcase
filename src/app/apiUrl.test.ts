import { describe, expect, it } from 'vitest'
import { apiUrl } from './apiUrl'

describe('apiUrl', () => {
  it.each([
    ['/api/profile', undefined, '/api/profile'],
    ['api/profile', undefined, '/api/profile'],
    ['/api/profile', 'http://localhost:8787', 'http://localhost:8787/api/profile'],
    ['/api/profile', 'http://localhost:8787/', 'http://localhost:8787/api/profile'],
    ['api/profile', 'http://localhost:8787/', 'http://localhost:8787/api/profile'],
  ])('normalizes %s with base %s', (path, baseUrl, expected) => {
    expect(apiUrl(path, baseUrl)).toBe(expected)
  })
})
