import assert from 'node:assert/strict'
import {
  chmod,
  mkdir,
  mkdtemp,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import {
  prepareProductRuntimeLayout,
  ProductRuntimeLayoutError,
} from './index.js'
import { readPinnedCodexVersion } from './product-runtime-layout.js'

test('product runtime layout prepares a canonical package-owned runtime pair', async () => {
  await withProductLayoutFixture(async ({
    appDataRoot,
    codexBinPath,
    packageRoot,
    workspaceRoot,
  }) => {
    const layout = await prepareProductRuntimeLayout({
      packageRoot,
      appDataRoot,
      workspaceRoot,
    })

    assert.deepEqual(layout, {
      packageRoot: await realpath(packageRoot),
      appDataRoot: await realpath(appDataRoot),
      workspaceRoot: await realpath(workspaceRoot),
      codexBinPath: await realpath(codexBinPath),
      codexVersion: '0.144.0',
      codexHome: join(await realpath(appDataRoot), 'codex', 'home'),
      codexSqliteHome: join(await realpath(appDataRoot), 'codex', 'sqlite'),
      cwd: await realpath(workspaceRoot),
    })
  })
})

test('product runtime layout rejects relative roots as non-recoverable configuration', async () => {
  await withProductLayoutFixture(async ({ appDataRoot, workspaceRoot }) => {
    await assert.rejects(
      prepareProductRuntimeLayout({
        packageRoot: 'relative-package',
        appDataRoot,
        workspaceRoot,
      }),
      (error: unknown) => {
        assert.ok(error instanceof ProductRuntimeLayoutError)
        assert.equal(error.code, 'invalid_root')
        assert.equal(error.root, 'packageRoot')
        assert.equal(error.recoverable, false)

        return true
      },
    )
  })
})

test('product runtime layout wraps a non-string root as invalid configuration', async () => {
  await withProductLayoutFixture(async ({ appDataRoot, workspaceRoot }) => {
    await assert.rejects(
      prepareProductRuntimeLayout({
        packageRoot: undefined as never,
        appDataRoot,
        workspaceRoot,
      }),
      (error: unknown) => {
        assert.ok(error instanceof ProductRuntimeLayoutError)
        assert.equal(error.code, 'invalid_root')
        assert.equal(error.root, 'packageRoot')

        return true
      },
    )
  })
})

test('product runtime layout wraps unreadable package pin metadata in a stable failure', async (t) => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'ay-ple-package-pin-'))

  try {
    const cases = [
      {
        name: 'missing package metadata',
        path: join(tempRoot, 'missing-package.json'),
      },
      {
        name: 'malformed package metadata',
        path: join(tempRoot, 'malformed-package.json'),
        contents: '{malformed',
      },
      {
        name: 'missing Codex dependency pin',
        path: join(tempRoot, 'unpinned-package.json'),
        contents: JSON.stringify({ dependencies: {} }),
      },
    ]

    for (const fixtureCase of cases) {
      await t.test(fixtureCase.name, async () => {
        if (fixtureCase.contents !== undefined) {
          await writeFile(fixtureCase.path, fixtureCase.contents)
        }

        assert.throws(
          () => readPinnedCodexVersion(pathToFileURL(fixtureCase.path)),
          (error: unknown) => {
            assert.ok(error instanceof ProductRuntimeLayoutError)
            assert.equal(error.code, 'package_pin_unreadable')
            assert.equal(error.recoverable, false)

            return true
          },
        )
      })
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true })
  }
})

test('product runtime layout rejects a missing package root with a typed failure', async () => {
  await withProductLayoutFixture(async ({
    appDataRoot,
    packageRoot,
    workspaceRoot,
  }) => {
    await assert.rejects(
      prepareProductRuntimeLayout({
        packageRoot: join(packageRoot, 'missing'),
        appDataRoot,
        workspaceRoot,
      }),
      (error: unknown) => {
        assert.ok(error instanceof ProductRuntimeLayoutError)
        assert.equal(error.code, 'root_not_directory')
        assert.equal(error.root, 'packageRoot')
        assert.equal(error.recoverable, false)

        return true
      },
    )
  })
})

test('product runtime layout rejects a workspace path that is not a directory', async () => {
  await withProductLayoutFixture(async ({
    appDataRoot,
    packageRoot,
    workspaceRoot,
  }) => {
    const workspaceFile = join(workspaceRoot, 'not-a-directory')
    await writeFile(workspaceFile, 'workspace roots must be directories')

    await assert.rejects(
      prepareProductRuntimeLayout({
        packageRoot,
        appDataRoot,
        workspaceRoot: workspaceFile,
      }),
      (error: unknown) => {
        assert.ok(error instanceof ProductRuntimeLayoutError)
        assert.equal(error.code, 'root_not_directory')
        assert.equal(error.root, 'workspaceRoot')

        return true
      },
    )
  })
})

