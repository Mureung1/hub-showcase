import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  WorkspaceSourceProjectionError,
  createWorkspaceSourceProjection,
} from './workspace-source-projection.js'

test('source projection lists only bounded user material in relative path order', async () => {
  const fixture = await createFixture('source-projection-list-')
  try {
    await mkdir(path.join(fixture.root, '과목', 'week-01'), {
      recursive: true,
    })
    await mkdir(path.join(fixture.root, '.agents'), { recursive: true })
    await mkdir(path.join(fixture.root, 'node_modules', 'package'), {
      recursive: true,
    })
    await writeFile(path.join(fixture.root, '과목', 'week-01', '안내.md'), '안내')
    await writeFile(path.join(fixture.root, 'lecture.pdf'), '%PDF-1.4\n%%EOF')
    await writeFile(path.join(fixture.root, 'slides.pptx'), 'slides')
    await writeFile(path.join(fixture.root, '.env.local'), 'TOKEN=secret')
    await writeFile(path.join(fixture.root, 'credentials.json'), '{}')
    await writeFile(path.join(fixture.root, 'AGENTS.md'), '# instructions')
    await writeFile(path.join(fixture.root, 'workspace-state.json'), '{}')
    await writeFile(path.join(fixture.root, '.agents', 'SKILL.md'), 'managed')
    await writeFile(
      path.join(fixture.root, 'node_modules', 'package', 'index.js'),
      'managed',
    )
    await writeFile(path.join(fixture.outside, 'outside.txt'), 'outside')
    await symlink(
      path.join(fixture.outside, 'outside.txt'),
      path.join(fixture.root, 'outside-link.txt'),
    )
    await symlink(
      fixture.outside,
      path.join(fixture.root, 'outside-directory'),
    )

    const projection = await createWorkspaceSourceProjection({
      workspaceRoot: fixture.root,
    })

    assert.deepEqual(await projection.list(), {
      sources: [
        {
          relativePath: 'lecture.pdf',
          size: 14,
          previewKind: 'pdf',
        },
        {
          relativePath: 'slides.pptx',
          size: 6,
          previewKind: 'unsupported',
        },
        {
          relativePath: '과목/week-01/안내.md',
          size: Buffer.byteLength('안내'),
          previewKind: 'text',
        },
      ],
    })
  } finally {
    await fixture.cleanup()
  }
})

test('text projection returns a bounded UTF-8 preview with a full-file digest', async () => {
  const fixture = await createFixture('source-projection-text-')
  try {
    const text = '가나다라마바사'
    const bytes = Buffer.from(text)
    await writeFile(path.join(fixture.root, 'notes.txt'), bytes)
    const projection = await createWorkspaceSourceProjection({
      workspaceRoot: fixture.root,
      limits: {
        textPreviewMaxBytes: 10,
        textSourceMaxBytes: 1024,
      },
    })

    assert.deepEqual(await projection.readText('notes.txt'), {
      relativePath: 'notes.txt',
      digest: createHash('sha256').update(bytes).digest('hex'),
      text: '가나다',
      truncated: true,
    })
  } finally {
    await fixture.cleanup()
  }
})

test('source reads reject traversal, hidden targets, symlinks, and binary text', async () => {
  const fixture = await createFixture('source-projection-safety-')
  try {
    await writeFile(path.join(fixture.outside, 'outside.txt'), 'outside')
    await symlink(
      path.join(fixture.outside, 'outside.txt'),
      path.join(fixture.root, 'outside-link.txt'),
    )
    await writeFile(path.join(fixture.root, '.secret.txt'), 'secret')
    await writeFile(
      path.join(fixture.root, 'binary.txt'),
      Buffer.from([0xff, 0xfe, 0xfd]),
    )
    const projection = await createWorkspaceSourceProjection({
      workspaceRoot: fixture.root,
    })

    for (const relativePath of [
      '../outside/outside.txt',
      '/etc/passwd',
      '.secret.txt',
      'outside-link.txt',
    ]) {
      await assert.rejects(
        projection.readText(relativePath),
        (error: unknown) =>
          error instanceof WorkspaceSourceProjectionError &&
          (error.code === 'invalid_path' ||
            error.code === 'source_not_found'),
        relativePath,
      )
    }
    await assert.rejects(
      projection.readText('binary.txt'),
      (error: unknown) =>
        error instanceof WorkspaceSourceProjectionError &&
        error.code === 'unsupported_encoding',
    )
  } finally {
    await fixture.cleanup()
  }
})

test('PDF projection validates format and enforces its byte bound', async () => {
  const fixture = await createFixture('source-projection-pdf-')
  try {
    const pdf = Buffer.from('%PDF-1.7\ncontent\n%%EOF')
    await writeFile(path.join(fixture.root, 'valid.pdf'), pdf)
    await writeFile(path.join(fixture.root, 'fake.pdf'), 'not a PDF')
    await writeFile(
      path.join(fixture.root, 'large.pdf'),
      '%PDF-123456789012345678901234567890',
    )
    const projection = await createWorkspaceSourceProjection({
      workspaceRoot: fixture.root,
      limits: { pdfMaxBytes: pdf.byteLength },
    })

    const result = await projection.readPdf('valid.pdf')
    assert.deepEqual(result.bytes, pdf)
    assert.equal(
      result.digest,
      createHash('sha256').update(pdf).digest('hex'),
    )
    await assert.rejects(
      projection.readPdf('fake.pdf'),
      (error: unknown) =>
        error instanceof WorkspaceSourceProjectionError &&
        error.code === 'invalid_pdf',
    )
    await assert.rejects(
      projection.readPdf('large.pdf'),
      (error: unknown) =>
        error instanceof WorkspaceSourceProjectionError &&
        error.code === 'source_too_large',
    )
  } finally {
    await fixture.cleanup()
  }
})

test('source listing fails visibly when entry or depth bounds are exceeded', async () => {
  const fixture = await createFixture('source-projection-bounds-')
  try {
    await mkdir(path.join(fixture.root, 'one', 'two'), { recursive: true })
    await writeFile(path.join(fixture.root, 'first.txt'), 'first')
    await writeFile(path.join(fixture.root, 'second.txt'), 'second')
    await writeFile(path.join(fixture.root, 'one', 'two', 'deep.txt'), 'deep')

    const entryBound = await createWorkspaceSourceProjection({
      workspaceRoot: fixture.root,
      limits: { listMaxEntries: 1 },
    })
    await assert.rejects(
      entryBound.list(),
      (error: unknown) =>
        error instanceof WorkspaceSourceProjectionError &&
        error.code === 'scan_limit_exceeded',
    )

    const depthBound = await createWorkspaceSourceProjection({
      workspaceRoot: fixture.root,
      limits: { listMaxDepth: 1 },
    })
    await assert.rejects(
      depthBound.list(),
      (error: unknown) =>
        error instanceof WorkspaceSourceProjectionError &&
        error.code === 'scan_limit_exceeded',
    )
  } finally {
    await fixture.cleanup()
  }
})

async function createFixture(prefix: string): Promise<{
  readonly root: string
  readonly outside: string
  cleanup(): Promise<void>
}> {
  const parent = await mkdtemp(path.join(tmpdir(), prefix))
  const root = path.join(parent, 'workspace')
  const outside = path.join(parent, 'outside')
  await Promise.all([
    mkdir(root, { recursive: true }),
    mkdir(outside, { recursive: true }),
  ])
  return {
    root,
    outside,
    cleanup: () => rm(parent, { force: true, recursive: true }),
  }
}
