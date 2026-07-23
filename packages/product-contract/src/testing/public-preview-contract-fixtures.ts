import {
  PUBLIC_PREVIEW_ACCOUNT_FIXTURES,
  PUBLIC_PREVIEW_SCENARIO_FIXTURES,
  PUBLIC_PREVIEW_SETUP_FIXTURES,
} from './public-preview-fixtures.js'

const connected = PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected
const pending = PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginPending
const ready = PUBLIC_PREVIEW_SETUP_FIXTURES.ready
const firstConnection = PUBLIC_PREVIEW_SETUP_FIXTURES.firstConnection

export const PUBLIC_PREVIEW_INVALID_RESPONSE_FIXTURES = [
  {
    name: 'missing projection',
    value: { status: 'ok' },
  },
  {
    name: 'extra response field',
    value: {
      ...PUBLIC_PREVIEW_SCENARIO_FIXTURES.find(
        ({ name }) => name === 'authenticated',
      )!.response,
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
    name: 'credential-bearing login URL',
    value: responseWithPendingAuthUrl(
      'https://token:secret@auth.openai.com/codex',
    ),
  },
  {
    name: 'non-default login URL port',
    value: responseWithPendingAuthUrl(
      'https://auth.openai.com:8443/codex',
    ),
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

function responseWithPendingAuthUrl(authUrl: string): unknown {
  return {
    status: 'ok',
    projection: {
      account: { ...pending, authUrl },
      setup: firstConnection,
    },
  }
}

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
