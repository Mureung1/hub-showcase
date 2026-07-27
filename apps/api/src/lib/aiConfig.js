import { AI_EXECUTION_MODE, AI_PROVIDER } from '@teamflow/shared'

const DEFAULT_MODEL = 'gemini-3.5-flash'
const DEFAULT_TIMEOUT_MS = 45_000
const MIN_TIMEOUT_MS = 1_000
const MAX_TIMEOUT_MS = 120_000
const MODEL_PATTERN = /^gemini-[a-z0-9._-]+$/i
const BASE64_PATTERN = /^[a-z0-9+/]+={0,2}$/i

function decodeMasterKey(value) {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.length % 4 !== 0
    || !BASE64_PATTERN.test(value)
  ) {
    throw new Error('TEAMFLOW_AI_CREDENTIAL_ENCRYPTION_KEY에는 32바이트 Base64 키가 필요합니다.')
  }

  const decoded = Buffer.from(value, 'base64')
  const canonicalInput = value.replace(/=+$/, '')
  const canonicalDecoded = decoded.toString('base64').replace(/=+$/, '')
  if (decoded.length !== 32 || canonicalInput !== canonicalDecoded) {
    throw new Error('TEAMFLOW_AI_CREDENTIAL_ENCRYPTION_KEY에는 32바이트 Base64 키가 필요합니다.')
  }
  return decoded
}

function readTimeout(environment) {
  const raw = environment.TEAMFLOW_AI_REQUEST_TIMEOUT_MS?.trim()
  if (!raw) return DEFAULT_TIMEOUT_MS
  if (!/^\d+$/.test(raw)) {
    throw new Error('TEAMFLOW_AI_REQUEST_TIMEOUT_MS 시간을 확인해 주세요.')
  }
  const timeoutMs = Number.parseInt(raw, 10)
  if (timeoutMs < MIN_TIMEOUT_MS || timeoutMs > MAX_TIMEOUT_MS) {
    throw new Error('TEAMFLOW_AI_REQUEST_TIMEOUT_MS 시간은 1,000~120,000ms여야 합니다.')
  }
  return timeoutMs
}

export function readAiRuntimeConfig(environment = process.env) {
  const configuredProvider = environment.TEAMFLOW_AI_PROVIDER?.trim().toLowerCase()
  if (!configuredProvider) {
    throw new Error('TEAMFLOW_AI_PROVIDER 환경변수가 필요합니다.')
  }
  if (configuredProvider !== 'mock' && configuredProvider !== AI_PROVIDER.GEMINI) {
    throw new Error('TEAMFLOW_AI_PROVIDER는 mock 또는 gemini여야 합니다.')
  }

  const model = environment.TEAMFLOW_GEMINI_MODEL?.trim() || DEFAULT_MODEL
  if (!MODEL_PATTERN.test(model) || model.length > 100) {
    throw new Error('TEAMFLOW_GEMINI_MODEL 모델 이름을 확인해 주세요.')
  }
  const timeoutMs = readTimeout(environment)

  if (configuredProvider === 'mock') {
    return {
      mode: AI_EXECUTION_MODE.MOCK,
      provider: null,
      model,
      modelLabel: 'Mock',
      credentialRequired: false,
      timeoutMs,
      encryptionKey: null,
    }
  }

  return {
    mode: AI_EXECUTION_MODE.LIVE,
    provider: AI_PROVIDER.GEMINI,
    model,
    modelLabel: model,
    credentialRequired: true,
    timeoutMs,
    encryptionKey: decodeMasterKey(
      environment.TEAMFLOW_AI_CREDENTIAL_ENCRYPTION_KEY?.trim(),
    ),
  }
}
