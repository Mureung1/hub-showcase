import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  createAgentConfig,
  createDryRunPayload,
  loadCurriculumTracks,
  loadEnvFiles,
  parseCliArgs,
  runCurriculumPlannerAgent,
} from '../backend/agents/curriculum-planner-agent-core.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function main() {
  loadEnvFiles({ fs, path, repoRoot })

  const args = parseCliArgs(process.argv.slice(2))
  const tracks = loadCurriculumTracks({ fs, path, repoRoot })
  const config = createAgentConfig()

  if (args.dryRun) {
    console.log(JSON.stringify(createDryRunPayload({ goal: args.goal, tracks, config }), null, 2))
    return
  }

  const output = await runCurriculumPlannerAgent({ goal: args.goal, tracks, config })
  console.log(JSON.stringify(output, null, args.compact ? 0 : 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})

