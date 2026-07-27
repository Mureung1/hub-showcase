/// <reference types="node" />

import {
  createWorkspaceRegistryStore,
  type WorkspaceRegistryStoreFaultPoint,
  type WorkspaceRegistryV1,
} from '../workspace-registry.js'

const [
  appDataRoot,
  encodedExpectedAuthority,
  encodedRegistry,
  faultPoint,
] = process.argv.slice(2)

if (
  !appDataRoot ||
  !encodedExpectedAuthority ||
  !encodedRegistry ||
  !faultPoint
) {
  process.exit(2)
}

const registry = JSON.parse(
  Buffer.from(encodedRegistry, 'base64url').toString('utf8'),
) as WorkspaceRegistryV1
const store = createWorkspaceRegistryStore({
  appDataRoot,
  fault(point: WorkspaceRegistryStoreFaultPoint) {
    if (point === faultPoint) process.kill(process.pid, 'SIGKILL')
  },
})

await store.compareAndReplace({
  expectedAuthority:
    encodedExpectedAuthority === 'null'
      ? null
      : {
          openedBytes: Buffer.from(
            encodedExpectedAuthority,
            'base64url',
          ),
        },
  registry,
})

process.exit(3)
