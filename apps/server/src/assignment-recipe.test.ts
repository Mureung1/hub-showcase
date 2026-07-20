import assert from 'node:assert/strict'
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  ManagedAssignmentRecipeError,
  materializeManagedAssignmentRecipe,
  verifyManagedAssignmentRecipe,
} from './assignment-recipe.js'

test('managed Assignment Recipe materializes and verifies below app data', async () => {
  const fixture = await createFixture()
  try {
    const recipe = await materializeManagedAssignmentRecipe(fixture.appDataRoot)

    assert.equal(
      recipe.path,
      path.join(
        await realpath(fixture.appDataRoot),
        'modeling-recipes',
        'first-assignment',
        '1',
        'SKILL.md',
      ),
    )
    await verifyManagedAssignmentRecipe(recipe, fixture.appDataRoot)
  } finally {
    await fixture.cleanup()
  }
})

test('managed Assignment Recipe rejects a symlinked parent without writing outside app data', async () => {
  const fixture = await createFixture()
  try {
    const externalRoot = path.join(fixture.testRoot, 'external')
    await mkdir(externalRoot)
    await symlink(
      externalRoot,
      path.join(fixture.appDataRoot, 'modeling-recipes'),
      'dir',
    )

    await assertRecipeUnavailable(() =>
      materializeManagedAssignmentRecipe(fixture.appDataRoot),
    )
    assert.deepEqual(await readFileNames(externalRoot), [])
  } finally {
    await fixture.cleanup()
  }
})

test('managed Assignment Recipe verification rejects a parent replaced by a symlink', async () => {
  const fixture = await createFixture()
  try {
    const recipe = await materializeManagedAssignmentRecipe(fixture.appDataRoot)
    const recipeRoot = path.join(fixture.appDataRoot, 'modeling-recipes')
    const displacedRoot = path.join(fixture.testRoot, 'displaced-recipes')
    await rename(recipeRoot, displacedRoot)
    await symlink(displacedRoot, recipeRoot, 'dir')

    await assertRecipeUnavailable(() =>
      verifyManagedAssignmentRecipe(recipe, fixture.appDataRoot),
    )
  } finally {
    await fixture.cleanup()
  }
})

test('managed Assignment Recipe rejects a leaf symlink with exact Recipe bytes', async () => {
  const fixture = await createFixture()
  try {
    const recipe = await materializeManagedAssignmentRecipe(fixture.appDataRoot)
    const exactBytes = await readFile(recipe.path)
    const externalRecipe = path.join(fixture.testRoot, 'external-SKILL.md')
    await writeFile(externalRecipe, exactBytes)
    await rm(recipe.path)
    await symlink(externalRecipe, recipe.path, 'file')

    await assertRecipeUnavailable(() =>
      verifyManagedAssignmentRecipe(recipe, fixture.appDataRoot),
    )
    await assertRecipeUnavailable(() =>
      materializeManagedAssignmentRecipe(fixture.appDataRoot),
    )
    assert.deepEqual(await readFile(externalRecipe), exactBytes)
  } finally {
    await fixture.cleanup()
  }
})

async function createFixture() {
  const testRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-assignment-recipe-test-'),
  )
  const appDataRoot = path.join(testRoot, 'app-data')
  await mkdir(appDataRoot)
  return {
    testRoot,
    appDataRoot,
    cleanup: () => rm(testRoot, { force: true, recursive: true }),
  }
}

async function readFileNames(directory: string): Promise<string[]> {
  return readdir(directory)
}

async function assertRecipeUnavailable(
  operation: () => Promise<unknown>,
): Promise<void> {
  await assert.rejects(operation, (error: unknown) => {
    return (
      error instanceof ManagedAssignmentRecipeError &&
      error.code === 'recipe_unavailable'
    )
  })
}
