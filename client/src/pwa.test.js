import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

const publicPath = resolve(process.cwd(), 'public')

test('PWA is installable and never caches API responses', async () => {
  const manifest = JSON.parse(
    await readFile(resolve(publicPath, 'manifest.webmanifest'), 'utf8'),
  )
  const worker = await readFile(resolve(publicPath, 'sw.js'), 'utf8')

  expect(manifest.display).toBe('standalone')
  expect(manifest.icons.map(({ sizes }) => sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  )
  expect(worker).toContain("url.pathname.startsWith('/api/')")
})
