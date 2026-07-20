import { describe, expect, it } from 'vitest'
import { createDatabase, databaseUrlFromEnvironment } from './database'

describe('T30 database configuration', () => {
  it('uses only a non-empty server DATABASE_URL', () => {
    expect(databaseUrlFromEnvironment({})).toBeNull()
    expect(databaseUrlFromEnvironment({ DATABASE_URL: '   ' })).toBeNull()
    expect(
      databaseUrlFromEnvironment({ DATABASE_URL: '  postgresql://example.test/db  ' }),
    ).toBe('postgresql://example.test/db')
  })

  it('rejects malformed and non-PostgreSQL URLs without making a connection', () => {
    expect(() => createDatabase('not-a-url')).toThrow('Database URL is invalid')
    expect(() => createDatabase('https://example.test/db')).toThrow(
      'Database URL must use PostgreSQL',
    )
  })

  it('constructs a lazy Neon HTTP database without contacting the server', () => {
    expect(createDatabase('postgresql://user:password@example.test/db')).toBeDefined()
  })
})
