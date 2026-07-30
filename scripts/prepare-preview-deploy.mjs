import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const previewDirectory = path.join(repoRoot, 'dist-preview')

await fs.copyFile(
  path.join(previewDirectory, 'preview.html'),
  path.join(previewDirectory, 'index.html'),
)