test('product runtime layout rejects equal and nested canonical roots', async () => {
  await withProductLayoutFixture(async ({
    packageRoot,
    tempRoot,
    workspaceRoot,
  }) => {
    const appDataRoots = [
      workspaceRoot,
      join(workspaceRoot, 'app-data'),
      tempRoot,
    ]

    for (const appDataRoot of appDataRoots) {
      await assert.rejects(
        prepareProductRuntimeLayout({
          packageRoot,
          appDataRoot,
          workspaceRoot,
        }),
        (error: unknown) => {
          assert.ok(error instanceof ProductRuntimeLayoutError)
          assert.equal(error.code, 'root_overlap')
          assert.equal(error.recoverable, false)

          return true
        },
      )
    }
  })
})

test('product runtime layout treats a child named with two leading dots as contained', async () => {
  await withProductLayoutFixture(async ({ packageRoot, workspaceRoot }) => {
    await assert.rejects(
      prepareProductRuntimeLayout({
        packageRoot,
        appDataRoot: join(packageRoot, '..data'),
        workspaceRoot,
      }),
      (error: unknown) => {
        assert.ok(error instanceof ProductRuntimeLayoutError)
        assert.equal(error.code, 'root_overlap')

        return true
      },
    )
  })
})

test(
  'product runtime layout resolves symlinks before checking root overlap',
  async () => {
    await withProductLayoutFixture(async ({
      packageRoot,
      tempRoot,
      workspaceRoot,
    }) => {
      const workspaceAlias = join(tempRoot, 'workspace-alias')
      await symlink(workspaceRoot, workspaceAlias, 'dir')

      await assert.rejects(
        prepareProductRuntimeLayout({
          packageRoot,
          appDataRoot: workspaceAlias,
          workspaceRoot,
        }),
        (error: unknown) => {
          assert.ok(error instanceof ProductRuntimeLayoutError)
          assert.equal(error.code, 'root_overlap')

          return true
        },
      )
    })
  },
)

test('product runtime layout does not fall back when its package binary is missing', async () => {
  await withProductLayoutFixture(async ({
    appDataRoot,
    codexBinPath,
    packageRoot,
    workspaceRoot,
  }) => {
    await rm(codexBinPath)

    await assert.rejects(
      prepareProductRuntimeLayout({
        packageRoot,
        appDataRoot,
        workspaceRoot,
      }),
      (error: unknown) => {
        assert.ok(error instanceof ProductRuntimeLayoutError)
        assert.equal(error.code, 'binary_not_found')
        assert.equal(error.recoverable, false)

        return true
      },
    )
  })
})

test(
  'product runtime layout rejects a non-executable package binary',
  async () => {
    await withProductLayoutFixture(async ({
      appDataRoot,
      codexBinPath,
      packageRoot,
      workspaceRoot,
    }) => {
      await chmod(codexBinPath, 0o644)

      await assert.rejects(
        prepareProductRuntimeLayout({
          packageRoot,
          appDataRoot,
          workspaceRoot,
        }),
        (error: unknown) => {
          assert.ok(error instanceof ProductRuntimeLayoutError)
          assert.equal(error.code, 'binary_not_executable')
          assert.equal(error.recoverable, false)

          return true
        },
      )
    })
  },
)

test(
  'product runtime layout rejects a binary symlink that escapes packageRoot',
  async () => {
    await withProductLayoutFixture(async ({
      appDataRoot,
      codexBinPath,
      packageRoot,
      tempRoot,
      workspaceRoot,
    }) => {
      const externalBinary = join(tempRoot, 'external-codex')
      await writeFakeCodexBinary(externalBinary, '0.144.0')
      await rm(codexBinPath)
      await symlink(externalBinary, codexBinPath)

      await assert.rejects(
        prepareProductRuntimeLayout({
          packageRoot,
          appDataRoot,
          workspaceRoot,
        }),
        (error: unknown) => {
          assert.ok(error instanceof ProductRuntimeLayoutError)
          assert.equal(error.code, 'binary_not_package_owned')

          return true
        },
      )
    })
  },
)

