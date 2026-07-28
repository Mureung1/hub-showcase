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
  void workspaceRuntime.startProductTurn({
    threadId: 'native-thread',
    permissionProfile: 'workspace_write',
    skill: {
      name: 'ay-ple-first-assignment',
      path:
        '/workspace/.agents/skills/ay-ple-first-assignment/SKILL.md',
    },
    text: 'ActionInvocation: organize_sources',
  })
  void workspaceRuntime.readEffectiveConfig({
    signal: new AbortController().signal,
  })
  void workspaceRuntime.listEffectiveSkills({
    signal: new AbortController().signal,
  })
  void workspaceRuntime.close()
})
