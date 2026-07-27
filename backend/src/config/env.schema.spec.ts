import { validateEnv } from './env.schema'

describe('validateEnv', () => {
  const validConfig = {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  }

  it('applies defaults for optional variables', () => {
    const env = validateEnv(validConfig)

    expect(env.NODE_ENV).toBe('development')
    expect(env.PORT).toBe(3000)
    expect(env.CORS_ORIGIN).toBe('http://localhost:5173')
    expect(env.NAVER_API_MODE).toBe('DEVELOPERS')
    expect(env.FMP_API_KEY).toBe('')
  })

  it('throws when required Supabase variables are missing', () => {
    expect(() => validateEnv({})).toThrow(/SUPABASE_URL/)
  })

  it('does not require market provider keys at bootstrap', () => {
    expect(() => validateEnv(validConfig)).not.toThrow()
  })
})
