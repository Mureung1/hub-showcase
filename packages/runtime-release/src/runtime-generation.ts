/// <reference types="node" />

import {
  verifyMaterializedRuntimeTree,
} from './runtime-archive-extraction.js'
import type {
  RuntimeMaterializedTreeVerificationInput,
  RuntimeMaterializedTreeVerificationSnapshot,
} from './runtime-archive-extraction.js'

export type RuntimeGenerationTreeVerificationSnapshot =
  RuntimeMaterializedTreeVerificationSnapshot

export async function verifyRuntimeGenerationTree(
  input: RuntimeMaterializedTreeVerificationInput,
): Promise<RuntimeGenerationTreeVerificationSnapshot> {
  return verifyMaterializedRuntimeTree(input)
}
