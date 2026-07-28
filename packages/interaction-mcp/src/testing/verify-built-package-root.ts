import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const packageRoot = fileURLToPath(new URL('../..', import.meta.url))
const entrypoint = fileURLToPath(
  new URL('../../dist/stdio.js', import.meta.url),
)
const packageContract = await import('@ay-ple/interaction-mcp')

assert.deepEqual(Object.keys(packageContract).sort(), [
  'INTERACTION_BROKER_BODY_MAX_BYTES',
  'INTERACTION_BROKER_PROTOCOL_VERSION',
  'INTERACTION_MCP_SERVER_NAME',
  'INTERACTION_SAFE_MESSAGE_MAX_BYTES',
  'InteractionContractError',
  'PROPOSE_STATE_PATCH_CAPABILITY',
  'PROPOSE_STATE_PATCH_REQUEST_MAX_BYTES',
  'decodeInteractionBrokerRequest',
  'decodeInteractionBrokerResponse',
  'decodeProposeStatePatchRequest',
  'decodeProposeStatePatchResult',
  'parseInteractionBrokerRequest',
  'parseInteractionBrokerResponse',
])

const entrypointBytes = await readFile(entrypoint, 'utf8')
assert.ok(entrypointBytes.startsWith('#!/usr/bin/env node\n'))
const entrypointStat = await stat(entrypoint)
assert.equal(entrypointStat.mode & 0o111, 0o111)
assert.equal(packageRoot.endsWith('/packages/interaction-mcp/'), true)
