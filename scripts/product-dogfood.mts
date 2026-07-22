import { constants } from 'node:fs'
import {
  access,
  cp,
  lstat,
  mkdir,
  readFile,
  realpath,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { runProductDevelopment } from './product-development-bootstrap.mjs'
import { assertProductRootsDoNotOverlap } from './semester-workspace-materializer.mjs'

const profileMarkerName = '.ay-ple-dogfood-profile.json'
const profileMarkerKind = 'ay-ple-persistent-dogfood-profile'
const codexConfig = [
  'cli_auth_credentials_store = "file"',
  'approval_policy = "never"',
  'sandbox_mode = "read-only"',
  '',
].join('\n')
const repositoryRoot = fileURLToPath(new URL('../', import.meta.url))
const usage =
  'Usage: npm run dogfood -- --root /absolute/path/to/profile [--adopt-existing]'

type ProductDevelopmentStarter = (options: {
  readonly arguments: readonly string[]
  readonly environment: NodeJS.ProcessEnv
}) => Promise<void>

export type DogfoodProfile = {
  readonly appDataRoot: string
  readonly authState: 'missing' | 'ready'
  readonly codexHome: string
  readonly profileRoot: string
  readonly workspaceRoot: string
}

type DogfoodProfileLayout = Omit<DogfoodProfile, 'authState'>

export function resolveDogfoodArguments(arguments_: readonly string[]): {
  readonly adoptExisting: boolean
  readonly profileRoot: string
} {
  let adoptExisting = false
  let profileRoot: string | undefined
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index]
    if (argument === '--adopt-existing' && !adoptExisting) {
      adoptExisting = true
      continue
    }
    if (argument === '--root' && profileRoot === undefined) {
      profileRoot = arguments_[index + 1]
      index += 1
      continue
    }
    throw new Error(usage)
  }
  if (!profileRoot) throw new Error(usage)
  if (!path.isAbsolute(profileRoot)) {
    throw new Error('Dogfood requires an absolute profile root')
  }
  return { adoptExisting, profileRoot }
}

export async function runDogfood(options: {
  readonly arguments: readonly string[]
  readonly environment: NodeJS.ProcessEnv
  readonly log?: (message: string) => void
  readonly packageRoot: string
  readonly startProductDevelopment?: ProductDevelopmentStarter
}): Promise<void> {
  const selected = resolveDogfoodArguments(options.arguments)
  const profile = await prepareDogfoodProfile({
    adoptExisting: selected.adoptExisting,
    packageRoot: options.packageRoot,
    profileRoot: selected.profileRoot,
  })
  const log = options.log ?? console.log
  log(`Dogfood profile: ${profile.profileRoot}`)
  log(`SemesterWorkspace: ${profile.workspaceRoot} (persistent)`)
  log(`Product app data: ${profile.appDataRoot} (persistent)`)
  if (profile.authState === 'missing') {
    throw new Error(authenticationGuidance(profile, options.packageRoot))
  }
  await (options.startProductDevelopment ?? runProductDevelopment)({
    arguments: ['--app-data-root', profile.appDataRoot],
    environment: {
      ...options.environment,
      CODEX_CHAT_WORKSPACE: profile.workspaceRoot,
    },
  })
}

export async function prepareDogfoodProfile(options: {
  readonly adoptExisting?: boolean
  readonly packageRoot: string
  readonly profileRoot: string
}): Promise<DogfoodProfile> {
  if (
    !path.isAbsolute(options.packageRoot) ||
    !path.isAbsolute(options.profileRoot)
  ) {
    throw new TypeError('Dogfood roots must be absolute directories')
  }
  const packageRoot = await canonicalDirectory(
    options.packageRoot,
    'package root',
  )
  const profileRoot = await canonicalCandidatePath(options.profileRoot)
  assertProductRootsDoNotOverlap(packageRoot, profileRoot)

  const existing = await pathExists(profileRoot)
  if (existing) {
    const markerPath = path.join(profileRoot, profileMarkerName)
    if (!(await pathExists(markerPath))) {
      if (!options.adoptExisting) {
        throw new Error('Dogfood profile ownership marker is missing')
      }
      await adoptExistingProfile(profileRoot)
    } else {
      await verifyOwnedProfile(profileRoot)
    }
  } else {
    await initializeProfile(profileRoot, packageRoot)
  }

  const canonicalProfileRoot = await canonicalDirectory(
    profileRoot,
    'dogfood profile root',
  )
  const layout = resolveProfileLayout(canonicalProfileRoot)
  await Promise.all([
    canonicalDirectory(layout.appDataRoot, 'dogfood app data root'),
    secureDirectory(layout.codexHome, 'dogfood Codex home'),
    canonicalDirectory(layout.workspaceRoot, 'dogfood SemesterWorkspace'),
    secureRegularFile(
      path.join(layout.codexHome, 'config.toml'),
      'config.toml',
    ),
  ])

  return {
    ...layout,
    authState: await resolveAuthState(layout.codexHome),
  }
}

async function initializeProfile(
  profileRoot: string,
  packageRoot: string,
): Promise<void> {
  await mkdir(profileRoot, { mode: 0o700 })
  const canonicalProfileRoot = await realpath(profileRoot)
  const layout = resolveProfileLayout(canonicalProfileRoot)
  const sampleWorkspaceRoot = path.join(
    packageRoot,
    'apps/chat-shell/e2e/fixtures/first-assignment-semester-workspace',
  )
  await mkdir(layout.codexHome, { mode: 0o700, recursive: true })
  await cp(sampleWorkspaceRoot, layout.workspaceRoot, {
    errorOnExist: true,
    force: false,
    recursive: true,
  })
  await writeFile(path.join(layout.codexHome, 'config.toml'), codexConfig, {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o600,
  })
  await writeOwnershipMarker(canonicalProfileRoot)
}

