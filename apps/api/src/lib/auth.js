export class AuthenticationError extends Error {
  constructor(message = '로그인이 필요합니다.') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export function readBearerToken(header) {
  if (typeof header !== 'string') return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match?.[1]?.trim() || null
}

function displayProfile(claims) {
  const metadata = claims.user_metadata && typeof claims.user_metadata === 'object'
    ? claims.user_metadata
    : {}
  const email = typeof claims.email === 'string' ? claims.email : ''
  const displayName = [metadata.full_name, metadata.name, email.split('@')[0]]
    .find((value) => typeof value === 'string' && value.trim())
  const avatarUrl = [metadata.avatar_url, metadata.picture]
    .find((value) => typeof value === 'string' && value.trim())

  return {
    id: claims.sub,
    email,
    displayName: displayName?.trim() || 'TeamFlow 사용자',
    avatarUrl: avatarUrl?.trim() || null,
  }
}

export function createSupabaseAuthVerifier(supabase) {
  return {
    async verify(token) {
      const { data, error } = await supabase.auth.getClaims(token)
      const claims = data?.claims

      if (error || !claims?.sub || claims.is_anonymous === true) {
        throw new AuthenticationError('로그인 정보가 유효하지 않습니다.')
      }

      return displayProfile(claims)
    },
  }
}

export function createAuthenticationMiddleware({ authVerifier, repositoryFactory }) {
  return async function authenticate(request, response, next) {
    const token = readBearerToken(request.get('authorization'))

    if (!token) {
      response.status(401).json({
        error: { code: 'AUTH_REQUIRED', message: '로그인이 필요합니다.' },
      })
      return
    }

    try {
      const user = await authVerifier.verify(token)
      request.teamFlow = {
        token,
        user,
        repository: repositoryFactory({ token, user }),
      }
      next()
    } catch {
      response.status(401).json({
        error: { code: 'INVALID_AUTH_TOKEN', message: '로그인 정보가 유효하지 않습니다.' },
      })
    }
  }
}
