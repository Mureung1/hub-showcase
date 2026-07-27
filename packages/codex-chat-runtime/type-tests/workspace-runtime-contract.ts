import {
  createCodexChatRuntime,
  type CodexWorkspaceRuntime,
} from '../src/index.js'

const runtime: Promise<CodexWorkspaceRuntime> = createCodexChatRuntime({
  runtimeRoot: '/runtime',
  workspace: '/workspace',
  environment: {
    home: '/home',
    codexHome: '/codex-home',
    codexSqliteHome: '/codex-sqlite-home',
    tempDirectory: '/temp',
  },
})

void runtime.then((workspaceRuntime) => {
  void workspaceRuntime.readAccountReadiness()
  void workspaceRuntime.readModelCatalog()
  void workspaceRuntime.readEffectiveConfig({
    signal: new AbortController().signal,
  })
  void workspaceRuntime.listEffectiveSkills({
    signal: new AbortController().signal,
  })
  void workspaceRuntime.close()

  // @ts-expect-error Workspace callers must not receive Runtime roles.
  void workspaceRuntime.role

  // @ts-expect-error Workspace callers must not receive managed account reads.
  void workspaceRuntime.readAccount({
    refreshToken: true,
    signal: new AbortController().signal,
  })

  // @ts-expect-error Workspace callers must not receive managed login.
  void workspaceRuntime.startBrowserLogin({
    attemptId: 'attempt',
    expiresAt: new Date(0).toISOString(),
    signal: new AbortController().signal,
  })

  // @ts-expect-error Workspace callers must not receive managed logout.
  void workspaceRuntime.logout({
    signal: new AbortController().signal,
  })
})
