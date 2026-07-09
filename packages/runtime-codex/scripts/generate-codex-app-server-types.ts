import { spawnSync } from 'node:child_process'
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolvePackageCodexBinPath } from '../src/raw-client.js'

const scriptPath = fileURLToPath(import.meta.url)
const packageRoot = resolve(dirname(scriptPath), '..')
const outputDir = join(
  packageRoot,
  'src',
  'internal',
  'codex-app-server-protocol',
  'generated',
)
const codexBinPath = resolvePackageCodexBinPath(packageRoot)

rmSync(outputDir, { recursive: true, force: true })

const result = spawnSync(
  codexBinPath,
  ['app-server', 'generate-ts', '--out', outputDir],
  {
    cwd: packageRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  },
)

if (result.error) {
  throw result.error
}

if (result.status !== 0) {
  const detail = [toOutput(result.stdout), toOutput(result.stderr)]
    .filter((part) => part.trim().length > 0)
    .join('\n')
  throw new Error(
    `codex app-server generate-ts exited with code ${result.status}${detail ? `\n${detail}` : ''}`,
  )
}

for (const filePath of listTypeScriptFiles(outputDir)) {
  const source = readFileSync(filePath, 'utf8')
  const rewritten = source.replaceAll(
    /(from\s+["'])(\.[^"']+)(["'])/g,
    (_match, prefix, importPath, suffix) =>
      `${prefix}${toNodeNextImportPath(filePath, importPath)}${suffix}`,
  )

  if (rewritten !== source) {
    writeFileSync(filePath, rewritten)
  }
}

console.log(`Generated Codex app-server protocol types in ${outputDir}`)

function listTypeScriptFiles(dir: string): string[] {
  const files: string[] = []

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...listTypeScriptFiles(fullPath))
      continue
    }

    if (entry.isFile() && fullPath.endsWith('.ts')) {
      files.push(fullPath)
    }
  }

  return files
}

function toNodeNextImportPath(filePath: string, importPath: string): string {
  if (importPath.endsWith('.js')) {
    return importPath
  }

  const targetPath = resolve(dirname(filePath), importPath)

  if (existsSync(`${targetPath}.ts`)) {
    return `${importPath}.js`
  }

  if (existsSync(targetPath) && statSync(targetPath).isDirectory()) {
    return `${importPath}/index.js`
  }

  if (existsSync(join(targetPath, 'index.ts'))) {
    return `${importPath}/index.js`
  }

  return `${importPath}.js`
}

function toOutput(value: string | Buffer | null): string {
  if (typeof value === 'string') {
    return value
  }

  return value?.toString('utf8') ?? ''
}
