import path from 'node:path'

import {
  createMacOsSemesterWorkspaceChooser,
  type SemesterWorkspaceDirectoryChooser,
} from './semester-workspace.js'
import type { SemesterWorkspaceBootstrap } from './server.js'

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
