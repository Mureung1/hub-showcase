import assert from 'node:assert/strict'
import { join } from 'node:path'
import test from 'node:test'
import { readCodexRuntimeStatus } from './index.js'
import { withFakeCodexAppServer } from './testing/fake-codex-app-server.js'

test('readCodexRuntimeStatus reports binary, runtime home, config, and auth', async () => {
  await withFakeCodexAppServer(
    {
      userAgent: 'fake-codex-status-test',
      authStatus: {
        authMethod: 'chatgpt',
        authToken: 'hidden-token',
        requiresOpenaiAuth: true,
      },
    },
    async ({ rawClientOptions }) => {
      const status = await readCodexRuntimeStatus({
        ...rawClientOptions,
        ensureFileAuthConfig: true,
      })

      assert.equal(status.ok, true)

      if (status.ok) {
        assert.equal(status.codexBinPath, process.execPath)
        assert.notEqual(status.version, null)
        assert.match(status.version ?? '', /^v\d+\./)
        assert.equal(status.cwd, rawClientOptions.cwd)
        assert.deepEqual(status.runtimeHome, {
          codexHome: rawClientOptions.codexHome,
          codexSqliteHome: rawClientOptions.codexSqliteHome,
        })
        assert.deepEqual(status.config, {
          configPath: join(rawClientOptions.codexHome ?? '', 'config.toml'),
          authCredentialsStore: 'file',
          fileAuthConfigPresent: true,
        })
        assert.equal(status.initialize.userAgent, 'fake-codex-status-test')
        assert.deepEqual(status.auth, {
          authMethod: 'chatgpt',
          requiresOpenaiAuth: true,
        })
        assert.equal('authToken' in status.auth, false)
      }
    },
  )
})
