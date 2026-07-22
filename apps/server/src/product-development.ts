import path from 'node:path'

import {
  createMacOsSemesterWorkspaceChooser,
  type SemesterWorkspaceDirectoryChooser,
} from './semester-workspace.js'
import type { ProductRuntimeBootstrap } from './codex-chat-config.js'
import type { SemesterWorkspaceBootstrap } from './server.js'

const productionRuntimeRelativePath =
  'packages/codex-chat-runtime/.artifacts/production-runtime-darwin-arm64'
const productOrigin = 'http://127.0.0.1:4173'

export type ProductDevelopmentBootstrapErrorCode =
  | 'product_app_data_root_required'
  | 'product_mode_invalid'
  | 'product_package_root_required'
  | 'product_workspace_root_required'

export class ProductDevelopmentBootstrapError extends Error {
  readonly code: ProductDevelopmentBootstrapErrorCode

  constructor(code: ProductDevelopmentBootstrapErrorCode, message: string) {
    super(message)
    this.name = 'ProductDevelopmentBootstrapError'
    this.code = code
  }
}

export type ProductDevelopmentBootstrap = {
  readonly runtime: ProductRuntimeBootstrap
  readonly selectedWorkspaceRoot: string
  readonly semesterWorkspace: SemesterWorkspaceBootstrap
}

export function resolveProductDevelopmentBootstrap(
  environment: NodeJS.ProcessEnv,
  options: {
    readonly chooseDirectory?: SemesterWorkspaceDirectoryChooser
  } = {},
): ProductDevelopmentBootstrap | undefined {
  if (environment.AY_PLE_PRODUCT_MODE === undefined) return undefined
  if (environment.AY_PLE_PRODUCT_MODE !== '1') {
    throw new ProductDevelopmentBootstrapError(
      'product_mode_invalid',
      'AY_PLE_PRODUCT_MODE must be exactly 1 when product bootstrap is used.',
    )
  }
  const packageRoot = requireAbsoluteRoot(
    environment.AY_PLE_PACKAGE_ROOT,
    'product_package_root_required',
    'AY_PLE_PACKAGE_ROOT',
  )
  const appDataRoot = requireAbsoluteRoot(
    environment.AY_PLE_APP_DATA_ROOT,
    'product_app_data_root_required',
    'AY_PLE_APP_DATA_ROOT',
  )
  const selectedWorkspaceRoot = requireAbsoluteRoot(
    environment.AY_PLE_WORKSPACE_ROOT,
    'product_workspace_root_required',
    'AY_PLE_WORKSPACE_ROOT',
  )
  const chooseDirectory =
    options.chooseDirectory ?? createMacOsSemesterWorkspaceChooser()
  let initialSelection = selectedWorkspaceRoot

  return {
    runtime: {
      appDataRoot,
      runtimeRoot: path.join(packageRoot, productionRuntimeRelativePath),
      environment: {
        home: path.join(appDataRoot, 'runtime/home'),
        codexHome: path.join(appDataRoot, 'runtime/codex-home'),
        codexSqliteHome: path.join(appDataRoot, 'runtime/codex-sqlite-home'),
        tempDirectory: path.join(appDataRoot, 'runtime/temp'),
      },
      origin: productOrigin,
    },
    selectedWorkspaceRoot,
    semesterWorkspace: {
      packageRoot,
      appDataRoot,
      chooseDirectory: async () => {
        if (initialSelection.length > 0) {
          const selected = initialSelection
          initialSelection = ''
          return selected
        }
        return chooseDirectory()
      },
    },
  }
}

function requireAbsoluteRoot(
  value: string | undefined,
  code: Exclude<ProductDevelopmentBootstrapErrorCode, 'product_mode_invalid'>,
  label: string,
): string {
  if (!value || !path.isAbsolute(value)) {
    throw new ProductDevelopmentBootstrapError(
      code,
      `${label} must be an explicit absolute directory.`,
    )
  }
  return value
}
