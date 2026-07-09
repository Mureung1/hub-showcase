import { execFile } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'
import {
  CodexRawClient,
  type CodexRawClientOptions,
  type CodexRuntimeHome,
} from './raw-client.js'

export type CodexRuntimeConfigStatus = {
  configPath: string
  authCredentialsStore: string | null
  fileAuthConfigPresent: boolean
}

export type CodexRuntimeStatus =
  | {
      ok: true
      codexBinPath: string
      version: string | null
      pinnedVersion: string
      versionMatchesPin: boolean | null
      cwd: string
      runtimeHome: CodexRuntimeHome
      config: CodexRuntimeConfigStatus
      initialize: {
        userAgent: string
        codexHome: string
        platformFamily: string
        platformOs: string
      }
      auth: {
        authMethod: string | null
        requiresOpenaiAuth: boolean | null
      }
    }
  | {
      ok: false
      error: string
      codexBinPath: string | null
      version: string | null
      pinnedVersion: string
      versionMatchesPin: boolean | null
      cwd: string | null
      runtimeHome: CodexRuntimeHome | null
      config: CodexRuntimeConfigStatus | null
    }

const execFileAsync = promisify(execFile)
const fileAuthConfigKey = 'cli_auth_credentials_store'
const pinnedVersion = readPinnedCodexVersion()

export async function readCodexRuntimeStatus(
  options: CodexRawClientOptions = {},
): Promise<CodexRuntimeStatus> {
  let client: CodexRawClient | undefined
  let version: string | null = null

  try {
    client = new CodexRawClient(options)
    version = await readCodexBinaryVersion(client.getCodexBinPath())

    const initialize = await client.initialize()
    const config = readCodexRuntimeConfigStatus(client.getRuntimeHome())
    const auth = await client.getAuthStatus()

    return {
      ok: true,
      codexBinPath: client.getCodexBinPath(),
      version,
      pinnedVersion,
      versionMatchesPin: versionMatchesPin(version),
      cwd: client.getCwd(),
      runtimeHome: client.getRuntimeHome(),
      config,
      initialize: initialize.response,
      auth: {
        authMethod: auth.authMethod,
        requiresOpenaiAuth: auth.requiresOpenaiAuth,
      },
    }
  } catch (error) {
    const runtimeHome = client?.getRuntimeHome() ?? null

    return {
      ok: false,
      error:
        error instanceof Error ? error.message : 'Unable to read Codex status',
      codexBinPath: client?.getCodexBinPath() ?? options.codexBinPath ?? null,
      version,
      pinnedVersion,
      versionMatchesPin: versionMatchesPin(version),
      cwd: client?.getCwd() ?? options.cwd ?? null,
      runtimeHome,
      config: runtimeHome ? readCodexRuntimeConfigStatus(runtimeHome) : null,
    }
  } finally {
    await client?.close()
  }
}

function readPinnedCodexVersion(): string {
  const packageJson = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as {
    dependencies?: Record<string, unknown>
  }
  const version = packageJson.dependencies?.['@openai/codex']

  if (typeof version !== 'string' || version.length === 0) {
    throw new Error('Unable to read pinned @openai/codex version')
  }

  return version
}

function versionMatchesPin(version: string | null): boolean | null {
  if (version === null) {
    return null
  }

  return version.split(/\s+/).includes(pinnedVersion)
}

export function readCodexRuntimeConfigStatus(
  runtimeHome: CodexRuntimeHome,
): CodexRuntimeConfigStatus {
  const configPath = join(runtimeHome.codexHome, 'config.toml')
  const authCredentialsStore = readAuthCredentialsStore(configPath)

  return {
    configPath,
    authCredentialsStore,
    fileAuthConfigPresent: authCredentialsStore === 'file',
  }
}

async function readCodexBinaryVersion(
  codexBinPath: string,
): Promise<string | null> {
  try {
    const result = await execFileAsync(codexBinPath, ['--version'], {
      timeout: 5000,
    })
    const output = `${result.stdout}${result.stderr}`.trim()

    return output.length > 0 ? output : null
  } catch {
    return null
  }
}

function readAuthCredentialsStore(configPath: string): string | null {
  if (!existsSync(configPath)) {
    return null
  }

  const config = readFileSync(configPath, 'utf8')
  const match = config.match(
    new RegExp(`^\\s*${fileAuthConfigKey}\\s*=\\s*["']?([^"'\\n]+)["']?`, 'm'),
  )

  return match?.[1]?.trim() ?? null
}
