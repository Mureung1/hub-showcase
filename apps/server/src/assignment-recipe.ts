import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const FIRST_ASSIGNMENT_RECIPE_NAME = 'first-assignment'
export const FIRST_ASSIGNMENT_RECIPE_VERSION = '1'
export const FIRST_ASSIGNMENT_SKILL_NAME = 'ay-ple-first-assignment'
export const FIRST_ASSIGNMENT_ARGUMENTS = {
  timezone: 'Asia/Seoul',
} as const

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
After a successful proposal, ask exactly the AY-PLE Assignment Review question provided by
the application. The application, not the model or filesystem, owns confirmed-state changes.
`

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
  const recipeDirectory = path.join(
    appDataRoot,
    'modeling-recipes',
    FIRST_ASSIGNMENT_RECIPE_NAME,
    FIRST_ASSIGNMENT_RECIPE_VERSION,
  )
  const recipePath = path.join(recipeDirectory, 'SKILL.md')
  await mkdir(recipeDirectory, { recursive: true, mode: 0o700 })
  let existing: Buffer | undefined
  try {
    existing = await readFile(recipePath)
  } catch (error) {
    if (!isMissing(error)) throw error
  }
  const expected = Buffer.from(recipeBody, 'utf8')
  if (existing === undefined) {
    const temporaryPath = path.join(
      recipeDirectory,
      `.SKILL.md.${randomUUID()}.tmp`,
    )
    try {
      await writeFile(temporaryPath, expected, { flag: 'wx', mode: 0o600 })
      await rename(temporaryPath, recipePath)
    } finally {
      await rm(temporaryPath, { force: true })
    }
  } else if (!existing.equals(expected)) {
    throw new ManagedAssignmentRecipeError('recipe_digest_mismatch')
  }
  return {
    name: FIRST_ASSIGNMENT_RECIPE_NAME,
    version: FIRST_ASSIGNMENT_RECIPE_VERSION,
    requestedSkillName: FIRST_ASSIGNMENT_SKILL_NAME,
    path: recipePath,
    digest: sha256(expected),
  }
}

export async function verifyManagedAssignmentRecipe(
  recipe: ManagedAssignmentRecipe,
): Promise<void> {
  let bytes: Buffer
  try {
    bytes = await readFile(recipe.path)
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

function isMissing(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  )
}
