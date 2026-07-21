import { createHash, randomUUID } from 'node:crypto'
import { constants as fsConstants } from 'node:fs'
import { lstat, mkdir, open, realpath, rename, rm } from 'node:fs/promises'
import path from 'node:path'

import {
  FIRST_ASSIGNMENT_ARGUMENTS,
  FIRST_ASSIGNMENT_RECIPE_VERSION,
} from '@ay-ple/product-contract'

export const FIRST_ASSIGNMENT_RECIPE_NAME = 'first-assignment'
export const FIRST_ASSIGNMENT_SKILL_NAME = 'ay-ple-first-assignment'

const recipeBody = `---
name: ${FIRST_ASSIGNMENT_SKILL_NAME}
description: Extract one evidence-linked Assignment proposal from exactly two AY-PLE source snapshots.
---

# First Assignment modeling

Work only from the two source snapshots named in the request. Treat them as read-only evidence.
Do not use or modify the student's original files or AY-PLE product state.

Identify one Assignment with a title, an RFC 3339 due time with an explicit UTC offset,
and a submission method. Every field must cite an exact quote from one of the two selected
RawMaterials. Do not infer an ambiguous date or time.

Call the AY-PLE MCP tool \`propose_state_patch\` with the exact requestKey, workspaceId,
courseId, baseRevision, Assignment upsert, and evidence references supplied by the request.
Complete this sequence in the same Turn without stopping early:

1. Read both source snapshots and identify the exact evidence. Use command or Python tools when
   useful, but write only under the supplied scratch directory.
2. For each requestKey/attempt, call \`propose_state_patch\` exactly once with the
   evidence-backed Assignment proposal. Never reuse a requestKey for another attempt.
3. After the proposal succeeds, emit one \`<proposed_plan>...</proposed_plan>\` block that says
   the proposal is ready for application Review.
4. Immediately call the built-in \`request_user_input\` tool with exactly the review question
   fields supplied by the application, then wait for the application response.
5. If the application requests a revision, use the fresh replacement requestKey in its response
   for one new attempt. Repeat the MCP -> Plan -> Review sequence in this same Turn; do not
   finish or reuse the previous requestKey. Continue until the application reports a settled
   accepted or rejected Review.
6. After the Review settles, finish with a short result message in this same Turn.

Do not replace either tool call with prose and do not finish while a revision attempt or Review
is pending. The application, not the model or filesystem, owns confirmed-state changes.
`

const recipeDirectorySegments = [
  'modeling-recipes',
  FIRST_ASSIGNMENT_RECIPE_NAME,
  FIRST_ASSIGNMENT_RECIPE_VERSION,
] as const

export type ManagedAssignmentRecipe = {
  readonly name: typeof FIRST_ASSIGNMENT_RECIPE_NAME
  readonly version: typeof FIRST_ASSIGNMENT_RECIPE_VERSION
  readonly requestedSkillName: typeof FIRST_ASSIGNMENT_SKILL_NAME
  readonly path: string
  readonly digest: string
}

export async function materializeManagedAssignmentRecipe(
  appDataRoot: string,
): Promise<ManagedAssignmentRecipe> {
  try {
    const managedPaths = await resolveManagedRecipePaths(appDataRoot, true)
    const expected = Buffer.from(recipeBody, 'utf8')
    let existing: Buffer | undefined
    try {
      await lstat(managedPaths.recipePath)
      existing = await readManagedRecipe(managedPaths)
    } catch (error) {
      if (!isMissing(error)) throw error
    }
    if (existing === undefined) {
      const temporaryPath = path.join(
        managedPaths.recipeDirectory,
        `.SKILL.md.${randomUUID()}.tmp`,
      )
      try {
        const handle = await open(
          temporaryPath,
          fsConstants.O_CREAT |
            fsConstants.O_EXCL |
            fsConstants.O_WRONLY |
            fsConstants.O_NOFOLLOW,
          0o600,
        )
        try {
          await handle.writeFile(expected)
        } finally {
          await handle.close()
        }
        await assertManagedRecipeDirectories(managedPaths)
        await rename(temporaryPath, managedPaths.recipePath)
      } finally {
        await rm(temporaryPath, { force: true })
      }
      existing = await readManagedRecipe(managedPaths)
    }
    if (!existing.equals(expected)) {
      throw new ManagedAssignmentRecipeError('recipe_digest_mismatch')
    }
    return {
      name: FIRST_ASSIGNMENT_RECIPE_NAME,
      version: FIRST_ASSIGNMENT_RECIPE_VERSION,
      requestedSkillName: FIRST_ASSIGNMENT_SKILL_NAME,
      path: managedPaths.recipePath,
      digest: sha256(expected),
    }
  } catch (error) {
    if (error instanceof ManagedAssignmentRecipeError) throw error
    throw new ManagedAssignmentRecipeError('recipe_unavailable')
  }
}

