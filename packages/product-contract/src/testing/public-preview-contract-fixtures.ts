import {
  PUBLIC_PREVIEW_ACCOUNT_FIXTURES,
  PUBLIC_PREVIEW_RESPONSE_FIXTURES,
  PUBLIC_PREVIEW_SETUP_FIXTURES,
} from '../public-preview-fixtures.js'

const connected = PUBLIC_PREVIEW_ACCOUNT_FIXTURES[5]
const ready = PUBLIC_PREVIEW_SETUP_FIXTURES[12]

export const PUBLIC_PREVIEW_INVALID_RESPONSE_FIXTURES = [
  {
    name: 'missing projection',
    value: { status: 'ok' },
  },
  {
    name: 'extra response field',
    value: {
      ...PUBLIC_PREVIEW_RESPONSE_FIXTURES[4],
      internal: true,
    },
  },
  {
    name: 'unknown Account state',
    value: {
      status: 'ok',
      projection: {
        account: { state: 'mystery', allowedCommands: [] },
        setup: ready,
      },
    },
  },
  {
    name: 'absolute path',
    value: responseWithSetupField('absolutePath', '/private/workspace'),
  },
  {
    name: 'credential',
    value: responseWithAccountField('accessToken', 'secret'),
  },
  {
    name: 'account identity',
    value: responseWithAccountField('email', 'student@example.com'),
  },
  {
    name: 'native login identity',
    value: responseWithAccountField('loginId', 'native-login'),
  },
  {
    name: 'Runtime process identity',
    value: responseWithSetupField('runtimePid', 1234),
  },
  {
    name: 'private digest',
    value: responseWithSetupField('digest', 'a'.repeat(64)),
  },
  {
    name: 'durable receipt phase',
    value: responseWithSetupField('receiptPhase', 'prepared'),
  },
] as const

function responseWithAccountField(key: string, value: unknown): unknown {
  return {
    status: 'ok',
    projection: {
      account: { ...connected, [key]: value },
      setup: ready,
    },
  }
}

function responseWithSetupField(key: string, value: unknown): unknown {
  return {
    status: 'ok',
    projection: {
      account: connected,
      setup: { ...ready, [key]: value },
    },
  }
}
