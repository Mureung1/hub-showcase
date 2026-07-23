const LOCAL_WEB_ORIGIN = 'http://localhost:5173'

function normalizeOrigin(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`TEAMFLOW_ALLOWED_ORIGINS에 올바르지 않은 URL이 있습니다: ${value}`)
  }

  if (!['http:', 'https:'].includes(url.protocol)
    || url.username
    || url.password
    || url.search
    || url.hash
    || (url.pathname !== '/' && url.pathname !== '')) {
    throw new Error(`TEAMFLOW_ALLOWED_ORIGINS에는 http(s) origin만 입력할 수 있습니다: ${value}`)
  }

  return url.origin
}

export function readAllowedOrigins(environment = process.env) {
  const configured = environment.TEAMFLOW_ALLOWED_ORIGINS?.trim()
  const values = (configured || LOCAL_WEB_ORIGIN)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (values.length === 0) {
    throw new Error('TEAMFLOW_ALLOWED_ORIGINS에 허용할 웹 주소를 입력해 주세요.')
  }

  return [...new Set(values.map(normalizeOrigin))]
}

export function createCorsOptions(allowedOrigins = []) {
  const allowed = new Set(allowedOrigins)

  return {
    origin(origin, callback) {
      callback(null, !origin || allowed.has(origin))
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 86_400,
  }
}
