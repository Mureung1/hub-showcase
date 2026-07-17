import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const workspaceRoot = fileURLToPath(new URL('../', import.meta.url))
const activeMarkdownPaths = [
  'AGENTS.md',
  'CONTEXT.md',
  'README.md',
  'apps/chat-shell/README.md',
  'apps/server/README.md',
  'artifacts/camp-demo/README.md',
  'artifacts/camp-demo/speaker-notes.md',
  'docs/README.md',
  'docs/adr/0002-use-first-class-academic-objects-with-derived-operational-views.md',
  'docs/adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md',
  'docs/adr/0006-separate-package-app-data-and-semester-workspace-roots.md',
  'docs/adr/0007-use-native-codex-composition-for-product-actions.md',
  'docs/adr/0009-use-a-macos-first-local-web-app-product-path.md',
  'docs/adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md',
  'docs/adr/0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md',
  'docs/agents/domain.md',
  'docs/agents/issue-tracker.md',
  'docs/agents/triage-labels.md',
  'docs/architecture/codex-chat-implementation-map.md',
  'docs/architecture/codex-native-product-composition.md',
  'docs/architecture/codex-runtime-isolation.md',
  'docs/product/ay-ple-design-system.md',
  'docs/product/ay-ple-development-backlog.md',
  'docs/product/ay-ple-overview.md',
  'docs/product/ay-ple-product-brief.md',
  'docs/product/ay-ple-review-workspace-scenario.md',
  'packages/codex-chat-runtime/README.md',
  'references/README.md',
] as const
const deletedCurrentTargets = [
  'apps/inspector',
  'docs/architecture/codex-app-server-method-inventory.md',
  'docs/architecture/runtime-harness-implementation-map.md',
  'packages/runtime-codex',
  'packages/runtime-core',
  'packages/runtime-fake',
  'spikes/codex-runtime-ownership',
] as const
const markdownLinkPattern = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+['"][^'"]*['"])?\)/g
const htmlLinkPattern = /\b(?:href|src)\s*=\s*['"]([^'"]+)['"]/gi

async function main(): Promise<void> {
  const errors: string[] = []

  for (const relativeDocumentPath of activeMarkdownPaths) {
    const documentPath = path.join(workspaceRoot, relativeDocumentPath)
    if (!(await exists(documentPath))) {
      errors.push(`${relativeDocumentPath}: active document is missing`)
      continue
    }

    const contents = await readFile(documentPath, 'utf8')
    for (const target of extractLinkTargets(contents)) {
      if (isExternalOrAnchor(target)) continue

      const decodedTarget = decodeURIComponent(target.split(/[?#]/, 1)[0] ?? '')
      if (!decodedTarget) continue
      const resolvedTarget = path.resolve(path.dirname(documentPath), decodedTarget)
      const repositoryRelativeTarget = path
        .relative(workspaceRoot, resolvedTarget)
        .split(path.sep)
        .join('/')

      if (
        repositoryRelativeTarget.startsWith('../') ||
        path.isAbsolute(repositoryRelativeTarget)
      ) {
        errors.push(
          `${relativeDocumentPath}: link escapes repository: ${target}`,
        )
        continue
      }
      if (
        deletedCurrentTargets.some(
          (deletedTarget) =>
            repositoryRelativeTarget === deletedTarget ||
            repositoryRelativeTarget.startsWith(`${deletedTarget}/`),
        )
      ) {
        errors.push(
          `${relativeDocumentPath}: active link targets deleted owner: ${target}`,
        )
        continue
      }
      if (!(await exists(resolvedTarget))) {
        errors.push(`${relativeDocumentPath}: missing link target: ${target}`)
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'))
  }
  console.log(`active documentation links: green (${activeMarkdownPaths.length})`)
}

function extractLinkTargets(contents: string): string[] {
  return [markdownLinkPattern, htmlLinkPattern].flatMap((pattern) =>
    [...contents.matchAll(pattern)].flatMap((match) =>
      match[1] ? [match[1]] : [],
    ),
  )
}

function isExternalOrAnchor(target: string): boolean {
  return (
    target.startsWith('#') ||
    target.startsWith('/') ||
    /^[a-z][a-z\d+.-]*:/i.test(target)
  )
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath)
    return true
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return false
    }
    throw error
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
