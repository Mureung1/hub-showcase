import { constants } from 'node:fs'
import { access, lstat, realpath } from 'node:fs/promises'
import path from 'node:path'

export async function canonicalProductDirectory(
  directory: string,
  label: string,
): Promise<string> {
  if (!path.isAbsolute(directory)) {
    throw new Error(`${label} must be an absolute directory`)
  }
  const stats = await lstat(directory)
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error(`${label} must be a non-symlink directory`)
  }
  try {
    await access(directory, constants.R_OK | constants.X_OK)
  } catch {
    throw new Error(`${label} must be a readable directory`)
  }
  return realpath(directory)
}

export async function productPathExists(candidate: string): Promise<boolean> {
  try {
    await lstat(candidate)
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