async function adoptExistingProfile(profileRoot: string): Promise<void> {
  const canonicalProfileRoot = await canonicalDirectory(
    profileRoot,
    'dogfood profile root',
  )
  const layout = resolveProfileLayout(canonicalProfileRoot)
  await Promise.all([
    canonicalDirectory(
      layout.appDataRoot,
      'dogfood app data root',
    ),
    secureDirectory(layout.codexHome, 'dogfood Codex home'),
    canonicalDirectory(
      layout.workspaceRoot,
      'dogfood SemesterWorkspace',
    ),
    secureRegularFile(
      path.join(layout.codexHome, 'config.toml'),
      'config.toml',
    ),
  ])
  await resolveAuthState(layout.codexHome)
  await writeOwnershipMarker(canonicalProfileRoot)
}

function resolveProfileLayout(profileRoot: string): DogfoodProfileLayout {
  const appDataRoot = path.join(profileRoot, 'app-data')
  return {
    appDataRoot,
    codexHome: path.join(appDataRoot, 'runtime/codex-home'),
    profileRoot,
    workspaceRoot: path.join(profileRoot, 'semester-workspace'),
  }
}

async function writeOwnershipMarker(profileRoot: string): Promise<void> {
  await writeFile(
    path.join(profileRoot, profileMarkerName),
    `${JSON.stringify(
      {
        formatVersion: 1,
        kind: profileMarkerKind,
        profileRoot,
      },
      null,
      2,
    )}\n`,
    { encoding: 'utf8', flag: 'wx', mode: 0o600 },
  )
}

async function verifyOwnedProfile(profileRoot: string): Promise<void> {
  const canonicalProfileRoot = await canonicalDirectory(
    profileRoot,
    'dogfood profile root',
  )
  let marker: unknown
  try {
    await secureRegularFile(
      path.join(canonicalProfileRoot, profileMarkerName),
      'Dogfood profile ownership marker',
    )
    marker = JSON.parse(
      await readFile(path.join(canonicalProfileRoot, profileMarkerName), 'utf8'),
    )
  } catch {
    throw new Error('Dogfood profile ownership marker is missing')
  }
  if (
    typeof marker !== 'object' ||
    marker === null ||
    Array.isArray(marker) ||
    !('formatVersion' in marker) ||
    marker.formatVersion !== 1 ||
    !('kind' in marker) ||
    marker.kind !== profileMarkerKind ||
    !('profileRoot' in marker) ||
    marker.profileRoot !== canonicalProfileRoot
  ) {
    throw new Error('Dogfood profile ownership marker is invalid')
  }
}

async function resolveAuthState(
  codexHome: string,
): Promise<DogfoodProfile['authState']> {
  const authPath = path.join(codexHome, 'auth.json')
  if (!(await pathExists(authPath))) return 'missing'
  await secureRegularFile(authPath, 'auth.json')
  return 'ready'
}

async function secureDirectory(
  directory: string,
  label: string,
): Promise<string> {
  const canonical = await canonicalDirectory(directory, label)
  const stats = await lstat(directory)
  if ((stats.mode & 0o077) !== 0) {
    throw new TypeError(`${label} must be owner-only`)
  }
  return canonical
}

async function secureRegularFile(file: string, label: string): Promise<void> {
  const stats = await lstat(file)
  if (
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    (stats.mode & 0o077) !== 0
  ) {
    throw new TypeError(`${label} must be an owner-only regular file`)
  }
  await access(file, constants.R_OK)
}

function authenticationGuidance(
  profile: DogfoodProfile,
  packageRoot: string,
): string {
  const codexExecutable = path.join(
    packageRoot,
    'packages/codex-chat-runtime/.artifacts/production-runtime-darwin-arm64/bundle/site-packages/codex_cli_bin/bin/codex',
  )
  return [
    'Dogfood Codex authentication is missing.',
    'Log in to this isolated profile, then rerun dogfood:',
    `CODEX_HOME=${shellQuote(profile.codexHome)} ${shellQuote(codexExecutable)} login --device-auth`,
    `npm run dogfood -- --root ${shellQuote(profile.profileRoot)}`,
  ].join('\n')
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`
}

async function canonicalDirectory(
  directory: string,
  label: string,
): Promise<string> {
  const stats = await lstat(directory)
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new TypeError(`${label} must be a non-symlink directory`)
  }
  await access(directory, constants.R_OK | constants.X_OK)
  return realpath(directory)
}

async function canonicalCandidatePath(candidate: string): Promise<string> {
  const parent = await realpath(path.dirname(path.resolve(candidate)))
  const stats = await lstat(parent)
  if (!stats.isDirectory()) {
    throw new TypeError('Dogfood profile parent must be a directory')
  }
  await access(parent, constants.R_OK | constants.W_OK | constants.X_OK)
  return path.join(parent, path.basename(path.resolve(candidate)))
}

async function pathExists(candidate: string): Promise<boolean> {
  try {
    await lstat(candidate)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runDogfood({
    arguments: process.argv.slice(2),
    environment: process.env,
    packageRoot: repositoryRoot,
  }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
