/// <reference types="node" />

import type { SetupStateEnvelope } from '../contract.js'
import {
  createSetupEnvelopeStore,
  type SetupEnvelopeStoreFaultPoint,
} from '../setup-envelope-store.js'

const [
  appDataRoot,
  expectedRevisionToken,
  faultPoint,
  encodedEnvelope,
] = process.argv.slice(2)

if (
  !appDataRoot ||
  expectedRevisionToken === undefined ||
  !faultPoint ||
  !encodedEnvelope
) {
  process.exit(2)
}

const envelope = JSON.parse(
  Buffer.from(encodedEnvelope, 'base64url').toString('utf8'),
) as SetupStateEnvelope

const store = createSetupEnvelopeStore({
  appDataRoot,
  fault(point: SetupEnvelopeStoreFaultPoint) {
    if (point === faultPoint) process.exit(91)
  },
})

await store.compareAndReplace({
  expectedRevisionToken:
    expectedRevisionToken === 'null'
      ? null
      : expectedRevisionToken,
  envelope,
})

process.exit(3)