export async function verifyManagedAssignmentRecipe(
  recipe: ManagedAssignmentRecipe,
  appDataRoot: string,
): Promise<void> {
  let bytes: Buffer
  try {
    const managedPaths = await resolveManagedRecipePaths(appDataRoot, false)
    if (path.resolve(recipe.path) !== managedPaths.recipePath) {
      throw new ManagedAssignmentRecipeError('recipe_unavailable')
    }
    bytes = await readManagedRecipe(managedPaths)
  } catch {
    throw new ManagedAssignmentRecipeError('recipe_unavailable')
  }
  if (sha256(bytes) !== recipe.digest || !bytes.equals(Buffer.from(recipeBody))) {
    throw new ManagedAssignmentRecipeError('recipe_digest_mismatch')
  }
}

export class ManagedAssignmentRecipeError extends Error {
  readonly code: 'recipe_digest_mismatch' | 'recipe_unavailable'

  constructor(code: ManagedAssignmentRecipeError['code']) {
    super(code)
    this.name = 'ManagedAssignmentRecipeError'
    this.code = code
  }
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

type ManagedRecipePaths = {
  readonly canonicalAppDataRoot: string
  readonly recipeDirectory: string
  readonly recipePath: string
}

async function resolveManagedRecipePaths(
  appDataRoot: string,
  createDirectories: boolean,
): Promise<ManagedRecipePaths> {
  if (!path.isAbsolute(appDataRoot)) {
    throw new ManagedAssignmentRecipeError('recipe_unavailable')
  }
  const rootStats = await lstat(appDataRoot)
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
    throw new ManagedAssignmentRecipeError('recipe_unavailable')
  }
  const canonicalAppDataRoot = await realpath(appDataRoot)
  let candidate = appDataRoot
  for (let index = 0; index < recipeDirectorySegments.length; index += 1) {
    candidate = path.join(candidate, recipeDirectorySegments[index]!)
    if (createDirectories) {
      try {
        await mkdir(candidate, { mode: 0o700 })
      } catch (error) {
        if (!hasErrnoCode(error, 'EEXIST')) throw error
      }
    }
    const stats = await lstat(candidate)
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw new ManagedAssignmentRecipeError('recipe_unavailable')
    }
    const expectedCanonical = path.join(
      canonicalAppDataRoot,
      ...recipeDirectorySegments.slice(0, index + 1),
    )
    if ((await realpath(candidate)) !== expectedCanonical) {
      throw new ManagedAssignmentRecipeError('recipe_unavailable')
    }
  }
  const recipeDirectory = path.join(
    canonicalAppDataRoot,
    ...recipeDirectorySegments,
  )
  return {
    canonicalAppDataRoot,
    recipeDirectory,
    recipePath: path.join(recipeDirectory, 'SKILL.md'),
  }
}

async function assertManagedRecipeDirectories(
  managedPaths: ManagedRecipePaths,
): Promise<void> {
  const checked = await resolveManagedRecipePaths(
    managedPaths.canonicalAppDataRoot,
    false,
  )
  if (
    checked.recipeDirectory !== managedPaths.recipeDirectory ||
    checked.recipePath !== managedPaths.recipePath
  ) {
    throw new ManagedAssignmentRecipeError('recipe_unavailable')
  }
}

async function readManagedRecipe(
  managedPaths: ManagedRecipePaths,
): Promise<Buffer> {
  await assertManagedRecipeDirectories(managedPaths)
  const stats = await lstat(managedPaths.recipePath)
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new ManagedAssignmentRecipeError('recipe_unavailable')
  }
  if ((await realpath(managedPaths.recipePath)) !== managedPaths.recipePath) {
    throw new ManagedAssignmentRecipeError('recipe_unavailable')
  }
  const handle = await open(
    managedPaths.recipePath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  )
  try {
    const openedStats = await handle.stat()
    if (!openedStats.isFile()) {
      throw new ManagedAssignmentRecipeError('recipe_unavailable')
    }
    return await handle.readFile()
  } finally {
    await handle.close()
  }
}

function isMissing(error: unknown): boolean {
  return hasErrnoCode(error, 'ENOENT')
}

function hasErrnoCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  )
}
