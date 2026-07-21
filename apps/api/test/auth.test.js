import assert from 'node:assert/strict'
import test from 'node:test'

import { AuthenticationError, createSupabaseAuthVerifier, readBearerToken } from '../src/lib/auth.js'

test('readBearerToken accepts only Bearer authorization headers', () => {
  assert.equal(readBearerToken('Bearer valid-token'), 'valid-token')
  assert.equal(readBearerToken('bearer another-token'), 'another-token')
  assert.equal(readBearerToken('Basic abc'), null)
  assert.equal(readBearerToken(undefined), null)
})

test('Supabase verifier derives display data from verified claims', async () => {
  const verifier = createSupabaseAuthVerifier({
    auth: {
      getClaims: async () => ({
        data: {
          claims: {
            sub: '11111111-1111-4111-8111-111111111111',
            email: 'user@example.com',
            is_anonymous: false,
            user_metadata: { full_name: '이주환', avatar_url: 'https://example.com/avatar.png' },
          },
        },
        error: null,
      }),
    },
  })

  assert.deepEqual(await verifier.verify('valid-token'), {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'user@example.com',
    displayName: '이주환',
    avatarUrl: 'https://example.com/avatar.png',
  })
})

test('Supabase verifier rejects anonymous and invalid tokens', async () => {
  const anonymousVerifier = createSupabaseAuthVerifier({
    auth: { getClaims: async () => ({ data: { claims: { sub: 'id', is_anonymous: true } }, error: null }) },
  })
  const invalidVerifier = createSupabaseAuthVerifier({
    auth: { getClaims: async () => ({ data: null, error: new Error('invalid') }) },
  })

  await assert.rejects(() => anonymousVerifier.verify('token'), AuthenticationError)
  await assert.rejects(() => invalidVerifier.verify('token'), AuthenticationError)
})
