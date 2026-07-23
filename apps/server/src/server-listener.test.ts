import assert from 'node:assert/strict'
import test from 'node:test'

import { createServerApplication } from './server-application.js'
import { listenToServerApplication } from './server-listener.js'

test('the TCP listener composes around the host application and refuses intake after close', async () => {
  const application = await createServerApplication()
  const started = await listenToServerApplication(application, {
    host: '127.0.0.1',
    port: 0,
  })
  const baseUrl = `http://127.0.0.1:${started.port}`

  try {
    const response = await fetch(`${baseUrl}/api/product/bootstrap`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), {
      accountReadiness: {
        state: 'unavailable',
        displayMessage:
          'Codex 상태를 확인할 수 없습니다. 자료 작업공간은 계속 사용할 수 있습니다.',
      },
      operationStatus: 'idle',
      workspace: null,
      history: {
        assignments: [],
        statePatches: [],
        userConfirmations: [],
        modelingRuns: [],
      },
    })

    const firstClose = started.application.close()
    const secondClose = started.application.close()
    assert.equal(secondClose, firstClose)
    await firstClose
    await assert.rejects(fetch(`${baseUrl}/api/product/bootstrap`))
  } finally {
    await started.application.close()
  }
})
