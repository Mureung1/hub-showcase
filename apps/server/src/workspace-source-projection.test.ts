import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  mkdir,
  mkdtemp,
  rename,
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
    await mkdir(path.join(fixture.root, 'secrets'), { recursive: true })
    await mkdir(path.join(fixture.root, 'course', 'oauth'), {
      recursive: true,
    })
    for (const secretDirectory of [
      'api-keys',
      'api_keys-development',
      'client_secret',
      'credentials-prod',
      'secrets.prod',
      'service-account',
      'private-key',
      'oauth-token',
      'refresh_token',
      'tokens',
      'tokens-backup',
    ]) {
      await mkdir(path.join(fixture.root, 'course', secretDirectory), {
        recursive: true,
      })
      await writeFile(
        path.join(
          fixture.root,
          'course',
          secretDirectory,
          'config.json',
        ),
        '{}',
      )
    }
    await mkdir(path.join(fixture.root, 'node_modules', 'package'), {
      recursive: true,
    })
    await writeFile(path.join(fixture.root, '과목', 'week-01', '안내.md'), '안내')
    await writeFile(path.join(fixture.root, 'lecture.pdf'), '%PDF-1.4\n%%EOF')
    await writeFile(path.join(fixture.root, 'slides.pptx'), 'slides')
    await writeFile(path.join(fixture.root, '.env.local'), 'TOKEN=secret')
    await writeFile(path.join(fixture.root, 'credentials.json'), '{}')
    await writeFile(path.join(fixture.root, 'credentials-prod.json'), '{}')
    await writeFile(path.join(fixture.root, 'credentials.prod.json'), '{}')
    await writeFile(path.join(fixture.root, 'api_keys-local.yaml'), 'key: secret')
    await writeFile(path.join(fixture.root, 'api-keys.local.yaml'), 'key: secret')
    await writeFile(path.join(fixture.root, 'client_secret.json'), '{}')
    await writeFile(path.join(fixture.root, 'client_secret.json.bak'), '{}')
    await writeFile(path.join(fixture.root, 'service-account.json'), '{}')
    await writeFile(path.join(fixture.root, 'private-key.json'), '{}')
    await writeFile(path.join(fixture.root, 'refresh_token.txt'), 'secret')
    await writeFile(path.join(fixture.root, 'tokens-staging.txt'), 'secret')
    await writeFile(
      path.join(fixture.root, 'secrets', 'config.json'),
      '{}',
    )
    await writeFile(
      path.join(fixture.root, 'course', 'oauth', 'config.json'),
      '{}',
    )
    await writeFile(
      path.join(fixture.root, 'course', 'oauth', 'lecture-notes.md'),
      'OAuth 강의',
    )
    await writeFile(path.join(fixture.root, 'oauth.json'), '{}')
    await writeFile(
      path.join(fixture.root, 'tokenization-notes.md'),
      '학습 자료',
    )
    await writeFile(
      path.join(fixture.root, 'private-key-cryptography-notes.md'),
      '암호학 자료',
    )
    await writeFile(
      path.join(fixture.root, 'credentials-and-identity-notes.md'),
      '인증 강의',
    )
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
          relativePath: 'course/oauth/config.json',
          size: 2,
          previewKind: 'text',
        },
        {
          relativePath: 'course/oauth/lecture-notes.md',
          size: Buffer.byteLength('OAuth 강의'),
          previewKind: 'text',
        },
        {
          relativePath: 'credentials-and-identity-notes.md',
          size: Buffer.byteLength('인증 강의'),
          previewKind: 'text',
        },
        {
          relativePath: 'lecture.pdf',
          size: 14,
          previewKind: 'pdf',
        },
        {
          relativePath: 'private-key-cryptography-notes.md',
          size: Buffer.byteLength('암호학 자료'),
          previewKind: 'text',
        },
        {
          relativePath: 'slides.pptx',
          size: 6,
          previewKind: 'unsupported',
        },
        {
          relativePath: 'tokenization-notes.md',
          size: Buffer.byteLength('학습 자료'),
          previewKind: 'text',
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

test('action source preflight preserves current text references without content identity', async () => {
  const fixture = await createFixture('source-action-preflight-')
  try {
    await mkdir(path.join(fixture.root, '자료'), { recursive: true })
    await writeFile(path.join(fixture.root, '자료', '두번째.txt'), '둘')
    await writeFile(path.join(fixture.root, '자료', '첫번째.md'), '하나')
    const projection = await createWorkspaceSourceProjection({
      workspaceRoot: fixture.root,
    })

    assert.deepEqual(
      await projection.preflightTextFiles([
        { relativePath: '자료/두번째.txt' },
        { relativePath: '자료/첫번째.md' },
      ]),
      [
        { relativePath: '자료/두번째.txt' },
        { relativePath: '자료/첫번째.md' },
      ],
    )
  } finally {
    await fixture.cleanup()
  }
})

test('action source preflight rejects any stale, excluded, non-regular, or non-text reference', async () => {
  const fixture = await createFixture('source-action-rejection-')
  try {
    await mkdir(path.join(fixture.root, 'node_modules'), { recursive: true })
    await mkdir(path.join(fixture.root, 'secrets'), { recursive: true })
    await mkdir(path.join(fixture.root, 'directory.txt'))
    await writeFile(path.join(fixture.root, 'valid.md'), 'valid')
    await writeFile(path.join(fixture.root, 'renamed.md'), 'renamed')
    await rename(
      path.join(fixture.root, 'renamed.md'),
      path.join(fixture.root, 'moved.md'),
    )
    await writeFile(path.join(fixture.root, '.hidden.md'), 'hidden')
    await writeFile(
      path.join(fixture.root, 'node_modules', 'managed.md'),
      'managed',
    )
    await writeFile(
      path.join(fixture.root, 'secrets', 'secret.md'),
      'secret',
    )
    await writeFile(path.join(fixture.root, 'AGENTS.md'), 'scaffold')
    await writeFile(path.join(fixture.root, 'lecture.pdf'), '%PDF-')
    await writeFile(path.join(fixture.root, 'slides.pptx'), 'slides')
    await writeFile(path.join(fixture.root, 'large.txt'), 'too large')
    await writeFile(path.join(fixture.outside, 'outside.md'), 'outside')
    await symlink(
      path.join(fixture.outside, 'outside.md'),
      path.join(fixture.root, 'outside.md'),
    )
    const projection = await createWorkspaceSourceProjection({
      workspaceRoot: fixture.root,
      limits: { textPreviewMaxBytes: 8, textSourceMaxBytes: 8 },
    })

    for (const relativePath of [
      'missing.md',
      'renamed.md',
      '.hidden.md',
      'node_modules/managed.md',
      'secrets/secret.md',
      'AGENTS.md',
      'directory.txt',
      'outside.md',
      'lecture.pdf',
      'slides.pptx',
      'large.txt',
    ]) {
      await assert.rejects(
        projection.preflightTextFiles([
          { relativePath: 'valid.md' },
          { relativePath },
        ]),
        WorkspaceSourceProjectionError,
        relativePath,
      )
    }
  } finally {
    await fixture.cleanup()
  }
})

test('action source preflight rejects an inode swap before no-follow open', async () => {
  const fixture = await createFixture('source-action-inode-race-')
  try {
    const selected = path.join(fixture.root, 'selected.md')
    const replacement = path.join(fixture.root, 'replacement.md')
    await writeFile(selected, 'original')
    await writeFile(replacement, 'replacement')
    let swapped = false
    const projection = await createWorkspaceSourceProjection({
      workspaceRoot: fixture.root,
      sourcePreflightTestHook: async (phase, relativePath) => {
        if (
          phase !== 'before_open' ||
          relativePath !== 'selected.md' ||
          swapped
        ) {
          return
        }
        swapped = true
        await rename(selected, path.join(fixture.root, 'original.md'))
        await rename(replacement, selected)
      },
    })

    await assert.rejects(
      projection.preflightTextFiles([{ relativePath: 'selected.md' }]),
      (error: unknown) =>
        error instanceof WorkspaceSourceProjectionError &&
        error.code === 'source_not_found',
    )
  } finally {
    await fixture.cleanup()
  }
})

test('action source preflight rejects size drift before no-follow open', async () => {
  const fixture = await createFixture('source-action-size-race-')
  try {
    const selected = path.join(fixture.root, 'selected.md')
    await writeFile(selected, 'short')
    let grown = false
    const projection = await createWorkspaceSourceProjection({
      workspaceRoot: fixture.root,
      limits: { textPreviewMaxBytes: 8, textSourceMaxBytes: 8 },
      sourcePreflightTestHook: async (phase, relativePath) => {
        if (
          phase !== 'before_open' ||
          relativePath !== 'selected.md' ||
          grown
        ) {
          return
        }
        grown = true
        await writeFile(selected, 'longer')
      },
    })

    await assert.rejects(
      projection.preflightTextFiles([{ relativePath: 'selected.md' }]),
      (error: unknown) =>
        error instanceof WorkspaceSourceProjectionError &&
        error.code === 'source_not_found',
    )
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
    await mkdir(path.join(fixture.root, '.managed'), { recursive: true })
    await writeFile(
      path.join(fixture.root, '.managed', 'notes.txt'),
      'managed',
    )
    await symlink(
      path.join(fixture.root, '.managed'),
      path.join(fixture.root, 'managed-alias'),
    )
    await writeFile(
      path.join(fixture.root, 'binary.txt'),
      Buffer.from([0xff, 0xfe, 0xfd]),
    )
    await mkdir(path.join(fixture.root, 'secrets'), { recursive: true })
    await mkdir(path.join(fixture.root, 'api-keys'), { recursive: true })
    await mkdir(path.join(fixture.root, 'tokens-backup'), {
      recursive: true,
    })
    await mkdir(path.join(fixture.root, 'client_secret'), {
      recursive: true,
    })
    await mkdir(path.join(fixture.root, 'secrets.prod'), {
      recursive: true,
    })
    await writeFile(
      path.join(fixture.root, 'secrets', 'lecture-notes.txt'),
      'secret',
    )
    await writeFile(
      path.join(fixture.root, 'api-keys', 'lecture-notes.txt'),
      'secret',
    )
    await writeFile(
      path.join(fixture.root, 'tokens-backup', 'lecture-notes.txt'),
      'secret',
    )
    await writeFile(path.join(fixture.root, 'client_secret.txt'), 'secret')
    await writeFile(path.join(fixture.root, 'credentials-prod.json'), '{}')
    await writeFile(path.join(fixture.root, 'credentials.prod.json'), '{}')
    await writeFile(path.join(fixture.root, 'api_keys-local.yaml'), 'secret')
    await writeFile(path.join(fixture.root, 'api-keys.local.yaml'), 'secret')
    await writeFile(path.join(fixture.root, 'client_secret.json.bak'), 'secret')
    await writeFile(path.join(fixture.root, 'tokens-staging.txt'), 'secret')
    await writeFile(
      path.join(fixture.root, 'client_secret', 'lecture-notes.txt'),
      'secret',
    )
    await writeFile(
      path.join(fixture.root, 'tokenization-notes.md'),
      '학습 자료',
    )
    await writeFile(
      path.join(fixture.root, 'private-key-cryptography-notes.md'),
      '암호학 자료',
    )
    const projection = await createWorkspaceSourceProjection({
      workspaceRoot: fixture.root,
    })

    for (const relativePath of [
      '../outside/outside.txt',
      '/etc/passwd',
      '.secret.txt',
      'outside-link.txt',
      'managed-alias/notes.txt',
      'secrets/lecture-notes.txt',
      'api-keys/lecture-notes.txt',
      'tokens-backup/lecture-notes.txt',
      'client_secret.txt',
      'credentials-prod.json',
      'credentials.prod.json',
      'api_keys-local.yaml',
      'api-keys.local.yaml',
      'client_secret.json.bak',
      'tokens-staging.txt',
      'client_secret/lecture-notes.txt',
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
    assert.equal(
      (await projection.readText('tokenization-notes.md')).text,
      '학습 자료',
    )
    assert.equal(
      (
        await projection.readText(
          'private-key-cryptography-notes.md',
        )
      ).text,
      '암호학 자료',
    )
  } finally {
    await fixture.cleanup()
  }
})

test('source projection rejects a replaced active root instead of reading the replacement', async () => {
  const fixture = await createFixture('source-projection-root-replaced-')
  try {
    await writeFile(path.join(fixture.root, 'original.txt'), 'original')
    const projection = await createWorkspaceSourceProjection({
      workspaceRoot: fixture.root,
    })
    const movedRoot = `${fixture.root}-moved`
    await rename(fixture.root, movedRoot)
    await mkdir(fixture.root)
    await writeFile(path.join(fixture.root, 'replacement.txt'), 'replacement')

    await assert.rejects(
      projection.list(),
      (error: unknown) =>
        error instanceof WorkspaceSourceProjectionError &&
        error.code === 'source_unavailable',
    )
    await assert.rejects(
      projection.readText('replacement.txt'),
      (error: unknown) =>
        error instanceof WorkspaceSourceProjectionError &&
        error.code === 'source_unavailable',
    )
    await assert.rejects(
      projection.preflightTextFiles([
        { relativePath: 'replacement.txt' },
      ]),
      (error: unknown) =>
        error instanceof WorkspaceSourceProjectionError &&
        error.code === 'source_unavailable',
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

test('source listing charges excluded entries against the scan budget', async () => {
  const fixture = await createFixture('source-projection-scan-budget-')
  try {
    await writeFile(path.join(fixture.root, '.hidden-one'), 'one')
    await writeFile(path.join(fixture.root, '.hidden-two'), 'two')

    const projection = await createWorkspaceSourceProjection({
      workspaceRoot: fixture.root,
      limits: { listMaxEntries: 1 },
    })

    await assert.rejects(
      projection.list(),
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