test('product runtime layout rejects a binary version that differs from the package pin', async () => {
  await withProductLayoutFixture(async ({
    appDataRoot,
    codexBinPath,
    packageRoot,
    workspaceRoot,
  }) => {
    await writeFakeCodexBinary(codexBinPath, '0.145.0')

    await assert.rejects(
      prepareProductRuntimeLayout({
        packageRoot,
        appDataRoot,
        workspaceRoot,
      }),
      (error: unknown) => {
        assert.ok(error instanceof ProductRuntimeLayoutError)
        assert.equal(error.code, 'binary_pin_mismatch')
        assert.equal(error.recoverable, false)

        return true
      },
    )
  })
})

test('product runtime layout compares the reported binary version instead of warning text', async () => {
  await withProductLayoutFixture(async ({
    appDataRoot,
    codexBinPath,
    packageRoot,
    workspaceRoot,
  }) => {
    await writeFakeCodexBinaryOutput(
      codexBinPath,
      'codex-cli 0.145.0\nwarning: expected 0.144.0',
    )

    await assert.rejects(
      prepareProductRuntimeLayout({
        packageRoot,
        appDataRoot,
        workspaceRoot,
      }),
      (error: unknown) => {
        assert.ok(error instanceof ProductRuntimeLayoutError)
        assert.equal(error.code, 'binary_pin_mismatch')

        return true
      },
    )
  })
})

test('product runtime layout classifies runtime-home pair preparation failure as non-recoverable', async () => {
  await withProductLayoutFixture(async ({
    appDataRoot,
    packageRoot,
    workspaceRoot,
  }) => {
    await mkdir(appDataRoot)
    await writeFile(join(appDataRoot, 'codex'), 'blocks runtime-home pair')

    await assert.rejects(
      prepareProductRuntimeLayout({
        packageRoot,
        appDataRoot,
        workspaceRoot,
      }),
      (error: unknown) => {
        assert.ok(error instanceof ProductRuntimeLayoutError)
        assert.equal(error.code, 'runtime_home_preparation_failed')
        assert.equal(error.recoverable, false)

        return true
      },
    )
  })
})

test(
  'product runtime layout rejects a runtime-home symlink that escapes appDataRoot',
  async () => {
    await withProductLayoutFixture(async ({
      appDataRoot,
      packageRoot,
      workspaceRoot,
    }) => {
      await mkdir(appDataRoot)
      await symlink(workspaceRoot, join(appDataRoot, 'codex'), 'dir')

      await assert.rejects(
        prepareProductRuntimeLayout({
          packageRoot,
          appDataRoot,
          workspaceRoot,
        }),
        (error: unknown) => {
          assert.ok(error instanceof ProductRuntimeLayoutError)
          assert.equal(error.code, 'runtime_home_preparation_failed')

          return true
        },
      )

      await assert.rejects(realpath(join(workspaceRoot, 'home')))
      await assert.rejects(realpath(join(workspaceRoot, 'sqlite')))
    })
  },
)

async function withProductLayoutFixture(
  testBody: (fixture: {
    appDataRoot: string
    codexBinPath: string
    packageRoot: string
    tempRoot: string
    workspaceRoot: string
  }) => Promise<void>,
): Promise<void> {
  const tempRoot = await mkdtemp(join(tmpdir(), 'ay-ple-product-layout-'))
  const packageRoot = join(tempRoot, 'package')
  const appDataRoot = join(tempRoot, 'app-data')
  const workspaceRoot = join(tempRoot, 'workspace')
  const codexBinPath = join(
    packageRoot,
    'node_modules',
    '.bin',
    'codex',
  )

  await mkdir(join(packageRoot, 'node_modules', '.bin'), { recursive: true })
  await mkdir(workspaceRoot)
  await writeFakeCodexBinary(codexBinPath, '0.144.0')

  try {
    await testBody({
      appDataRoot,
      codexBinPath,
      packageRoot,
      tempRoot,
      workspaceRoot,
    })
  } finally {
    await rm(tempRoot, { recursive: true, force: true })
  }
}

async function writeFakeCodexBinary(
  codexBinPath: string,
  version: string,
): Promise<void> {
  await writeFakeCodexBinaryOutput(codexBinPath, `codex-cli ${version}`)
}

async function writeFakeCodexBinaryOutput(
  codexBinPath: string,
  output: string,
): Promise<void> {
  await writeFile(
    codexBinPath,
    `#!/usr/bin/env node\nprocess.stdout.write(${JSON.stringify(`${output}\n`)})\n`,
  )
  await chmod(codexBinPath, 0o755)
}
