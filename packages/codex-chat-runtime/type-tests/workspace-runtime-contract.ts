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

})
