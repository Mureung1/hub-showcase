import process from 'node:process'

export const defaultProvider = 'developer'
export const defaultModel = 'gemini-flash-latest'
export const defaultGoal = '프론트엔드 개발자가 되고 싶어'

export function loadEnvFiles({ fs, path, repoRoot }) {
  loadEnvFile({ fs, filePath: path.join(repoRoot, '.env') })
  loadEnvFile({ fs, filePath: path.join(repoRoot, 'src', '.env') })
}

export function createAgentConfig(env = process.env) {
  return {
    provider: env.CURRICULUM_AGENT_PROVIDER || env.GEMINI_PROVIDER || defaultProvider,
    model: env.GEMINI_MODEL || defaultModel,
    apiKey: env.GEMINI_API_KEY,
  }
}

export function parseCliArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    compact: argv.includes('--compact'),
    goal: argv.filter((arg) => !arg.startsWith('--')).join(' ').trim() || defaultGoal,
  }
}

function loadEnvFile({ fs, filePath }) {
  if (!fs.existsSync(filePath)) return

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue

    const [key, ...rest] = trimmed.split('=')
    if (!process.env[key]) process.env[key] = rest.join('=').replace(/^[`'"]|[`'"]$/g, '')
  }
}