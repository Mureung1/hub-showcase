import { createExactCodexThreadFixture } from './exact-codex-thread.js';

interface InitializeResponseFixtureOptions {
  userAgent?: string;
  capabilities?: Record<string, unknown> | null;
}

export function createExactInitializeResponseFixture(
  options: InitializeResponseFixtureOptions = {},
) {
  return {
    userAgent: options.userAgent ?? 'codex-cli 0.144.4',
    codexHome: '/tmp/codex-home',
    platformFamily: 'unix',
    platformOs: 'macos',
    // This named donor compatibility extra is opt-in test data, never exact
    // generated authority.
    ...(options.capabilities === undefined ? {} : { capabilities: options.capabilities }),
  };
}

function createExactThreadMethodResponseFixture() {
  return {
    thread: { ...createExactCodexThreadFixture(), id: 'thr_1' },
    model: 'gpt-5.3-codex',
    modelProvider: 'openai',
    cwd: '/tmp',
    approvalPolicy: 'never',
    approvalsReviewer: 'user',
    sandbox: { type: 'workspaceWrite' },
  };
}

export function createExactThreadStartResponseFixture() {
  return createExactThreadMethodResponseFixture();
}

export function createExactThreadResumeResponseFixture() {
  return createExactThreadMethodResponseFixture();
}

export function createExactTurnStartResponseFixture() {
  return {
    turn: {
      id: 'turn_1',
      items: [],
      status: 'inProgress',
    },
  };
}

export function createExactModelListResponseFixture() {
  return {
    data: [
      {
        id: 'gpt-5.3-codex',
        model: 'gpt-5.3-codex',
        displayName: 'GPT-5.3 Codex',
        description: '',
        hidden: false,
        supportedReasoningEfforts: [],
        defaultReasoningEffort: 'medium',
        isDefault: true,
      },
    ],
  };
}
