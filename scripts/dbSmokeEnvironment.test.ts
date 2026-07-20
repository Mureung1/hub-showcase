import { describe, expect, it } from 'vitest'
import { databaseSmokeConfirmation, databaseUrlForSmoke } from './dbSmokeEnvironment'

describe('T30 database smoke environment guard', () => {
  it('always rejects the production environment', () => {
    expect(() =>
      databaseUrlForSmoke({
        DATABASE_URL: 'postgresql://example.test/db',
        DB_SMOKE_CONFIRM: databaseSmokeConfirmation,
        VERCEL_ENV: 'production',
      }),
    ).toThrow('cannot run against the production environment')
  })

  it('requires an explicit temporary-write confirmation', () => {
    expect(() =>
      databaseUrlForSmoke({ DATABASE_URL: 'postgresql://example.test/db' }),
    ).toThrow(`DB_SMOKE_CONFIRM=${databaseSmokeConfirmation}`)
  })

  it('requires a database URL after confirmation', () => {
    expect(() =>
      databaseUrlForSmoke({ DB_SMOKE_CONFIRM: databaseSmokeConfirmation }),
    ).toThrow('Set DATABASE_URL')
  })

  it('returns a trimmed development database URL', () => {
    expect(
      databaseUrlForSmoke({
        DATABASE_URL: '  postgresql://example.test/db  ',
        DB_SMOKE_CONFIRM: databaseSmokeConfirmation,
        VERCEL_ENV: 'preview',
      }),
    ).toBe('postgresql://example.test/db')
  })
})
